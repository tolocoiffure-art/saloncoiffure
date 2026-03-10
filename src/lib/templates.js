export const ALLOWED_TEMPLATES = [
  'classic-clean',
  'bold-contrast',
  'serif-elegance',
  'minimal-grid',
  'warm-landing',
  'artisan-folio',
];

export function isAllowedTemplate(id) {
  return id ? ALLOWED_TEMPLATES.includes(String(id)) : false;
}

