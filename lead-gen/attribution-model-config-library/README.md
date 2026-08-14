# Attribution Model Config Library

Six real attribution models, last-click through Markov-chain removal-effect, as ready-to-plug
functions. Every model shares the same input shape: an array of converting paths (ordered
channel touchpoints + conversion value).

## What this is (and isn't)

Pure functions you call against your own path data, not a hosted service or an analytics
integration. Runs entirely in your own environment.

## Files

| File | Purpose |
|---|---|
| `attribution-models.js` | `lastClick()`, `firstClick()`, `linear()`, `timeDecay()`, `positionBased()`, `markovRemovalEffect()`, plus the exported `solveLinearSystem()` Gaussian-elimination solver — zero dependencies |
| `test.js` | 19-test suite, including hand-verified exact cases for the Markov removal-effect solver |

## How to use it

```js
const { linear, markovRemovalEffect } = require('./attribution-models.js');

const paths = [
  { channels: ['Organic Search', 'Email', 'Paid Search'], value: 500 },
  { channels: ['Paid Social', 'Paid Search'], value: 300 },
];

const linearCredit = linear(paths);
const { credit, removalEffects, baseConversionProb } = markovRemovalEffect(paths);
```

## The Markov removal-effect model, precisely

Builds a first-order transition model (START &rarr; channels &rarr; conversion) from your
paths, then for each channel measures the **removal effect**: rebuild the model with that
channel's traffic truncated right before it (so those specific paths no longer convert),
recompute the overall conversion probability from START via an exact linear solve, and take
the drop. Removal effects are normalized to allocate total conversion value proportionally.
This is the standard definition (Anderl et al.), simplified to work from converting-path data
alone, without a separate set of non-converting paths.

## Free / paid

Free to download and use. MV3 charges $175/hr only for implementation help wiring these into
your real GA4/BigQuery export data.
