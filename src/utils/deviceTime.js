export function formatDeviceDateTime(value) {
  if (value === null || value === undefined || value === '') return '--';
  if (value instanceof Date) return value.toISOString().replace('T', ' ').replace(/Z$/, '');

  const text = String(value).trim();
  if (!text) return '--';

  const normalized = text
    .replace('T', ' ')
    .replace(/Z$/, '')
    .replace(/([+-]\d{2}:?\d{2})$/, '')
    .trim();

  return normalized || text;
}

export function formatDeviceDate(value) {
  const full = formatDeviceDateTime(value);
  if (full === '--') return '--';
  return full.split(' ')[0] || full;
}

export function formatDeviceTime(value) {
  const full = formatDeviceDateTime(value);
  if (full === '--') return '--';
  const parts = full.split(' ');
  return (parts[1] || parts[0] || full).replace(/\.\d+$/, '');
}
