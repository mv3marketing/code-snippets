'use strict';
const assert = require('assert');
const { CROSSWALK_DATA, lookupByNaics, lookupBySic, toVendorCategory, normalizeBatch } = require('./crosswalk.js');

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

test('CROSSWALK_DATA has 8 real, sourced entries', () => {
  assert.strictEqual(CROSSWALK_DATA.length, 8);
});

test('every entry has at least one sicCode', () => {
  for (const e of CROSSWALK_DATA) assert.ok(e.sicCodes.length >= 1, `${e.naics} has no sicCodes`);
});

test('lookupByNaics finds a known real code (Software Publishers)', () => {
  const entry = lookupByNaics('511210');
  assert.strictEqual(entry.naicsTitle, 'Software Publishers');
  assert.strictEqual(entry.sicCodes[0].code, '7372');
});

test('lookupByNaics returns null for an unknown code (not fabricated)', () => {
  assert.strictEqual(lookupByNaics('999999'), null);
});

test('lookupByNaics throws on non-string input', () => {
  assert.throws(() => lookupByNaics(511210));
});

test('lookupBySic finds a known real code (Advertising Agencies)', () => {
  const results = lookupBySic('7311');
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].naics, '541810');
});

test('lookupBySic correctly returns multiple entries for a many-to-one SIC code (8742)', () => {
  const results = lookupBySic('8742');
  const naicsCodes = results.map((r) => r.naics).sort();
  assert.deepStrictEqual(naicsCodes, ['541611', '541613']);
});

test('lookupBySic returns an empty array for an unknown SIC code', () => {
  assert.deepStrictEqual(lookupBySic('0000'), []);
});

test('a one-to-many NAICS entry (518210) has 3 real SIC codes', () => {
  const entry = lookupByNaics('518210');
  assert.strictEqual(entry.sicCodes.length, 3);
  const codes = entry.sicCodes.map((s) => s.code).sort();
  assert.deepStrictEqual(codes, ['7374', '7379', '7389']);
});

test('toVendorCategory returns the correct MV3 category for a known code', () => {
  assert.strictEqual(toVendorCategory('541511'), 'Software & Technology');
  assert.strictEqual(toVendorCategory('541810'), 'Marketing & Advertising');
  assert.strictEqual(toVendorCategory('522320'), 'Financial Services');
});

test('toVendorCategory returns null for an unknown code', () => {
  assert.strictEqual(toVendorCategory('123456'), null);
});

test('normalizeBatch matches records by naics first', () => {
  const result = normalizeBatch([{ id: 'a', naics: '511210' }]);
  assert.strictEqual(result[0].vendorCategory, 'Software & Technology');
  assert.strictEqual(result[0].matchedVia, 'naics');
});

test('normalizeBatch falls back to sic when naics is absent or unmatched', () => {
  const result = normalizeBatch([{ id: 'a', sic: '7311' }]);
  assert.strictEqual(result[0].vendorCategory, 'Marketing & Advertising');
  assert.strictEqual(result[0].matchedVia, 'sic');
});

test('normalizeBatch returns null vendorCategory for unmatched records rather than guessing', () => {
  const result = normalizeBatch([{ id: 'a', naics: '000000', sic: '0000' }]);
  assert.strictEqual(result[0].vendorCategory, null);
  assert.strictEqual(result[0].matchedVia, null);
});

test('normalizeBatch throws when a record has no id', () => {
  assert.throws(() => normalizeBatch([{ naics: '511210' }]));
});

test('normalizeBatch throws when records is not an array', () => {
  assert.throws(() => normalizeBatch('nope'));
});

console.log(`\n${passed}/16 passing`);
