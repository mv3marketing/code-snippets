/**
 * Validates a mapped record (from mapper.js) against schema.json using ajv.
 * Requires ajv (draft 2020-12 build): npm install ajv
 */
const Ajv = require('ajv/dist/2020');
const schema = require('./schema.json');

const ajv = new Ajv({ allErrors: true, strict: true });
const validateOne = ajv.compile(schema);

function validateRecord(record) {
  const ok = validateOne(record);
  return {
    valid: ok,
    errors: ok ? [] : validateOne.errors.map((e) => ({ message: e.message, path: e.instancePath || '(root)' })),
  };
}

module.exports = { validateRecord, schema };
