const assert = require('assert');
const { validateManifest } = require('./validate.js');
const validExample = require('./examples/valid.json');
const invalidExample = require('./examples/invalid.json');

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

console.log('MCP Capability Manifest Schema — test.js\n');

test('1. the shipped valid.json example passes validation', () => {
  const result = validateManifest(validExample);
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
});

test('2. the shipped invalid.json example is rejected', () => {
  const result = validateManifest(invalidExample);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.length >= 4, `expected several distinct errors, got ${result.errors.length}`);
});

test('3. empty server_id is rejected', () => {
  const entry = { ...validExample, server_id: '' };
  const result = validateManifest(entry);
  assert.strictEqual(result.valid, false);
});

test('4. status outside the enum is rejected', () => {
  const entry = { ...validExample, status: 'connecting' };
  assert.strictEqual(validateManifest(entry).valid, false);
});

test('5. capability name without dot-namespace is rejected', () => {
  const entry = JSON.parse(JSON.stringify(validExample));
  entry.capabilities[0].name = 'NoDotHere';
  assert.strictEqual(validateManifest(entry).valid, false);
});

test('6. required_scope outside read/write/destructive is rejected', () => {
  const entry = JSON.parse(JSON.stringify(validExample));
  entry.capabilities[0].required_scope = 'super-admin';
  assert.strictEqual(validateManifest(entry).valid, false);
});

test('7. capabilities array cannot be empty', () => {
  const entry = { ...validExample, capabilities: [] };
  assert.strictEqual(validateManifest(entry).valid, false);
});

test('8. additionalProperties are rejected (typo-proofing)', () => {
  const entry = { ...validExample, staus: 'connected' }; // typo'd key, real 'status' still present
  assert.strictEqual(validateManifest(entry).valid, false);
});

test('9. rate_limit is optional — omitting it entirely is still valid', () => {
  const entry = { ...validExample };
  delete entry.rate_limit;
  delete entry.usage_this_window;
  const result = validateManifest(entry);
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
});

test('10. accepts an array of entries and reports per-index errors', () => {
  const result = validateManifest([validExample, invalidExample]);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => e.index === 1));
  assert.ok(!result.errors.some((e) => e.index === 0));
});

console.log(`\n${passed}/${passed + failed} passing`);
if (failed > 0) process.exit(1);
