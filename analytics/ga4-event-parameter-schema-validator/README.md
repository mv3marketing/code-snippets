# GA4 Event Parameter Schema Validator

Catches GA4 events and parameters that Google will silently truncate or drop before they
ever hit your property, based on GA4's own documented limits.

## What this is (and isn't)

Pure functions you call against your own event payloads before sending them, not a
hosted service or a GA4 API integration. Runs entirely in your own environment.

## Files

| File | Purpose |
|---|---|
| `ga4-validator.js` | `validateEventName()`, `validateParameterName()`, `validateParameterValue()`, `validateEvent()` — zero dependencies |
| `test.js` | 24-test suite covering every documented limit, including the `page_title`/`page_referrer`/`page_location` value-length exceptions |

## How to use it

```js
const { validateEvent } = require('./ga4-validator.js');

const result = validateEvent({
  name: 'purchase',
  params: { currency: 'USD', value: 49.99, item_name: 'Widget' },
});
// result.valid -> true
// result.errors -> [] (or a full list of every distinct violation, not just the first)
```

## The limits, live-verified against Google's own docs (not assumed from memory)

Fetched directly from Google's current support pages on 2026-08-17:
- Event name: 40 characters max, must start with a letter, letters/numbers/underscores only
- Parameter name: 40 characters max, same character rules
- Parameter value: 100 characters max, with documented exceptions (`page_title` 300, `page_referrer` 420, `page_location` 1000)
- Max 25 parameters per event
- Reserved prefixes that cannot be used for custom names: `_`, `firebase_`, `ga_`, `google_`, `gtag.`

Sources: [support.google.com/analytics/answer/13316687](https://support.google.com/analytics/answer/13316687), [support.google.com/analytics/answer/9267744](https://support.google.com/analytics/answer/9267744). Google can and does update these over time — `GA4_LIMITS` and `RESERVED_PREFIXES` are exported constants, not buried magic numbers, so you can override them if the documented values change.

## Free / paid

Free to download and use. MV3 charges $175/hr only for implementation help wiring this
into your real event-tracking pipeline.
