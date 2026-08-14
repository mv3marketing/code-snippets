'use strict';
const assert = require('assert');
const { lastClick, firstClick, linear, timeDecay, positionBased, markovRemovalEffect, solveLinearSystem } = require('./attribution-models.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} -> ${e.message}`);
    process.exitCode = 1;
  }
}

function approxEqual(a, b, eps = 0.001) {
  assert.ok(Math.abs(a - b) < eps, `expected ~${b}, got ${a}`);
}

test('throws on empty paths array', () => {
  assert.throws(() => lastClick([]));
});

test('throws on path with no channels', () => {
  assert.throws(() => linear([{ channels: [], value: 1 }]));
});

test('throws on non-positive value', () => {
  assert.throws(() => linear([{ channels: ['A'], value: 0 }]));
});

test('lastClick gives full credit to the final touch', () => {
  const result = lastClick([{ channels: ['A', 'B', 'C'], value: 100 }]);
  assert.deepStrictEqual(result, { A: 0, B: 0, C: 100 });
});

test('firstClick gives full credit to the first touch', () => {
  const result = firstClick([{ channels: ['A', 'B', 'C'], value: 100 }]);
  assert.deepStrictEqual(result, { A: 100, B: 0, C: 0 });
});

test('linear splits credit evenly across all touches', () => {
  const result = linear([{ channels: ['A', 'B'], value: 100 }]);
  approxEqual(result.A, 50);
  approxEqual(result.B, 50);
});

test('linear aggregates correctly across multiple paths', () => {
  const result = linear([{ channels: ['A', 'B'], value: 100 }, { channels: ['A'], value: 50 }]);
  approxEqual(result.A, 50 + 50);
  approxEqual(result.B, 50);
});

test('timeDecay gives more credit to touches closer to conversion', () => {
  const result = timeDecay([{ channels: ['A', 'B', 'C'], value: 100 }], { halfLifeTouches: 1 });
  assert.ok(result.C > result.B);
  assert.ok(result.B > result.A);
  approxEqual(result.A + result.B + result.C, 100);
});

test('timeDecay throws on non-positive halfLifeTouches', () => {
  assert.throws(() => timeDecay([{ channels: ['A'], value: 1 }], { halfLifeTouches: 0 }));
});

test('positionBased with default weights gives 40/20/40 on a 3-touch path', () => {
  const result = positionBased([{ channels: ['A', 'B', 'C'], value: 100 }]);
  approxEqual(result.A, 40);
  approxEqual(result.B, 20);
  approxEqual(result.C, 40);
});

test('positionBased splits middle touches evenly on a 4-touch path', () => {
  const result = positionBased([{ channels: ['A', 'B', 'C', 'D'], value: 100 }]);
  approxEqual(result.A, 40);
  approxEqual(result.D, 40);
  approxEqual(result.B, 10);
  approxEqual(result.C, 10);
});

test('positionBased handles a single-touch path (all credit to the one touch)', () => {
  const result = positionBased([{ channels: ['A'], value: 100 }]);
  approxEqual(result.A, 100);
});

test('positionBased handles a two-touch path proportional to first/last weights', () => {
  const result = positionBased([{ channels: ['A', 'B'], value: 100 }]); // 0.4/0.4 -> 50/50
  approxEqual(result.A, 50);
  approxEqual(result.B, 50);
});

test('positionBased throws when firstWeight + lastWeight exceeds 1', () => {
  assert.throws(() => positionBased([{ channels: ['A', 'B', 'C'], value: 100 }], { firstWeight: 0.7, lastWeight: 0.5 }));
});

test('solveLinearSystem solves a known simple 2x2 system correctly', () => {
  // (I-T)x = b where T=[[0,0.5],[0,0]], b=[0.5,1] -> x=[1,1]
  const x = solveLinearSystem([[0, 0.5], [0, 0]], [0.5, 1]);
  approxEqual(x[0], 1);
  approxEqual(x[1], 1);
});

test('markovRemovalEffect: two independent single-channel paths split credit exactly by their own value', () => {
  // Path [A] value 1, Path [B] value 1 - hand-verified: each channel's removal
  // effect kills exactly its own path, so credit ends up [A:1, B:1].
  const result = markovRemovalEffect([{ channels: ['A'], value: 1 }, { channels: ['B'], value: 1 }]);
  approxEqual(result.credit.A, 1);
  approxEqual(result.credit.B, 1);
  approxEqual(result.baseConversionProb, 1);
});

test('markovRemovalEffect: a single two-touch serial path splits credit evenly between both touches', () => {
  // Path [A,B] value 1 - hand-verified: removing either A or B kills the
  // only path entirely, so both have removal effect 1, splitting credit 50/50.
  const result = markovRemovalEffect([{ channels: ['A', 'B'], value: 1 }]);
  approxEqual(result.credit.A, 0.5);
  approxEqual(result.credit.B, 0.5);
});

test('markovRemovalEffect: total allocated credit equals total path value', () => {
  const paths = [
    { channels: ['A', 'B'], value: 10 },
    { channels: ['B', 'C'], value: 20 },
    { channels: ['A', 'C'], value: 15 },
  ];
  const result = markovRemovalEffect(paths);
  const totalCredit = Object.values(result.credit).reduce((a, b) => a + b, 0);
  approxEqual(totalCredit, 45);
});

test('markovRemovalEffect: a channel appearing in every path gets more credit than one appearing rarely', () => {
  const paths = [
    { channels: ['A', 'B'], value: 10 },
    { channels: ['A', 'C'], value: 10 },
    { channels: ['A', 'D'], value: 10 },
  ];
  const result = markovRemovalEffect(paths);
  assert.ok(result.credit.A > result.credit.B);
  assert.ok(result.credit.A > result.credit.C);
  assert.ok(result.credit.A > result.credit.D);
});

console.log(`\n${passed}/19 passing`);
