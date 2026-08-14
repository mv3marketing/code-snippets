'use strict';
const assert = require('assert');
const { scoreRisk, WEIGHTS } = require('./risk-score.js');

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

const clean = () => ({ spf: true, dkim: true, dmarc: true, domainAgeDays: 200, bounceRate: 0.001, complaintRate: 0.0001 });

test('throws on invalid domainAgeDays', () => {
  assert.throws(() => scoreRisk({ ...clean(), domainAgeDays: -1 }));
});

test('throws on out-of-range bounceRate', () => {
  assert.throws(() => scoreRisk({ ...clean(), bounceRate: 1.5 }));
});

test('throws on out-of-range complaintRate', () => {
  assert.throws(() => scoreRisk({ ...clean(), complaintRate: -0.1 }));
});

test('a fully clean, mature domain scores in the low band', () => {
  const result = scoreRisk(clean());
  assert.strictEqual(result.band, 'low');
  assert.ok(result.score < 15);
});

test('missing all three auth records adds their full weights', () => {
  const result = scoreRisk({ ...clean(), spf: false, dkim: false, dmarc: false });
  assert.strictEqual(result.breakdown.missingSpf, WEIGHTS.missingSpf);
  assert.strictEqual(result.breakdown.missingDkim, WEIGHTS.missingDkim);
  assert.strictEqual(result.breakdown.missingDmarc, WEIGHTS.missingDmarc);
});

test('a brand-new domain (age 0) gets full domain-age risk weight', () => {
  const result = scoreRisk({ ...clean(), domainAgeDays: 0 });
  assert.strictEqual(result.breakdown.domainAge, 20);
});

test('domain-age risk tapers to 0 at the ramp threshold', () => {
  const result = scoreRisk({ ...clean(), domainAgeDays: 90 });
  assert.strictEqual(result.breakdown.domainAge, 0);
});

test('domain-age risk stays 0 past the ramp threshold (does not go negative)', () => {
  const result = scoreRisk({ ...clean(), domainAgeDays: 500 });
  assert.strictEqual(result.breakdown.domainAge, 0);
});

test('bounce rate at the safe ceiling contributes 0 extra risk', () => {
  const result = scoreRisk({ ...clean(), domainAgeDays: 500, bounceRate: 0.02 });
  assert.strictEqual(result.breakdown.bounceRate, 0);
});

test('bounce rate well above the ceiling contributes meaningful risk, capped at the max weight', () => {
  const result = scoreRisk({ ...clean(), domainAgeDays: 500, bounceRate: 0.5 });
  assert.strictEqual(result.breakdown.bounceRate, WEIGHTS.bounceRate);
});

test('complaint rate well above the ceiling contributes meaningful risk, capped at the max weight', () => {
  const result = scoreRisk({ ...clean(), domainAgeDays: 500, complaintRate: 0.5 });
  assert.strictEqual(result.breakdown.complaintRate, WEIGHTS.complaintRate);
});

test('score never exceeds 100 even in a maximally bad scenario', () => {
  const result = scoreRisk({ spf: false, dkim: false, dmarc: false, domainAgeDays: 0, bounceRate: 1, complaintRate: 1 });
  assert.strictEqual(result.score, 100);
});

test('worst-case scenario lands in the critical band', () => {
  const result = scoreRisk({ spf: false, dkim: false, dmarc: false, domainAgeDays: 0, bounceRate: 1, complaintRate: 1 });
  assert.strictEqual(result.band, 'critical');
});

test('a domain with only missing DMARC (auth partially present) scores worse than fully clean but not critical', () => {
  const result = scoreRisk({ ...clean(), dmarc: false });
  assert.ok(result.score > 0);
  assert.notStrictEqual(result.band, 'critical');
});

console.log(`\n${passed}/14 passing`);
