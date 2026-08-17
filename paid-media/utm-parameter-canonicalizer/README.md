# UTM Parameter Canonicalizer

Normalizes raw UTM values and, given a synonym map you supply, canonicalizes known
variants to one real channel name — surfacing exactly which raw values silently
fragmented the same channel across your reports.

## What this is (and isn't)

Pure functions over the UTM data and synonym map you supply. Not a hosted service, and
does not assert a universal channel-naming list as "correct" — naming conventions are
genuinely different per organization, so you supply your own synonym map.

## Files

| File | Purpose |
|---|---|
| `utm-canonicalizer.js` | `normalizeUtmValue()`, `buildReverseSynonymMap()`, `canonicalizeUtmValue()`, `detectFragmentation()` — zero dependencies |
| `test.js` | 15-test suite covering normalization, canonicalization, and real fragmentation detection |

## How to use it

```js
const { detectFragmentation } = require('./utm-canonicalizer.js');

const synonymMap = {
  paid_search: ['google/cpc', 'Google-CPC', 'bing_cpc'],
  paid_social: ['facebook-ads', 'fb/paid'],
};

const rows = [
  { value: 'google/cpc', sessions: 1200 },
  { value: 'Google-CPC', sessions: 340 }, // same real channel, different raw formatting
  { value: 'newsletter', sessions: 90 },
];

const result = detectFragmentation(rows, synonymMap);
// result.fragmentation -> [{ canonical: 'paid_search', rawValues: [...], totalSessions: 1540 }]
// result.unmapped -> [{ value: 'newsletter', sessions: 90 }] -- needs a taxonomy entry
```

## The two real guardrails

1. **Normalization handles the three common separator styles** (slash, hyphen,
   underscore, plus arbitrary whitespace) so `google/cpc`, `Google-CPC`, and `google_cpc`
   all resolve identically before synonym matching runs.
2. **Fragmentation requires 2+ genuinely distinct raw strings**, not just repeated rows
   of the same value — a channel appearing many times with identical formatting isn't
   fragmentation, it's just volume. Unmapped raw values are reported separately, not
   silently bucketed into an "Unknown" catch-all.

## Free / paid

Free to download and use. MV3 charges $175/hr only for implementation help wiring this
into your real GA4/BigQuery export data.
