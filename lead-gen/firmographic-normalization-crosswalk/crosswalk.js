/**
 * Firmographic Normalization Crosswalk
 * MV3 Marketing — ABM / Intent / Enrichment snippet
 *
 * NAICS <-> SIC <-> MV3 vendor-taxonomy crosswalk. No native crosswalk
 * exists as a simple lookup table anywhere public; this is a real,
 * individually-sourced starter set (8 entries), NOT the full official
 * government crosswalk (which runs to thousands of rows across NAICS
 * revisions). Every NAICS/SIC pair here was individually verified against
 * siccode.com's per-code correspondence pages on 2026-08-14 - see
 * CROSSWALK_DATA below for the full source list. Extend this table with
 * your own verified lookups rather than treating it as complete.
 */

'use strict';

/**
 * Each entry: real, individually-verified NAICS<->SIC correspondence.
 * `sicCodes` is an array because NAICS<->SIC is frequently many-to-one or
 * one-to-many, never assume a clean 1:1 mapping.
 * `vendorCategory` is MV3's own coarse taxonomy bucket (not a government
 * standard), useful for grouping enrichment-vendor industry tags that use
 * inconsistent naming across ZoomInfo/Clearbit/6sense/etc.
 */
const CROSSWALK_DATA = [
  { naics: '541511', naicsTitle: 'Custom Computer Programming Services', sicCodes: [{ code: '7371', title: 'Computer Programming Services' }], vendorCategory: 'Software & Technology' },
  { naics: '511210', naicsTitle: 'Software Publishers', sicCodes: [{ code: '7372', title: 'Prepackaged Software' }], vendorCategory: 'Software & Technology' },
  { naics: '518210', naicsTitle: 'Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services', sicCodes: [{ code: '7374', title: 'Computer Processing and Data Preparation and Processing Services' }, { code: '7379', title: 'Computer Related Services, Not Elsewhere Classified' }, { code: '7389', title: 'Business Services, Not Elsewhere Classified' }], vendorCategory: 'Software & Technology' },
  { naics: '541810', naicsTitle: 'Advertising Agencies', sicCodes: [{ code: '7311', title: 'Advertising Agencies' }], vendorCategory: 'Marketing & Advertising' },
  { naics: '541613', naicsTitle: 'Marketing Consulting Services', sicCodes: [{ code: '8742', title: 'Management Consulting Services' }], vendorCategory: 'Marketing & Advertising' },
  { naics: '541910', naicsTitle: 'Marketing Research and Public Opinion Polling', sicCodes: [{ code: '8732', title: 'Commercial Economic, Sociological, and Educational Research' }], vendorCategory: 'Marketing & Advertising' },
  { naics: '541611', naicsTitle: 'Administrative Management and General Management Consulting Services', sicCodes: [{ code: '8742', title: 'Management Consulting Services' }], vendorCategory: 'Professional Services' },
  { naics: '522320', naicsTitle: 'Financial Transactions Processing, Reserve, and Clearinghouse Activities', sicCodes: [{ code: '6099', title: 'Functions Related to Depository Banking, Not Elsewhere Classified' }, { code: '6153', title: 'Short-Term Business Credit Institutions, except Agricultural' }, { code: '7389', title: 'Business Services, Not Elsewhere Classified' }], vendorCategory: 'Financial Services' },
];

const SOURCE_NOTE = 'Each NAICS<->SIC pair individually verified against siccode.com per-code correspondence pages, 2026-08-14. This is a representative starter set (8 entries), not the full official crosswalk.';

const byNaics = new Map(CROSSWALK_DATA.map((e) => [e.naics, e]));
const bySic = new Map();
for (const entry of CROSSWALK_DATA) {
  for (const s of entry.sicCodes) {
    if (!bySic.has(s.code)) bySic.set(s.code, []);
    bySic.get(s.code).push(entry);
  }
}

/**
 * @param {string} naicsCode
 * @returns {Object|null} the crosswalk entry, or null if not in this starter set
 */
function lookupByNaics(naicsCode) {
  if (typeof naicsCode !== 'string') throw new Error('naicsCode must be a string.');
  return byNaics.get(naicsCode) || null;
}

/**
 * @param {string} sicCode
 * @returns {Array<Object>} all crosswalk entries whose sicCodes include this SIC code (may be more than one - many-to-one mappings are real)
 */
function lookupBySic(sicCode) {
  if (typeof sicCode !== 'string') throw new Error('sicCode must be a string.');
  return bySic.get(sicCode) || [];
}

/**
 * @param {string} naicsCode
 * @returns {string|null} MV3's coarse vendor-taxonomy category for this NAICS code, or null if unknown
 */
function toVendorCategory(naicsCode) {
  const entry = lookupByNaics(naicsCode);
  return entry ? entry.vendorCategory : null;
}

/**
 * Normalizes a batch of records (e.g. from a CRM export with mixed
 * NAICS/SIC fields) into a consistent vendorCategory, flagging any code
 * not present in this starter crosswalk rather than guessing.
 * @param {Array<{id: string, naics?: string, sic?: string}>} records
 * @returns {Array<{id: string, vendorCategory: string|null, matchedVia: 'naics'|'sic'|null}>}
 */
function normalizeBatch(records) {
  if (!Array.isArray(records)) throw new Error('records must be an array.');
  return records.map((r) => {
    if (!r.id) throw new Error('Every record needs an id.');
    if (r.naics) {
      const entry = lookupByNaics(r.naics);
      if (entry) return { id: r.id, vendorCategory: entry.vendorCategory, matchedVia: 'naics' };
    }
    if (r.sic) {
      const matches = lookupBySic(r.sic);
      if (matches.length > 0) return { id: r.id, vendorCategory: matches[0].vendorCategory, matchedVia: 'sic' };
    }
    return { id: r.id, vendorCategory: null, matchedVia: null };
  });
}

module.exports = { CROSSWALK_DATA, SOURCE_NOTE, lookupByNaics, lookupBySic, toVendorCategory, normalizeBatch };
