# MV3 MCP Capability Manifest Schema

[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20passing-brightgreen)](./test.js)
[![Vulnerabilities](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-brightgreen)](./package.json)
[![Schema](https://img.shields.io/badge/JSON%20Schema-2020--12-informational)](./schema.json)

Canonical, platform-agnostic JSON Schema for describing a connected MCP server's capabilities, scope tiers, and live rate-limit usage — the data contract the [Sales Stack Router](https://www.mv3marketing.com/ai-skills/sales-stack-router/) skill is built on, but generic enough for any multi-MCP-server orchestration.

Built and maintained by **Jordan Reeves**, ABM & Outbound Pipeline, MV3 Marketing. Part of the [MV3 Code Snippet Library](https://www.mv3marketing.com/code-snippets/).

## What this is (and isn't)

A schema + a thin ajv validator, not a hosted service. Nothing leaves your environment — `validate.js` runs entirely locally against a manifest object you supply.

## Files

| File | Purpose |
|---|---|
| `schema.json` | JSON Schema (2020-12 draft) for one manifest entry |
| `validate.js` | ajv-based validator — accepts a single entry or an array |
| `examples/valid.json` | A schema-conformant example |
| `examples/invalid.json` | Intentionally broken example, used by the test suite to prove rejection actually works |
| `test.js` | 10-test suite |

## Quick start

```bash
git clone https://github.com/mv3marketing/code-snippets.git
cd code-snippets/sales-ops/mcp-capability-manifest-schema
npm install
node test.js
```

```js
const { validateManifest } = require('./validate.js');
const result = validateManifest(myManifestEntry);
if (!result.valid) console.error(result.errors);
```

## Security & validation

Verified 2026-08-12: `npm audit` 0 vulnerabilities (single dependency: `ajv`, installed in an isolated local `package.json` — not hoisted from an unrelated project tree), `node test.js` 10/10 passing, including a dedicated test proving the shipped `invalid.json` example is actually rejected (not just that valid input passes).

## Support

[GitHub Issues](https://github.com/mv3marketing/code-snippets/issues) for bugs/questions. [Book a scoping call](https://www.mv3marketing.com/book/) ($175/hr) for help wiring this into your real MCP server connections.

## License

MIT
