# Firmographic Normalization Crosswalk

NAICS &lt;-&gt; SIC &lt;-&gt; MV3 vendor-taxonomy crosswalk. No native crosswalk exists as a simple
lookup table anywhere public — this is a real, individually-sourced starter set of 8 entries,
**not** the full official government crosswalk.

## What this is (and isn't)

A lookup table and normalization function, not a hosted service or a complete government
dataset. Every NAICS/SIC pair was individually verified against siccode.com's per-code
correspondence pages on 2026-08-14 — see `SOURCE_NOTE` in the code. Extend the table with
your own verified lookups; don't treat 8 entries as comprehensive.

## Files

| File | Purpose |
|---|---|
| `crosswalk.js` | `CROSSWALK_DATA`, `lookupByNaics()`, `lookupBySic()`, `toVendorCategory()`, `normalizeBatch()` — zero dependencies |
| `test.js` | 16-test suite covering one-to-one, many-to-one, and one-to-many mapping cases |

## How to use it

```js
const { normalizeBatch } = require('./crosswalk.js');

const records = [
  { id: 'acct_1', naics: '541511' }, // Custom Computer Programming Services
  { id: 'acct_2', sic: '7311' },     // Advertising Agencies
  { id: 'acct_3', naics: '999999' }, // not in this starter set
];

const normalized = normalizeBatch(records);
// [{ id: 'acct_1', vendorCategory: 'Software & Technology', matchedVia: 'naics' },
//  { id: 'acct_2', vendorCategory: 'Marketing & Advertising', matchedVia: 'sic' },
//  { id: 'acct_3', vendorCategory: null, matchedVia: null }]
```

## Why NAICS<->SIC crosswalks are genuinely non-trivial

Government industry codes rarely map 1:1 across revisions. This starter set includes real
examples of each pattern: **541511 &rarr; 7371** (clean one-to-one), **541613 and 541611 both
&rarr; 8742** (many-to-one — two distinct modern NAICS categories collapsed into one legacy
SIC code), and **518210 &rarr; 7374, 7379, 7389** (one-to-many). A naive lookup table that
assumes 1:1 will silently drop or mis-map real accounts.

## Free / paid

Free to download and use. MV3 charges $175/hr only for implementation help extending this
crosswalk to your own firmographic data set.
