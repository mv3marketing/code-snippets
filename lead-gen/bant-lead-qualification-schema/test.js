/**
 * Real automated test for the BANT Lead Qualification Schema + scorer.
 * Run: node test.js
 * Exits non-zero on any failure — safe to wire into CI.
 */
const Ajv2020 = require('ajv/dist/2020');
const fs = require('fs');
const path = require('path');
const { scoreLead } = require('./score.js');

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf8'));
const valid = JSON.parse(fs.readFileSync(path.join(__dirname, 'examples/valid.json'), 'utf8'));
const invalid = JSON.parse(fs.readFileSync(path.join(__dirname, 'examples/invalid.json'), 'utf8'));

const ajv = new Ajv2020({ strict: true });
const validateFull = ajv.compile(schema); // full schema, used to validate the scored OUTPUT
// Separate input-only schema (no 'tier'/'recommended_action' required) for pre-scoring input validation.
const inputSchema = { ...schema, $id: undefined, required: ['budget_confirmed', 'authority_level', 'need_severity', 'timeline_days'] };
const validateInput = ajv.compile(inputSchema);

let failures = 0;
let passed = 0;

console.log('=== Valid cases: input validates, scores correctly, scored output validates ===');
for (const c of valid) {
  const inputOk = validateInput(c.input);
  if (!inputOk) {
    console.error(`FAIL [${c._case}] input failed schema validation:`, validateInput.errors);
    failures++;
    continue;
  }
  const result = scoreLead(c.input);
  const outputOk = validateFull(result);
  if (!outputOk) {
    console.error(`FAIL [${c._case}] scored output failed schema validation:`, validateFull.errors);
    failures++;
    continue;
  }
  if (result.tier !== c.expected_tier || result.recommended_action !== c.expected_action) {
    console.error(`FAIL [${c._case}] expected tier=${c.expected_tier}/action=${c.expected_action}, got tier=${result.tier}/action=${result.recommended_action} (points=${result.points})`);
    failures++;
    continue;
  }
  console.log(`PASS [${c._case}] -> tier=${result.tier}, action=${result.recommended_action}, points=${result.points}`);
  passed++;
}

console.log('\n=== Invalid cases: MUST fail schema validation ===');
for (const c of invalid) {
  const ok = validateInput(c.input);
  if (ok) {
    console.error(`FAIL [${c._case}] expected schema validation to reject this input, but it passed`);
    failures++;
    continue;
  }
  console.log(`PASS [${c._case}] -> correctly rejected: ${validateInput.errors.map(e => e.message).join('; ')}`);
  passed++;
}

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);
