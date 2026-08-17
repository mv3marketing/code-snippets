# Keyword Cannibalization Detector

Flags real keyword cannibalization from a rank-tracking export, with a severity tier
based on how close together and how visible both rankings actually are.

## What this is (and isn't)

Pure functions over the rank-tracking rows you supply. Not a hosted service and not a
direct connection to any rank-tracking platform's API.

## Files

| File | Purpose |
|---|---|
| `cannibalization.js` | `groupByKeyword()`, `classifySeverity()`, `detectCannibalization()` — zero dependencies |
| `test.js` | 17-test suite covering grouping, severity classification, deduplication, and the visibility threshold |

## How to use it

```js
const { detectCannibalization } = require('./cannibalization.js');

const result = detectCannibalization([
  { url: '/loan-guide', keyword: 'business loans', position: 4 },
  { url: '/loans-101', keyword: 'business loans', position: 6 },
  { url: '/widgets-a', keyword: 'widgets', position: 5 },
  { url: '/widgets-b', keyword: 'widgets', position: 97 }, // too far down to be real competition
]);
// result -> [{ keyword: 'business loans', primaryUrl: '/loan-guide', primaryPosition: 4,
//              competitors: [{ url: '/loans-101', position: 6, positionGap: 2 }],
//              severity: 'likely_true_cannibalization' }]
// "widgets" produces nothing -- position 97 isn't real competition against position 5
```

## The two real guardrails

1. **A visibility threshold, not a blind "2+ URLs" rule** — a page ranking #4 and another
   ranking #97 for the same term aren't really competing; the second is essentially
   invisible to searchers. Only URLs within `visibilityThreshold` (default rank 30) count
   as real competition.
2. **Severity scales with the position gap, not a flat true/false flag** — a 2-position
   gap between two visible URLs is a real, urgent overlap; a 22-position gap is lower risk
   and may reflect two pages serving genuinely different search intent. Thresholds are a
   stated, overridable heuristic, not an asserted universal constant.

## Free / paid

Free to download and use. MV3 charges $175/hr only for implementation help wiring this
into your real rank-tracking export data.
