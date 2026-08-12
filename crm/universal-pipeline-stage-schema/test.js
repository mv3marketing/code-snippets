const assert = require('assert');
const { toCanonical, fromCanonical } = require('./mapper.js');
const { validateRecord } = require('./validate.js');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ok  - ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL - ${name}`);
    console.log(`         ${err.message}`);
    failed++;
  }
}

console.log('Universal Pipeline Stage Schema: test.js\n');

test('1. maps a Salesforce default stage to canonical', () => {
  const r = toCanonical({ dealId: 'SF-1', sourceCrm: 'salesforce', nativeStage: 'Qualification' });
  assert.strictEqual(r.canonical_stage, 'qualification');
  assert.strictEqual(r.mapped_via, 'default');
});

test('2. maps a HubSpot default stage to canonical', () => {
  const r = toCanonical({ dealId: 'HS-1', sourceCrm: 'hubspot', nativeStage: 'Contract Sent' });
  assert.strictEqual(r.canonical_stage, 'negotiation');
});

test('3. maps a Pipedrive default stage to canonical', () => {
  const r = toCanonical({ dealId: 'PD-1', sourceCrm: 'pipedrive', nativeStage: 'Demo Scheduled' });
  assert.strictEqual(r.canonical_stage, 'needs_analysis');
});

test('4. custom mapping takes priority over the shipped default', () => {
  const r = toCanonical({
    dealId: 'SF-2', sourceCrm: 'salesforce', nativeStage: 'Qualification',
    customMapping: { Qualification: 'needs_analysis' }, // this org renamed how they use this stage
  });
  assert.strictEqual(r.canonical_stage, 'needs_analysis');
  assert.strictEqual(r.mapped_via, 'custom');
});

test('5. correctly flags is_closed and is_won for Closed Won', () => {
  const r = toCanonical({ dealId: 'SF-3', sourceCrm: 'salesforce', nativeStage: 'Closed Won' });
  assert.strictEqual(r.is_closed, true);
  assert.strictEqual(r.is_won, true);
});

test('6. correctly flags is_closed but not is_won for Closed Lost', () => {
  const r = toCanonical({ dealId: 'SF-4', sourceCrm: 'salesforce', nativeStage: 'Closed Lost' });
  assert.strictEqual(r.is_closed, true);
  assert.strictEqual(r.is_won, false);
});

test('7. is_closed is false for an open pipeline stage', () => {
  const r = toCanonical({ dealId: 'SF-5', sourceCrm: 'salesforce', nativeStage: 'Prospecting' });
  assert.strictEqual(r.is_closed, false);
});

test('8. throws a clear error for an unmapped custom stage name, does not guess', () => {
  assert.throws(
    () => toCanonical({ dealId: 'SF-6', sourceCrm: 'salesforce', nativeStage: 'Totally Custom Stage Name' }),
    /No mapping found/
  );
});

test('9. throws for missing required fields instead of silently accepting bad input', () => {
  assert.throws(() => toCanonical({ sourceCrm: 'salesforce', nativeStage: 'Prospecting' }), TypeError);
  assert.throws(() => toCanonical({ dealId: 'SF-7', sourceCrm: 'salesforce' }), TypeError);
});

test('10. fromCanonical reverse lookup returns every matching native stage for a CRM', () => {
  const matches = fromCanonical('salesforce', 'needs_analysis');
  assert.ok(matches.includes('Needs Analysis'));
  assert.ok(matches.includes('Value Proposition'));
  assert.ok(matches.includes('Id. Decision Makers'));
});

test('11. fromCanonical includes custom-mapping entries ahead of defaults', () => {
  const matches = fromCanonical('salesforce', 'needs_analysis', { 'My Custom Stage': 'needs_analysis' });
  assert.strictEqual(matches[0], 'My Custom Stage');
});

test('12. a mapped record validates cleanly against schema.json', () => {
  const r = toCanonical({ dealId: 'SF-8', sourceCrm: 'salesforce', nativeStage: 'Negotiation/Review', probability: 75 });
  const result = validateRecord(r);
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
});

test('13. schema rejects a canonical_stage value outside the allowed enum', () => {
  const bad = { deal_id: 'X', source_crm: 'salesforce', native_stage: 'Foo', canonical_stage: 'made_up_stage' };
  const result = validateRecord(bad);
  assert.strictEqual(result.valid, false);
});

console.log(`\n${passed}/${passed + failed} passing`);
if (failed > 0) process.exit(1);
