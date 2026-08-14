# Deliverability Composite Risk Score

DNS authentication + domain-age + engagement-metric risk scorer, grounded in Google/Yahoo's
published 2024 bulk-sender rules. Returns a continuous 0-100 score with a factor-by-factor
breakdown, not a block/allow decision (see the companion Deliverability Pre-Flight Gate skill
for that).

## What this is (and isn't)

A scoring function, not a hosted service. Runs entirely in your own environment.

## Files

| File | Purpose |
|---|---|
| `risk-score.js` | `scoreRisk()` — zero dependencies |
| `test.js` | 14-test suite covering each risk factor and edge cases |

## How to use it

```js
const { scoreRisk } = require('./risk-score.js');

const result = scoreRisk({
  spf: true, dkim: true, dmarc: false,
  domainAgeDays: 45,
  bounceRate: 0.015,
  complaintRate: 0.001,
});

// result.score -> 0-100
// result.band -> 'low' | 'medium' | 'high' | 'critical'
// result.breakdown -> per-factor contribution
```

## License

MIT. Free to install and run yourself. MV3 charges $175/hr only for implementation help.
