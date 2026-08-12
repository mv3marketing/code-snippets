/**
 * BANT Lead Qualification Schema — reference scoring implementation.
 *
 * Takes an object matching the input fields of schema.json (budget_confirmed,
 * authority_level, need_severity, timeline_days) and returns tier +
 * recommended_action. Deterministic — same input always produces same output,
 * so you can re-run this monthly against closed deals to sanity-check the
 * thresholds still track reality (see README "Calibrating to your own data").
 *
 * Drop this into an n8n "Code" node, a Zapier "Code by Zapier" step, or a
 * Supabase edge function with minimal changes — it has zero dependencies.
 */

function scoreLead(input) {
  const { budget_confirmed, authority_level, need_severity, timeline_days } = input;

  if (typeof budget_confirmed !== 'boolean') {
    throw new TypeError('budget_confirmed must be a boolean');
  }
  if (!['decision_maker', 'influencer', 'unknown'].includes(authority_level)) {
    throw new TypeError('authority_level must be one of decision_maker | influencer | unknown');
  }
  if (!Number.isInteger(need_severity) || need_severity < 1 || need_severity > 10) {
    throw new TypeError('need_severity must be an integer 1-10');
  }
  if (!Number.isInteger(timeline_days) || timeline_days < 0) {
    throw new TypeError('timeline_days must be a non-negative integer');
  }

  // Points model — transparent and adjustable, not a black box.
  let points = 0;
  if (budget_confirmed) points += 3;
  if (authority_level === 'decision_maker') points += 3;
  else if (authority_level === 'influencer') points += 1;
  points += need_severity >= 8 ? 3 : need_severity >= 5 ? 2 : need_severity >= 3 ? 1 : 0;
  points += timeline_days <= 30 ? 3 : timeline_days <= 90 ? 2 : timeline_days <= 180 ? 1 : 0;
  // max points = 12

  let tier, recommended_action;
  if (points >= 9) {
    tier = 'hot';
    recommended_action = 'route_to_rep';
  } else if (points >= 6) {
    tier = 'warm';
    recommended_action = 'route_to_rep';
  } else if (points >= 3) {
    tier = 'cool';
    recommended_action = 'nurture_sequence';
  } else {
    tier = 'cold';
    recommended_action = 'disqualify';
  }

  return { ...input, points, tier, recommended_action };
}

module.exports = { scoreLead };
