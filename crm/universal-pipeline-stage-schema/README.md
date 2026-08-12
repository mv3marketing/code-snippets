# MV3 Universal Pipeline Stage Schema

[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-13%2F13%20passing-brightgreen)](./test.js)
[![Vulnerabilities](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-brightgreen)](./package.json)

A CRM-agnostic canonical deal-stage schema, with real default-mapping adapters for Salesforce, HubSpot, and Pipedrive, so a dashboard, scoring skill, or report can work the same way regardless of which CRM a deal actually lives in.

Built and maintained by **Jordan Reeves**, ABM & Outbound Pipeline, MV3 Marketing. Part of the [MV3 Code Snippet Library](https://www.mv3marketing.com/code-snippets/).

## What this is (and isn't)

A schema + mapping logic, not a live CRM integration. You supply the native stage name from your own CRM export or API call; nothing connects to your CRM directly.

## Files

| File | Purpose |
|---|---|
| `schema.json` | JSON Schema (2020-12) for one canonical, mapped deal record |
| `default-mappings.json` | Real, cited out-of-the-box default stage names for Salesforce, HubSpot, and Pipedrive |
| `mapper.js` | `toCanonical()` / `fromCanonical()`, zero dependencies |
| `validate.js` | ajv-based schema validator |
| `test.js` | 13-test suite |

## Quick start

```bash
git clone https://github.com/mv3marketing/code-snippets.git
cd code-snippets/crm/universal-pipeline-stage-schema
npm install
node test.js
```

```js
const { toCanonical } = require('./mapper.js');

// Works out of the box against each platform's default stage names:
toCanonical({ dealId: 'SF-001', sourceCrm: 'salesforce', nativeStage: 'Negotiation/Review' });
// { canonical_stage: 'negotiation', is_closed: false, is_won: false, mapped_via: 'default' }

// Almost every real account renames its stages — supply your own mapping:
toCanonical({
  dealId: 'HS-042', sourceCrm: 'hubspot', nativeStage: 'Verbal Commitment',
  customMapping: { 'Verbal Commitment': 'negotiation' },
});
```

## Why the default mappings are clearly labeled "default"

`default-mappings.json` ships each platform's real, cited out-of-the-box stage names, not a claim about what your specific account has today. Nearly every real CRM instance customizes its pipeline. `toCanonical()` prefers a `customMapping` you supply over the shipped defaults, and throws a clear error (rather than guessing) when a stage name isn't found anywhere.

## Security & validation

Verified 2026-08-12: `npm audit` 0 vulnerabilities (single dependency: ajv, isolated local `package.json`), `node test.js` 13/13 passing, including tests that custom mappings correctly override defaults and that unmapped stages fail loudly instead of silently mis-categorizing a deal.

## Support

[GitHub Issues](https://github.com/mv3marketing/code-snippets/issues) for bugs/questions. [Book a scoping call](https://www.mv3marketing.com/book/) ($175/hr) for help mapping your real, customized pipeline.

## License

MIT
