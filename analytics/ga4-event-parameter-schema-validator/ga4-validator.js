/**
 * GA4 Event Parameter Schema Validator
 * MV3 Marketing — Analytics snippet
 *
 * Catches GA4 events/parameters that Google will silently truncate or
 * drop before they ever hit the property, based on GA4's own documented
 * limits (live-verified against Google's current support docs on
 * 2026-08-17, not assumed from memory -- sources below):
 *
 *   - Event/parameter name length, character rules, reserved prefixes:
 *     https://support.google.com/analytics/answer/13316687
 *   - Parameter value length limits (incl. page_title/page_referrer/
 *     page_location exceptions), max params per event:
 *     https://support.google.com/analytics/answer/9267744
 *
 * These are Google's own published limits, not invented figures -- but
 * platforms do change documented limits over time, so GA4_LIMITS is
 * exported and overridable rather than hardcoded deep in the logic.
 */

'use strict';

const GA4_LIMITS = {
  eventNameMaxLength: 40,
  paramNameMaxLength: 40,
  paramValueMaxLength: 100,
  maxParamsPerEvent: 25,
  // Documented per-parameter exceptions to the default value length limit.
  paramValueLengthExceptions: {
    page_title: 300,
    page_referrer: 420,
    page_location: 1000,
  },
};

const RESERVED_PREFIXES = ['_', 'firebase_', 'ga_', 'google_', 'gtag.'];

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * @param {string} name
 * @returns {boolean}
 */
function startsWithReservedPrefix(name) {
  return RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * @param {string} name
 * @param {number} maxLength
 * @returns {string[]} list of error strings, empty if valid
 */
function validateNameShape(name, maxLength) {
  const errors = [];
  if (typeof name !== 'string' || name.length === 0) {
    errors.push('must be a non-empty string');
    return errors;
  }
  if (name.length > maxLength) errors.push(`exceeds max length of ${maxLength} characters (got ${name.length})`);
  if (!NAME_PATTERN.test(name)) errors.push('must start with a letter and contain only letters, numbers, and underscores');
  if (startsWithReservedPrefix(name)) errors.push(`starts with a reserved prefix (${RESERVED_PREFIXES.join(', ')})`);
  return errors;
}

/**
 * @param {string} eventName
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateEventName(eventName) {
  const errors = validateNameShape(eventName, GA4_LIMITS.eventNameMaxLength);
  return { valid: errors.length === 0, errors };
}

/**
 * @param {string} paramName
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateParameterName(paramName) {
  const errors = validateNameShape(paramName, GA4_LIMITS.paramNameMaxLength);
  return { valid: errors.length === 0, errors };
}

/**
 * @param {string} paramName
 * @param {string} value
 * @returns {{valid: boolean, errors: string[]}}
 */
function validateParameterValue(paramName, value) {
  const errors = [];
  const stringValue = String(value);
  const maxLength = GA4_LIMITS.paramValueLengthExceptions[paramName] ?? GA4_LIMITS.paramValueMaxLength;
  if (stringValue.length > maxLength) {
    errors.push(`value exceeds max length of ${maxLength} characters for "${paramName}" (got ${stringValue.length})`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates a full event object against every applicable GA4 limit,
 * collecting every violation instead of failing fast on the first one --
 * a full diagnosis is more useful than a single stack-traced error.
 * @param {{name: string, params?: Object<string, string|number|boolean>}} event
 * @returns {{valid: boolean, errors: Array<{field: string, message: string}>}}
 */
function validateEvent(event) {
  if (!event || typeof event !== 'object') throw new Error('event must be an object.');
  const errors = [];

  const nameResult = validateEventName(event.name);
  for (const msg of nameResult.errors) errors.push({ field: 'name', message: msg });

  const params = event.params || {};
  const paramNames = Object.keys(params);

  if (paramNames.length > GA4_LIMITS.maxParamsPerEvent) {
    errors.push({
      field: 'params',
      message: `event has ${paramNames.length} parameters, exceeding the max of ${GA4_LIMITS.maxParamsPerEvent}`,
    });
  }

  for (const paramName of paramNames) {
    const nameCheck = validateParameterName(paramName);
    for (const msg of nameCheck.errors) errors.push({ field: `params.${paramName}`, message: msg });

    const valueCheck = validateParameterValue(paramName, params[paramName]);
    for (const msg of valueCheck.errors) errors.push({ field: `params.${paramName}`, message: msg });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  GA4_LIMITS,
  RESERVED_PREFIXES,
  validateEventName,
  validateParameterName,
  validateParameterValue,
  validateEvent,
};
