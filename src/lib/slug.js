export function generateClientSlug(name, company) {
  const base = [name, company].filter(Boolean).join(' ').trim() || 'client';
  return base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64) || 'client';
}

