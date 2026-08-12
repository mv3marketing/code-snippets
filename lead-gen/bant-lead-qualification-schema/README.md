# BANT Lead Qualification Schema

A structured JSON Schema + reference scorer for qualifying inbound leads against **B**udget, **A**uthority, **N**eed, and **T**imeline before routing to a sales rep or a nurture sequence.

Built and maintained by **Jordan Reeves**, ABM & Outbound Pipeline, MV3 Marketing. Part of the [MV3 Code Snippet Library](https://www.mv3marketing.com/code-snippets/).

## What this is (and isn't)

This is a **documentation + reference implementation repo**, not a hosted API. Everything here — the schema, the scorer, the tests — is meant to be copied into your own stack. MV3 doesn't run this for you unless you separately request implementation help.

## Why a schema instead of a prompt

A flat LLM prompt ("score this lead on BANT") gives you inconsistent shape, inconsistent field names, and no way to validate output before it hits your CRM. This schema defines a fixed contract: feed it four typed inputs, get back a typed `tier` and `recommended_action` your automation can branch on directly — same shape every time, validated, not vibes.

## Files

| File | Purpose |
|---|---|
| `schema.json` | JSON Schema (2020-12 draft) defining the full input/output contract |
| `score.js` | Zero-dependency reference scoring function |
| `examples/valid.json` | 5 real worked examples covering hot/warm/cool/cold + one authority-without-urgency edge case |
| `examples/invalid.json` | 5 examples that must fail validation, used by the test suite |
| `test.js` | Automated test — validates schema correctness AND scorer correctness together |

## Schema

```json
{
  "budget_confirmed": boolean,
  "budget_range_usd": [number, number],   // optional
  "authority_level": "decision_maker" | "influencer" | "unknown",
  "need_severity": 1-10,
  "timeline_days": integer,

  // output fields — do not set these manually, they're computed by score.js
  "points": 0-12,
  "tier": "hot" | "warm" | "cool" | "cold",
  "recommended_action": "route_to_rep" | "nurture_sequence" | "disqualify"
}
```

Full field descriptions, including exactly what counts as "confirmed" budget and how to handle vague timeline answers like "this quarter," are inline in `schema.json` as `description` keys on every property — read those before wiring this to a real form, they cover the judgment calls a bare type definition can't.

## The scoring model (transparent, not a black box)

`score.js` uses a 12-point model:

| Signal | Points |
|---|---|
| `budget_confirmed = true` | +3 |
| `authority_level = decision_maker` | +3 |
| `authority_level = influencer` | +1 |
| `need_severity` 8-10 / 5-7 / 3-4 / 1-2 | +3 / +2 / +1 / +0 |
| `timeline_days` ≤30 / ≤90 / ≤180 / >180 | +3 / +2 / +1 / +0 |

| Points | Tier | Action |
|---|---|---|
| 9-12 | hot | route_to_rep |
| 6-8 | warm | route_to_rep |
| 3-5 | cool | nurture_sequence |
| 0-2 | cold | disqualify |

**These thresholds are a starting point, not gospel.** Re-run this scorer against your last 90 days of closed-won/closed-lost deals monthly and check whether "hot" leads are actually the ones that closed. If they're not, adjust the point weights in `score.js` — that's the whole point of shipping this as editable code instead of a locked SaaS feature.

## How to use it

Drop `score.js` into:
- An **n8n "Code" node** — `const { scoreLead } = require('./score.js'); return scoreLead($json);`
- A **Zapier "Code by Zapier"** step (Node.js runtime)
- A **Supabase Edge Function** — works unmodified, zero dependencies to bundle
- A **Claude tool-call definition** — use `schema.json` directly as the tool's `input_schema`

Populate the four input fields from your form fields, a discovery-call transcript, or enrichment data — **feed it real values, not placeholders**, or the tier output is meaningless. Pair with a CRM webhook to auto-route `hot` tier leads into a live rep queue instead of a shared inbox.

## Testing

```bash
npm install ajv
node test.js
```

Runs all 5 valid + 5 invalid cases through both the JSON Schema validator (ajv, 2020-12 draft) and the scorer, asserting the exact expected `tier`/`recommended_action` for each. Exits non-zero on any failure — safe to wire into CI on this repo.

**Verified 2026-08-12:** 10/10 passing (5 valid cases scored + schema-validated correctly, 5 invalid cases correctly rejected by schema validation).

## Common pitfalls

- **Don't infer `budget_confirmed` from company size or funding stage** — that's a correlation, not a confirmation. Leave it `false` until the lead has actually said so.
- **`authority_level: decision_maker` alone doesn't make a lead hot** — see the edge-case test: a decision maker with zero urgency and no confirmed budget still lands `cool`, not `hot`. Title without urgency is not enough on its own.
- **Vague timeline answers** ("soon," "this quarter") should round up to a conservative day estimate, not down — optimistic timeline guesses are the single most common way teams inflate their own pipeline.

## Related snippets

- [Lead Routing Webhook](https://www.mv3marketing.com/code-snippets/lead-routing-webhook/) — pairs directly with this schema's output
- [ICP & Persona Fit Score](https://www.mv3marketing.com/code-snippets/icp-persona-fit-score/) — same input shape, different scoring lens
- [Cold Email Sequence Config](https://www.mv3marketing.com/code-snippets/cold-email-sequence-config/) — natural next step for `nurture_sequence` leads

## Want this wired into your stack live?

$175/hr, integration assistance — we'll connect this schema's output to your real CRM, form, or automation platform. [Book a scoping call](https://www.mv3marketing.com/book/).

## License

MIT
