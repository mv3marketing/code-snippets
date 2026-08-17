/**
 * Keyword Cannibalization Detector
 * MV3 Marketing — SEO snippet
 *
 * Flags real keyword cannibalization (multiple URLs on the same site
 * competing for the same query) from a rank-tracking export, with a
 * severity tier based on how close together and how visible both
 * rankings are -- not a blind "2+ URLs, same keyword" rule that would
 * flag harmless coincidences (a page ranking #4 and another ranking #97
 * for the same term aren't really competing; the second is essentially
 * invisible).
 */

'use strict';

/**
 * Groups position rows by keyword.
 * @param {Array<{url: string, keyword: string, position: number}>} rows
 * @returns {Map<string, Array<{url: string, position: number}>>}
 */
function groupByKeyword(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('rows must be a non-empty array.');
  const grouped = new Map();
  for (const row of rows) {
    if (!row.url || !row.keyword) throw new Error('Every row must have a url and a keyword.');
    if (typeof row.position !== 'number' || row.position < 1) throw new Error(`Row for "${row.keyword}" has an invalid position: ${row.position}.`);
    if (!grouped.has(row.keyword)) grouped.set(row.keyword, []);
    grouped.get(row.keyword).push({ url: row.url, position: row.position });
  }
  return grouped;
}

/**
 * Classifies cannibalization severity from the position gap between the
 * two closest-ranking competing URLs. Thresholds are a stated heuristic,
 * not a claimed universal constant -- callers can override via opts.
 * @param {number} gap
 * @param {Object} [opts]
 * @param {number} [opts.tightGap=5]
 * @param {number} [opts.moderateGap=15]
 * @returns {'likely_true_cannibalization'|'moderate_overlap'|'low_risk'}
 */
function classifySeverity(gap, opts = {}) {
  const { tightGap = 5, moderateGap = 15 } = opts;
  if (gap <= tightGap) return 'likely_true_cannibalization';
  if (gap <= moderateGap) return 'moderate_overlap';
  return 'low_risk';
}

/**
 * @param {Array<{url: string, keyword: string, position: number}>} rows
 * @param {Object} [opts]
 * @param {number} [opts.visibilityThreshold=30] - a URL below this rank position is treated as not really competing (too invisible to matter)
 * @param {number} [opts.tightGap=5]
 * @param {number} [opts.moderateGap=15]
 * @returns {Array<{keyword: string, primaryUrl: string, primaryPosition: number, competitors: Array<{url: string, position: number, positionGap: number}>, severity: string}>}
 */
function detectCannibalization(rows, opts = {}) {
  const { visibilityThreshold = 30, tightGap = 5, moderateGap = 15 } = opts;
  const grouped = groupByKeyword(rows);

  const results = [];
  for (const [keyword, entries] of grouped.entries()) {
    // Distinct URLs only -- the same URL appearing twice for one keyword
    // (e.g. desktop/mobile rows) isn't cannibalization.
    const byUrl = new Map();
    for (const entry of entries) {
      if (!byUrl.has(entry.url) || entry.position < byUrl.get(entry.url)) {
        byUrl.set(entry.url, entry.position);
      }
    }
    const visible = [...byUrl.entries()]
      .filter(([, position]) => position <= visibilityThreshold)
      .sort((a, b) => a[1] - b[1]);

    if (visible.length < 2) continue; // no real competition -- fewer than 2 visible URLs

    const [primaryUrl, primaryPosition] = visible[0];
    const competitors = visible.slice(1).map(([url, position]) => ({
      url,
      position,
      positionGap: position - primaryPosition,
    }));

    const tightestGap = competitors[0].positionGap;
    results.push({
      keyword,
      primaryUrl,
      primaryPosition,
      competitors,
      severity: classifySeverity(tightestGap, { tightGap, moderateGap }),
    });
  }

  return results;
}

module.exports = {
  groupByKeyword,
  classifySeverity,
  detectCannibalization,
};
