/**
 * Attribution Model Config Library
 * MV3 Marketing — Analytics / Attribution snippet
 *
 * Six real attribution models, last-click through Markov-chain
 * removal-effect, as ready-to-plug functions. Each takes the same input
 * shape: an array of converting paths, each an ordered list of channel
 * touchpoints, and returns credit allocated per channel.
 */

'use strict';

/**
 * @typedef {{channels: string[], value: number}} Path
 * An ordered list of channel touchpoints leading to one conversion worth `value`.
 */

function validatePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('paths must be a non-empty array.');
  }
  for (const p of paths) {
    if (!Array.isArray(p.channels) || p.channels.length === 0) {
      throw new Error('Every path needs a non-empty channels array.');
    }
    if (typeof p.value !== 'number' || p.value <= 0) {
      throw new Error('Every path needs a positive numeric value.');
    }
  }
}

function emptyCreditMap(paths) {
  const credit = {};
  for (const p of paths) for (const c of p.channels) credit[c] = credit[c] || 0;
  return credit;
}

// 1. Last-click: 100% credit to the final touchpoint before conversion.
function lastClick(paths) {
  validatePaths(paths);
  const credit = emptyCreditMap(paths);
  for (const p of paths) {
    credit[p.channels[p.channels.length - 1]] += p.value;
  }
  return credit;
}

// 2. First-click: 100% credit to the first touchpoint.
function firstClick(paths) {
  validatePaths(paths);
  const credit = emptyCreditMap(paths);
  for (const p of paths) {
    credit[p.channels[0]] += p.value;
  }
  return credit;
}

// 3. Linear: equal credit split across every touchpoint in the path.
function linear(paths) {
  validatePaths(paths);
  const credit = emptyCreditMap(paths);
  for (const p of paths) {
    const share = p.value / p.channels.length;
    for (const c of p.channels) credit[c] += share;
  }
  return credit;
}

// 4. Time-decay: exponentially more credit to touchpoints closer to
// conversion, measured in touch-distance from the converting touch.
function timeDecay(paths, opts = {}) {
  validatePaths(paths);
  const { halfLifeTouches = 2 } = opts;
  if (halfLifeTouches <= 0) throw new Error('halfLifeTouches must be > 0.');
  const lambda = Math.LN2 / halfLifeTouches;

  const credit = emptyCreditMap(paths);
  for (const p of paths) {
    const n = p.channels.length;
    const weights = p.channels.map((_, i) => Math.exp(-lambda * (n - 1 - i))); // distance from last touch
    const total = weights.reduce((a, b) => a + b, 0);
    p.channels.forEach((c, i) => { credit[c] += p.value * (weights[i] / total); });
  }
  return credit;
}

// 5. Position-based (U-shaped): firstWeight to the first touch, lastWeight
// to the last touch, remainder split evenly among the middle touches.
function positionBased(paths, opts = {}) {
  validatePaths(paths);
  const { firstWeight = 0.4, lastWeight = 0.4 } = opts;
  if (firstWeight + lastWeight > 1) throw new Error('firstWeight + lastWeight cannot exceed 1.');

  const credit = emptyCreditMap(paths);
  for (const p of paths) {
    const n = p.channels.length;
    if (n === 1) {
      credit[p.channels[0]] += p.value;
      continue;
    }
    if (n === 2) {
      credit[p.channels[0]] += p.value * (firstWeight / (firstWeight + lastWeight));
      credit[p.channels[1]] += p.value * (lastWeight / (firstWeight + lastWeight));
      continue;
    }
    const middleWeight = 1 - firstWeight - lastWeight;
    const middleCount = n - 2;
    credit[p.channels[0]] += p.value * firstWeight;
    credit[p.channels[n - 1]] += p.value * lastWeight;
    for (let i = 1; i < n - 1; i++) {
      credit[p.channels[i]] += p.value * (middleWeight / middleCount);
    }
  }
  return credit;
}

/**
 * Solves the n x n linear system (I - T) x = b via Gaussian elimination
 * with partial pivoting. Zero dependencies. Used to compute exact
 * absorption probabilities for the Markov removal-effect model below.
 */
function solveLinearSystem(T, b) {
  const n = b.length;
  // Build augmented matrix A = I - T
  const A = [];
  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) A[i][j] = (i === j ? 1 : 0) - T[i][j];
    A[i].push(b[i]);
  }

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivotRow][col])) pivotRow = r;
    }
    [A[col], A[pivotRow]] = [A[pivotRow], A[col]];

    const pivotVal = A[col][col];
    if (Math.abs(pivotVal) < 1e-12) continue; // singular column, leave as-is

    for (let j = col; j <= n; j++) A[col][j] /= pivotVal;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = A[r][col];
      if (factor === 0) continue;
      for (let j = col; j <= n; j++) A[r][j] -= factor * A[col][j];
    }
  }

  return A.map((row) => row[n]);
}

/**
 * 6. Markov-chain removal-effect: builds a first-order transition model
 * (START -> channels -> CONVERSION/NULL) from observed paths, computes
 * exact absorption-into-CONVERSION probability per state via a linear
 * solve, then measures each channel's removal effect (the drop in overall
 * conversion probability if that channel were entirely removed from the
 * graph). Removal effects are normalized to allocate total conversion
 * value proportionally.
 */
function markovRemovalEffect(paths) {
  validatePaths(paths);

  const channels = [...new Set(paths.flatMap((p) => p.channels))];
  const states = ['START', ...channels]; // transient states
  const idx = Object.fromEntries(states.map((s, i) => [s, i]));
  const n = states.length;
  const totalValue = paths.reduce((sum, p) => sum + p.value, 0);

  function buildTransitionMatrix(excludedChannel) {
    const counts = Array.from({ length: n }, () => ({ toStates: {}, toConversion: 0, total: 0 }));

    for (const p of paths) {
      let seq = ['START', ...p.channels];
      const containsExcluded = excludedChannel && p.channels.includes(excludedChannel);
      if (containsExcluded) {
        // Standard removal-effect definition: traffic that would have
        // entered the removed channel is truncated right before it and
        // leaks to the implicit NULL (non-conversion) absorbing state,
        // rather than being rerouted around the removed channel.
        const cutIndex = seq.indexOf(excludedChannel);
        seq = seq.slice(0, cutIndex);
      }

      for (let i = 0; i < seq.length; i++) {
        const from = idx[seq[i]];
        counts[from].total += p.value;
        if (i + 1 < seq.length) {
          const to = seq[i + 1];
          counts[from].toStates[to] = (counts[from].toStates[to] || 0) + p.value;
        } else if (!containsExcluded) {
          // Reached the real end of an unaffected path: it converts.
          counts[from].toConversion += p.value;
        }
        // else: this value silently leaks to NULL at the truncation point
        // (counted in `total` so it correctly dilutes this state's other
        // real transition proportions, but added to neither toStates nor
        // toConversion).
      }
    }

    const T = Array.from({ length: n }, () => new Array(n).fill(0));
    const bConv = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const total = counts[i].total;
      if (total === 0) continue;
      for (const [toState, cnt] of Object.entries(counts[i].toStates)) {
        T[i][idx[toState]] = cnt / total;
      }
      bConv[i] = counts[i].toConversion / total;
    }
    return { T, bConv };
  }

  const base = buildTransitionMatrix(null);
  const baseAbsorption = solveLinearSystem(base.T, base.bConv);
  const baseConversionProb = baseAbsorption[idx.START];

  const removalEffects = {};
  for (const ch of channels) {
    const modified = buildTransitionMatrix(ch);
    const modAbsorption = solveLinearSystem(modified.T, modified.bConv);
    const modConversionProb = modAbsorption[idx.START];
    removalEffects[ch] = Math.max(0, baseConversionProb - modConversionProb);
  }

  const totalEffect = Object.values(removalEffects).reduce((a, b) => a + b, 0);
  const credit = {};
  if (totalEffect === 0) {
    // No channel's removal changes conversion probability (degenerate case) - split evenly.
    const share = totalValue / channels.length;
    for (const ch of channels) credit[ch] = share;
  } else {
    for (const ch of channels) credit[ch] = totalValue * (removalEffects[ch] / totalEffect);
  }

  return { credit, removalEffects, baseConversionProb: Number(baseConversionProb.toFixed(4)) };
}

module.exports = { lastClick, firstClick, linear, timeDecay, positionBased, markovRemovalEffect, solveLinearSystem };
