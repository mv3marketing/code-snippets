/**
 * Deliverability Composite Risk Score
 * MV3 Marketing — Email / Automation snippet
 *
 * DNS authentication + domain-age + engagement-metric risk scorer:
 * bounce/complaint rates and DMARC/SPF/DKIM flags fold into a single 0-100
 * risk score, grounded in Google/Yahoo's published 2024 bulk-sender rules.
 *
 * A snippet, not a full gate: it scores risk continuously rather than
 * making a block/allow decision (see the companion Deliverability
 * Pre-Flight Gate skill for that).
 */

'use strict';

const WEIGHTS = {
  missingSpf: 20,
  missingDkim: 20,
  missingDmarc: 15,
  bounceRate: 25, // scaled 0-25 based on how far bounce rate exceeds the safe ceiling
  complaintRate: 20, // scaled 0-20 based on how far complaint rate exceeds the safe ceiling
};

const SAFE_BOUNCE_RATE = 0.02;
const SAFE_COMPLAINT_RATE = 0.003;
const DOMAIN_AGE_RAMP_DAYS = 90; // full risk credit for domain-age factor reached at this age

/**
 * @param {Object} input
 * @param {boolean} input.spf
 * @param {boolean} input.dkim
 * @param {boolean} input.dmarc
 * @param {number} input.domainAgeDays
 * @param {number} input.bounceRate - 0-1
 * @param {number} input.complaintRate - 0-1
 * @returns {{score: number, breakdown: Object<string, number>, band: 'low'|'medium'|'high'|'critical'}}
 */
function scoreRisk(input) {
  const { spf, dkim, dmarc, domainAgeDays, bounceRate, complaintRate } = input;

  if (typeof domainAgeDays !== 'number' || domainAgeDays < 0) {
    throw new Error('domainAgeDays must be a non-negative number.');
  }
  if (typeof bounceRate !== 'number' || bounceRate < 0 || bounceRate > 1) {
    throw new Error('bounceRate must be a number between 0 and 1.');
  }
  if (typeof complaintRate !== 'number' || complaintRate < 0 || complaintRate > 1) {
    throw new Error('complaintRate must be a number between 0 and 1.');
  }

  const breakdown = {};

  breakdown.missingSpf = spf ? 0 : WEIGHTS.missingSpf;
  breakdown.missingDkim = dkim ? 0 : WEIGHTS.missingDkim;
  breakdown.missingDmarc = dmarc ? 0 : WEIGHTS.missingDmarc;

  // Bounce/complaint risk scales linearly from 0 at the safe ceiling to full
  // weight at 3x the safe ceiling, capped at the max weight.
  const bounceOverage = Math.max(0, bounceRate - SAFE_BOUNCE_RATE) / (SAFE_BOUNCE_RATE * 2);
  breakdown.bounceRate = Number(Math.min(WEIGHTS.bounceRate, bounceOverage * WEIGHTS.bounceRate).toFixed(2));

  const complaintOverage = Math.max(0, complaintRate - SAFE_COMPLAINT_RATE) / (SAFE_COMPLAINT_RATE * 2);
  breakdown.complaintRate = Number(Math.min(WEIGHTS.complaintRate, complaintOverage * WEIGHTS.complaintRate).toFixed(2));

  // Domain-age risk: a brand-new domain carries inherent risk regardless of
  // clean metrics, tapering to 0 extra risk by DOMAIN_AGE_RAMP_DAYS.
  const domainAgeRiskWeight = 20;
  const ageFactor = Math.max(0, 1 - domainAgeDays / DOMAIN_AGE_RAMP_DAYS);
  breakdown.domainAge = Number((ageFactor * domainAgeRiskWeight).toFixed(2));

  const rawScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Number(Math.min(100, rawScore).toFixed(1));

  let band;
  if (score < 15) band = 'low';
  else if (score < 40) band = 'medium';
  else if (score < 70) band = 'high';
  else band = 'critical';

  return { score, breakdown, band };
}

module.exports = { scoreRisk, WEIGHTS, SAFE_BOUNCE_RATE, SAFE_COMPLAINT_RATE, DOMAIN_AGE_RAMP_DAYS };
