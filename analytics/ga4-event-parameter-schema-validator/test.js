'use strict';
const assert = require('assert');
const { GA4_LIMITS, RESERVED_PREFIXES, validateEventName, validateParameterName, validateParameterValue, validateEvent } = require('./ga4-validator.js');

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

// --- validateEventName ---
test('a normal, valid event name passes', () => {
  assert.strictEqual(validateEventName('purchase_completed').valid, true);
});

test('an event name over 40 characters is flagged', () => {
  const longName = 'a'.repeat(41);
  const result = validateEventName(longName);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors[0].includes('40'));
});

test('an event name exactly 40 characters passes', () => {
  const exactName = 'a' + 'b'.repeat(39);
  assert.strictEqual(exactName.length, 40);
  assert.strictEqual(validateEventName(exactName).valid, true);
});

test('an event name starting with a number is flagged', () => {
  assert.strictEqual(validateEventName('1st_purchase').valid, false);
});

test('an event name with a space is flagged', () => {
  assert.strictEqual(validateEventName('purchase completed').valid, false);
});

test('an event name starting with a reserved prefix is flagged', () => {
  assert.strictEqual(validateEventName('google_ad_click').valid, false);
  assert.strictEqual(validateEventName('firebase_event').valid, false);
  assert.strictEqual(validateEventName('ga_session').valid, false);
});

test('an empty event name is flagged', () => {
  assert.strictEqual(validateEventName('').valid, false);
});

// --- validateParameterName ---
test('a normal parameter name passes', () => {
  assert.strictEqual(validateParameterName('item_category').valid, true);
});

test('a parameter name starting with underscore is flagged (reserved)', () => {
  assert.strictEqual(validateParameterName('_internal_field').valid, false);
});

test('a parameter name over 40 characters is flagged', () => {
  assert.strictEqual(validateParameterName('x'.repeat(41)).valid, false);
});

// --- validateParameterValue ---
test('a normal-length value under the default 100-char limit passes', () => {
  assert.strictEqual(validateParameterValue('item_name', 'Blue Widget').valid, true);
});

test('a value over 100 characters fails the default limit', () => {
  const result = validateParameterValue('item_name', 'x'.repeat(101));
  assert.strictEqual(result.valid, false);
});

test('page_location gets its documented 1000-character exception, not the default 100', () => {
  const value = 'x'.repeat(500);
  assert.strictEqual(validateParameterValue('page_location', value).valid, true);
});

test('page_title gets its documented 300-character exception', () => {
  assert.strictEqual(validateParameterValue('page_title', 'x'.repeat(250)).valid, true);
  assert.strictEqual(validateParameterValue('page_title', 'x'.repeat(301)).valid, false);
});

test('page_referrer gets its documented 420-character exception', () => {
  assert.strictEqual(validateParameterValue('page_referrer', 'x'.repeat(420)).valid, true);
  assert.strictEqual(validateParameterValue('page_referrer', 'x'.repeat(421)).valid, false);
});

test('a non-string value is coerced to string before length-checking', () => {
  assert.strictEqual(validateParameterValue('quantity', 12345).valid, true);
});

// --- validateEvent ---
test('a fully valid event with several params passes with zero errors', () => {
  const result = validateEvent({
    name: 'purchase',
    params: { currency: 'USD', value: 49.99, item_name: 'Widget' },
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('an event collects multiple distinct errors instead of failing on the first one', () => {
  const result = validateEvent({
    name: 'google_bad_event', // reserved prefix
    params: { _bad_param: 'x'.repeat(200) }, // reserved prefix AND too long
  });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length >= 2);
});

test('an event with more than 25 parameters is flagged for exceeding the per-event limit', () => {
  const params = {};
  for (let i = 0; i < 26; i++) params[`param_${i}`] = 'value';
  const result = validateEvent({ name: 'big_event', params });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.field === 'params' && e.message.includes('25')));
});

test('an event with exactly 25 parameters does not trigger the count error', () => {
  const params = {};
  for (let i = 0; i < 25; i++) params[`param_${i}`] = 'value';
  const result = validateEvent({ name: 'ok_event', params });
  assert.strictEqual(result.errors.some((e) => e.field === 'params'), false);
});

test('an event with no params object is treated as zero params, not an error', () => {
  const result = validateEvent({ name: 'simple_event' });
  assert.strictEqual(result.valid, true);
});

test('throws when event itself is not an object', () => {
  assert.throws(() => validateEvent(null));
  assert.throws(() => validateEvent('not-an-object'));
});

// --- exported constants match the live-verified GA4 documentation ---
test('GA4_LIMITS matches the live-verified documented values', () => {
  assert.strictEqual(GA4_LIMITS.eventNameMaxLength, 40);
  assert.strictEqual(GA4_LIMITS.paramNameMaxLength, 40);
  assert.strictEqual(GA4_LIMITS.paramValueMaxLength, 100);
  assert.strictEqual(GA4_LIMITS.maxParamsPerEvent, 25);
});

test('RESERVED_PREFIXES matches the live-verified documented list', () => {
  assert.deepStrictEqual(RESERVED_PREFIXES.sort(), ['_', 'firebase_', 'ga_', 'google_', 'gtag.'].sort());
});

console.log(`\n${passed}/${total} passing`);
