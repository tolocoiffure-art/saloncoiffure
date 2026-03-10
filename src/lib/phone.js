export function normalizePhoneNumber(value, defaultDialCode = '41') {
  if (!value) return '';
  let v = String(value).trim();
  if (!v) return '';
  v = v.replace(/[\s().-]/g, '');
  if (v.startsWith('+')) return `+${v.replace(/^\+/, '')}`;
  if (v.startsWith('00')) return `+${v.slice(2)}`;
  if (v.startsWith('0')) return `+${defaultDialCode}${v.slice(1)}`;
  if (/^\d+$/.test(v)) return `+${v}`;
  return '';
}

