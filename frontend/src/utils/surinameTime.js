/**
 * Suriname Time override — patches Date.prototype.toLocale*String methods
 * so ALL date/time displays default to Suriname timezone (America/Paramaribo, UTC-3).
 *
 * This ensures that /vastgoed, Kiosk, and /huurders interfaces show dates and
 * times in Suriname local time regardless of the browser's timezone setting.
 *
 * The patch ONLY kicks in when no explicit `timeZone` option is passed, so
 * existing code that explicitly passes a timezone (e.g. UTC for API requests)
 * keeps working.
 *
 * Import this file ONCE at the top of src/index.js so it runs before any
 * React component mounts.
 */

const SURINAME_TZ = 'America/Paramaribo';

const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
const originalToLocaleString = Date.prototype.toLocaleString;

function withSurinameTz(options) {
  // If no options provided, use defaults with Suriname TZ
  if (!options || typeof options !== 'object') {
    return { timeZone: SURINAME_TZ };
  }
  // If caller explicitly set a timeZone, respect it (for UTC-based API flows etc.)
  if (options.timeZone) return options;
  return { ...options, timeZone: SURINAME_TZ };
}

// eslint-disable-next-line no-extend-native
Date.prototype.toLocaleDateString = function (locales, options) {
  return originalToLocaleDateString.call(this, locales, withSurinameTz(options));
};

// eslint-disable-next-line no-extend-native
Date.prototype.toLocaleTimeString = function (locales, options) {
  return originalToLocaleTimeString.call(this, locales, withSurinameTz(options));
};

// eslint-disable-next-line no-extend-native
Date.prototype.toLocaleString = function (locales, options) {
  return originalToLocaleString.call(this, locales, withSurinameTz(options));
};

/**
 * Helper: get a Date-like object that represents "now" in Suriname time.
 * Note: Returns a standard Date object — the underlying timestamp is still UTC,
 * but all toLocale* methods will output in Suriname time thanks to the patch above.
 */
export function nowSR() {
  return new Date();
}

/**
 * Helper: format a date as "dd-MM-yyyy HH:mm" in Suriname time.
 */
export function formatSR(date, withTime = true) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const opts = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return d.toLocaleString('nl-NL', opts);
}

export const SURINAME_TIMEZONE = SURINAME_TZ;

export default { nowSR, formatSR, SURINAME_TIMEZONE: SURINAME_TZ };
