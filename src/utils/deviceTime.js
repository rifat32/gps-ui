/**
 * Unified Date & Time Utility for GPS UI (modeled after ai-telematics-system-front-end)
 * All dates and times across the app are strictly converted & formatted in UTC+1 (+01:00).
 */

const UTC1_OFFSET_MS = 1 * 60 * 60 * 1000; // +01:00 offset (1 hour in ms)

/**
 * Core UTC+1 Date Parser/Converter.
 * Safely converts any ISO string, Date object, or timestamp to a Date shifted to UTC+1.
 */
export function toUTC1Date(value) {
  if (value === null || value === undefined || value === '') return null;
  let str = String(value).trim();
  if (!str) return null;

  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str));
    return isNaN(d.getTime()) ? null : new Date(d.getTime() + d.getTimezoneOffset() * 60000 + UTC1_OFFSET_MS);
  }

  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  if (!str.includes('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
    str = str + 'Z';
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) return null;

  // Shift UTC to UTC+1
  return new Date(d.getTime() + UTC1_OFFSET_MS);
}

/**
 * Primary Date-Time Formatter: formats any timestamp to `YYYY-MM-DD HH:mm:ss` in UTC+1.
 */
export function formatDateTime(value) {
  const d = toUTC1Date(value);
  if (!d) return '--';
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Formats for HTML `<input type="datetime-local">` in UTC+1 (`YYYY-MM-DDTHH:mm`).
 */
export function formatForInput(value) {
  const d = toUTC1Date(value);
  if (!d) return String(value || '').slice(0, 16);
  return d.toISOString().slice(0, 16);
}

/**
 * Parses any date value into UTC+1 epoch milliseconds.
 */
export function parseToEpochMs(value) {
  const d = toUTC1Date(value);
  return d ? d.getTime() : 0;
}

// =========================================================================
// Aliases & Helper Shortcuts (Ensures 100% backward compatibility)
// =========================================================================

export const formatDeviceDateTime = formatDateTime;

export function formatDeviceDate(value) {
  const full = formatDateTime(value);
  return full === '--' ? '--' : full.split(' ')[0];
}

export function formatDeviceTime(value) {
  const full = formatDateTime(value);
  return full === '--' ? '--' : full.split(' ')[1] || full;
}

export function formatTimeUTC(value) {
  const full = formatDateTime(value);
  return full === '--' ? 'N/A' : `${full} (UTC+1)`;
}

export function formatDateUTC(value) {
  const fullDate = formatDeviceDate(value);
  return fullDate === '--' ? 'N/A' : `${fullDate} (UTC+1)`;
}

export const formatToLocalTime = formatDateTime;
export const formatForDateTimeInput = formatForInput;


