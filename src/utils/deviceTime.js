/**
 * Unified Date & Time Utility for GPS UI
 * All dates and times across the app are dynamically converted & formatted in UK Time (Europe/London),
 * automatically switching between GMT (UTC+0) in Winter and BST (UTC+1) in Summer.
 */

const UK_TIMEZONE = 'Europe/London';

/**
 * Parses any raw date value into a valid Date object.
 */
function parseRawDate(value) {
  if (value === null || value === undefined || value === '') return null;
  let str = String(value).trim();
  if (!str) return null;

  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str));
    return isNaN(d.getTime()) ? null : d;
  }

  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  if (!str.includes('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
    str = str + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date object into UK local time parts (YYYY, MM, DD, HH, mm, ss).
 */
function getUKParts(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
}

/**
 * Primary Date-Time Formatter: formats any timestamp to `YYYY-MM-DD HH:mm:ss` in UK Time (Europe/London).
 */
export function formatDateTime(value) {
  const d = parseRawDate(value);
  if (!d) return '--';
  const p = getUKParts(d);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Formats for HTML `<input type="datetime-local">` in UK Time (`YYYY-MM-DDTHH:mm`).
 */
export function formatForInput(value) {
  const d = parseRawDate(value);
  if (!d) return String(value || '').slice(0, 16);
  const p = getUKParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Parses any date value into epoch milliseconds.
 */
export function parseToEpochMs(value) {
  const d = parseRawDate(value);
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
  return full === '--' ? 'N/A' : `${full} (UK Time)`;
}

export function formatDateUTC(value) {
  const fullDate = formatDeviceDate(value);
  return fullDate === '--' ? 'N/A' : `${fullDate} (UK Time)`;
}

export const formatToLocalTime = formatDateTime;
export const formatForDateTimeInput = formatForInput;


