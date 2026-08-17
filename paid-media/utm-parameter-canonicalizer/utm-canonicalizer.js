/**
 * UTM Parameter Canonicalizer
 * MV3 Marketing — Paid Media snippet
 *
 * The same real channel fragments into multiple rows in every analytics
 * report when UTM values differ only in casing, whitespace, or naming
 * convention ("google/cpc" vs "Google / CPC " vs "google-cpc"). This
 * normalizes raw UTM values and, given a synonym map you supply, maps
 * known variants to one canonical channel name -- surfacing exactly
 * which raw values silently fragmented the same channel, rather than
 * guessing at a universal synonym list (channel naming conventions are
 * genuinely different per organization, so no built-in list is asserted
 * as "correct").
 */

'use strict';

/**
 * Lowercases, trims, and collapses internal whitespace/separators to a
 * single space -- the baseline normalization every canonicalization
 * builds on.
 * @param {string} value
 * @returns {string}
 */
function normalizeUtmValue(value) {
  if (typeof value !== 'string') throw new Error('value must be a string.');
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/]+/g, ' ')
    .trim();
}

/**
 * Builds a reverse lookup (normalized synonym -> canonical name) from a
 * forward synonym map.
 * @param {Object<string, string[]>} synonymMap - canonical -> array of known synonym strings
 * @returns {Map<string, string>}
 */
function buildReverseSynonymMap(synonymMap) {
  if (!synonymMap || typeof synonymMap !== 'object') throw new Error('synonymMap must be an object.');
  const reverse = new Map();
  for (const [canonical, synonyms] of Object.entries(synonymMap)) {
    const normalizedCanonical = normalizeUtmValue(canonical);
    reverse.set(normalizedCanonical, canonical);
    for (const synonym of synonyms) {
      reverse.set(normalizeUtmValue(synonym), canonical);
    }
  }
  return reverse;
}

/**
 * @param {string} rawValue
 * @param {Object<string, string[]>} synonymMap
 * @returns {{canonical: string, matched: boolean}}
 */
function canonicalizeUtmValue(rawValue, synonymMap) {
  const normalized = normalizeUtmValue(rawValue);
  const reverseMap = buildReverseSynonymMap(synonymMap);
  if (reverseMap.has(normalized)) {
    return { canonical: reverseMap.get(normalized), matched: true };
  }
  return { canonical: normalized, matched: false };
}

/**
 * Scans a set of rows for real channel fragmentation: multiple distinct
 * raw values that canonicalize to the same channel, and raw values that
 * don't match any known synonym at all.
 * @param {Array<{value: string, sessions: number}>} rows
 * @param {Object<string, string[]>} synonymMap
 * @returns {{fragmentation: Array<{canonical: string, rawValues: Array<{value: string, sessions: number}>, totalSessions: number}>, unmapped: Array<{value: string, sessions: number}>}}
 */
function detectFragmentation(rows, synonymMap) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('rows must be a non-empty array.');
  const reverseMap = buildReverseSynonymMap(synonymMap);

  const byCanonical = new Map();
  const unmapped = [];

  for (const row of rows) {
    const normalized = normalizeUtmValue(row.value);
    if (reverseMap.has(normalized)) {
      const canonical = reverseMap.get(normalized);
      if (!byCanonical.has(canonical)) byCanonical.set(canonical, []);
      byCanonical.get(canonical).push(row);
    } else {
      unmapped.push(row);
    }
  }

  const fragmentation = [];
  for (const [canonical, rawValues] of byCanonical.entries()) {
    // Only real fragmentation if 2+ DISTINCT raw value strings collapsed
    // into this one canonical channel -- a single raw value appearing in
    // many rows isn't fragmentation, it's just repeated data.
    const distinctRawStrings = new Set(rawValues.map((r) => r.value));
    if (distinctRawStrings.size < 2) continue;
    fragmentation.push({
      canonical,
      rawValues,
      totalSessions: rawValues.reduce((sum, r) => sum + (r.sessions || 0), 0),
    });
  }

  return { fragmentation, unmapped };
}

module.exports = {
  normalizeUtmValue,
  buildReverseSynonymMap,
  canonicalizeUtmValue,
  detectFragmentation,
};
