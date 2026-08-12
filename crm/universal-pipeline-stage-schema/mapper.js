/**
 * Universal Pipeline Stage Schema: mapper.
 * Converts a CRM's native deal-stage name into the canonical bucket, and back.
 * Zero dependencies. Custom mappings always win over the shipped defaults,
 * since almost every real CRM instance customizes its pipeline.
 */

const defaultMappings = require('./default-mappings.json');

const CLOSED_WON = 'closed_won';
const CLOSED_LOST = 'closed_lost';

/**
 * @param {object} params
 * @param {string} params.dealId
 * @param {"salesforce"|"hubspot"|"pipedrive"|"other"} params.sourceCrm
 * @param {string} params.nativeStage - exact stage name as it appears in the source CRM
 * @param {object} [params.customMapping] - { [nativeStageName]: canonicalStage }, takes priority over defaults
 * @param {number} [params.probability]
 * @returns {object} a record matching schema.json, or throws if the stage can't be mapped at all
 */
function toCanonical({ dealId, sourceCrm, nativeStage, customMapping, probability }) {
  if (!dealId) throw new TypeError('dealId is required');
  if (!nativeStage) throw new TypeError('nativeStage is required');

  let canonicalStage;
  let mappedVia;

  if (customMapping && Object.prototype.hasOwnProperty.call(customMapping, nativeStage)) {
    canonicalStage = customMapping[nativeStage];
    mappedVia = 'custom';
  } else if (defaultMappings[sourceCrm] && Object.prototype.hasOwnProperty.call(defaultMappings[sourceCrm], nativeStage)) {
    canonicalStage = defaultMappings[sourceCrm][nativeStage];
    mappedVia = 'default';
  } else {
    throw new Error(
      `No mapping found for native stage "${nativeStage}" on CRM "${sourceCrm}". ` +
      `This almost always means the account has customized its pipeline stage names. ` +
      `Supply a customMapping entry for "${nativeStage}" rather than guessing.`
    );
  }

  const result = {
    deal_id: dealId,
    source_crm: sourceCrm,
    native_stage: nativeStage,
    canonical_stage: canonicalStage,
    is_closed: canonicalStage === CLOSED_WON || canonicalStage === CLOSED_LOST,
    is_won: canonicalStage === CLOSED_WON,
    mapped_via: mappedVia,
  };
  if (typeof probability === 'number') result.probability = probability;
  return result;
}

/**
 * Reverse lookup: given a canonical stage, return every native stage name
 * that maps to it for a given CRM (using defaults, plus any custom mapping
 * supplied). Useful for building a CRM query filter, e.g. "show me every
 * HubSpot deal in any stage that counts as our 'negotiation' bucket."
 *
 * @param {"salesforce"|"hubspot"|"pipedrive"|"other"} sourceCrm
 * @param {string} canonicalStage
 * @param {object} [customMapping]
 * @returns {string[]} native stage names, custom entries first
 */
function fromCanonical(sourceCrm, canonicalStage, customMapping) {
  const matches = [];
  if (customMapping) {
    for (const [native, canonical] of Object.entries(customMapping)) {
      if (canonical === canonicalStage) matches.push(native);
    }
  }
  const defaults = defaultMappings[sourceCrm] || {};
  for (const [native, canonical] of Object.entries(defaults)) {
    if (canonical === canonicalStage && !matches.includes(native)) matches.push(native);
  }
  return matches;
}

module.exports = { toCanonical, fromCanonical, CLOSED_WON, CLOSED_LOST };
