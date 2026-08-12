/**
 * Validates a manifest entry (or array of entries) against schema.json using ajv.
 * Requires ajv (draft 2020-12 build): npm install ajv
 */
const Ajv = require('ajv/dist/2020');
const schema = require('./schema.json');

const ajv = new Ajv({ allErrors: true, strict: true });
const validateOne = ajv.compile(schema);

/**
 * @param {object|object[]} input - a single manifest entry, or an array of them
 * @returns {{valid: boolean, errors: Array<{index: number|null, message: string, path: string}>}}
 */
function validateManifest(input) {
  const entries = Array.isArray(input) ? input : [input];
  const errors = [];

  entries.forEach((entry, i) => {
    const ok = validateOne(entry);
    if (!ok) {
      for (const e of validateOne.errors) {
        errors.push({
          index: Array.isArray(input) ? i : null,
          message: e.message,
          path: e.instancePath || '(root)',
        });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = { validateManifest, schema };
