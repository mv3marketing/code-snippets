'use strict';
const assert = require('assert');
const { groupByKeyword, classifySeverity, detectCannibalization } = require('./cannibalization.js');

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

// --- groupByKeyword ---
test('groups rows correctly by keyword', () => {
  const grouped = groupByKeyword([
    { url: '/a', keyword: 'loans', position: 4 },
    { url: '/b', keyword: 'loans', position: 6 },
    { url: '/c', keyword: 'grants', position: 2 },
  ]);
  assert.strictEqual(grouped.get('loans').length, 2);
  assert.strictEqual(grouped.get('grants').length, 1);
});

test('throws on an empty rows array', () => {
  assert.throws(() => groupByKeyword([]));
});

test('throws when a row is missing url or keyword', () => {
  assert.throws(() => groupByKeyword([{ url: '/a', position: 1 }]));
});

test('throws on an invalid position', () => {
  assert.throws(() => groupByKeyword([{ url: '/a', keyword: 'x', position: 0 }]));
});

// --- classifySeverity ---
test('a tight gap classifies as likely true cannibalization', () => {
  assert.strictEqual(classifySeverity(2), 'likely_true_cannibalization');
});

test('a gap right at the tight boundary still counts as likely true cannibalization', () => {
  assert.strictEqual(classifySeverity(5), 'likely_true_cannibalization');
});

test('a moderate gap classifies as moderate overlap', () => {
  assert.strictEqual(classifySeverity(10), 'moderate_overlap');
});

test('a large gap classifies as low risk', () => {
  assert.strictEqual(classifySeverity(22), 'low_risk');
});

test('custom thresholds change the classification boundaries', () => {
  assert.strictEqual(classifySeverity(8, { tightGap: 10 }), 'likely_true_cannibalization');
});

// --- detectCannibalization ---
test('two visible URLs close together are flagged as likely true cannibalization', () => {
  const result = detectCannibalization([
    { url: '/loan-guide', keyword: 'business loans', position: 4 },
    { url: '/loans-101', keyword: 'business loans', position: 6 },
  ]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].primaryUrl, '/loan-guide');
  assert.strictEqual(result[0].competitors[0].positionGap, 2);
  assert.strictEqual(result[0].severity, 'likely_true_cannibalization');
});

test('a page ranking far outside the visibility threshold does not trigger a false flag', () => {
  const result = detectCannibalization([
    { url: '/widgets-a', keyword: 'widgets', position: 5 },
    { url: '/widgets-b', keyword: 'widgets', position: 97 }, // effectively invisible, not real competition
  ]);
  assert.strictEqual(result.length, 0);
});

test('a moderate gap is classified as moderate overlap, not high alarm', () => {
  const result = detectCannibalization([
    { url: '/a', keyword: 'gadgets', position: 10 },
    { url: '/b', keyword: 'gadgets', position: 20 },
  ]);
  assert.strictEqual(result[0].severity, 'moderate_overlap');
});

test('a wide but still-visible gap is classified as low risk', () => {
  const result = detectCannibalization([
    { url: '/a', keyword: 'tools', position: 3 },
    { url: '/b', keyword: 'tools', position: 25 },
  ]);
  assert.strictEqual(result[0].severity, 'low_risk');
});

test('the same URL appearing twice for one keyword is deduplicated, not treated as two competitors', () => {
  const result = detectCannibalization([
    { url: '/a', keyword: 'mobile-desktop-test', position: 8 },
    { url: '/a', keyword: 'mobile-desktop-test', position: 5 }, // same URL, e.g. different device rows -- keeps the better position
  ]);
  assert.strictEqual(result.length, 0); // only one distinct URL -- no real cannibalization
});

test('a single URL for a keyword produces no cannibalization result', () => {
  const result = detectCannibalization([{ url: '/only', keyword: 'unique term', position: 3 }]);
  assert.strictEqual(result.length, 0);
});

test('three or more competing URLs report every competitor with its own gap from the primary', () => {
  const result = detectCannibalization([
    { url: '/a', keyword: 'ecommerce platform', position: 3 },
    { url: '/b', keyword: 'ecommerce platform', position: 7 },
    { url: '/c', keyword: 'ecommerce platform', position: 12 },
  ]);
  assert.strictEqual(result[0].competitors.length, 2);
  assert.strictEqual(result[0].competitors[0].positionGap, 4);
  assert.strictEqual(result[0].competitors[1].positionGap, 9);
});

test('a custom visibilityThreshold changes what counts as real competition', () => {
  const result = detectCannibalization(
    [
      { url: '/a', keyword: 'niche term', position: 40 },
      { url: '/b', keyword: 'niche term', position: 45 },
    ],
    { visibilityThreshold: 50 }
  );
  assert.strictEqual(result.length, 1);
});

console.log(`\n${passed}/${total} passing`);
