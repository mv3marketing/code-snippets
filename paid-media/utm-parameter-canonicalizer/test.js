'use strict';
const assert = require('assert');
const { normalizeUtmValue, buildReverseSynonymMap, canonicalizeUtmValue, detectFragmentation } = require('./utm-canonicalizer.js');

let passed = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name} -> ${e.message}`);
    process.exitCode = 1;
  }
}

// --- normalizeUtmValue ---
test('lowercases and trims surrounding whitespace', () => {
  assert.strictEqual(normalizeUtmValue('  Google  '), 'google');
});

test('collapses slash-separated tokens with surrounding spaces to a single space', () => {
  assert.strictEqual(normalizeUtmValue('Google / CPC '), 'google cpc');
});

test('collapses hyphens to a single space', () => {
  assert.strictEqual(normalizeUtmValue('google-cpc'), 'google cpc');
});

test('collapses underscores to a single space', () => {
  assert.strictEqual(normalizeUtmValue('google_cpc'), 'google cpc');
});

test('all three separator styles normalize to the identical string', () => {
  const a = normalizeUtmValue('google/cpc');
  const b = normalizeUtmValue('Google-CPC');
  const c = normalizeUtmValue('google_cpc');
  assert.strictEqual(a, b);
  assert.strictEqual(b, c);
});

test('throws on a non-string value', () => {
  assert.throws(() => normalizeUtmValue(123));
});

// --- buildReverseSynonymMap / canonicalizeUtmValue ---
const SYNONYM_MAP = {
  paid_search: ['google/cpc', 'Google-CPC', 'bing_cpc'],
  paid_social: ['facebook-ads', 'fb/paid'],
};

test('a raw value matching a known synonym canonicalizes correctly', () => {
  const result = canonicalizeUtmValue('Google / CPC ', SYNONYM_MAP);
  assert.strictEqual(result.canonical, 'paid_search');
  assert.strictEqual(result.matched, true);
});

test('a differently-formatted equivalent of the same synonym still matches', () => {
  const result = canonicalizeUtmValue('bing-cpc', SYNONYM_MAP);
  assert.strictEqual(result.canonical, 'paid_search');
  assert.strictEqual(result.matched, true);
});

test('an unrecognized raw value falls back to its own normalized form, flagged unmatched', () => {
  const result = canonicalizeUtmValue('newsletter', SYNONYM_MAP);
  assert.strictEqual(result.canonical, 'newsletter');
  assert.strictEqual(result.matched, false);
});

test('the canonical name itself (not just its synonyms) also matches', () => {
  const result = canonicalizeUtmValue('paid_search', SYNONYM_MAP);
  assert.strictEqual(result.matched, true);
  assert.strictEqual(result.canonical, 'paid_search');
});

test('throws when synonymMap is not an object', () => {
  assert.throws(() => buildReverseSynonymMap(null));
});

// --- detectFragmentation ---
test('detects real fragmentation: 2+ distinct raw strings mapping to the same canonical channel', () => {
  const rows = [
    { value: 'google/cpc', sessions: 10 },
    { value: 'Google-CPC', sessions: 5 },
    { value: 'facebook', sessions: 3 },
  ];
  const result = detectFragmentation(rows, SYNONYM_MAP);
  assert.strictEqual(result.fragmentation.length, 1);
  assert.strictEqual(result.fragmentation[0].canonical, 'paid_search');
  assert.strictEqual(result.fragmentation[0].totalSessions, 15);
});

test('a canonical channel with only one distinct raw value string is NOT reported as fragmentation', () => {
  const rows = [
    { value: 'google/cpc', sessions: 10 },
    { value: 'google/cpc', sessions: 5 }, // same raw string, repeated -- not fragmentation
  ];
  const result = detectFragmentation(rows, SYNONYM_MAP);
  assert.strictEqual(result.fragmentation.length, 0);
});

test('unmapped raw values are collected separately, not silently dropped', () => {
  const rows = [
    { value: 'google/cpc', sessions: 10 },
    { value: 'unknown_source', sessions: 7 },
  ];
  const result = detectFragmentation(rows, SYNONYM_MAP);
  assert.strictEqual(result.unmapped.length, 1);
  assert.strictEqual(result.unmapped[0].value, 'unknown_source');
});

test('throws on an empty rows array', () => {
  assert.throws(() => detectFragmentation([], SYNONYM_MAP));
});

console.log(`\n${passed}/${total} passing`);
