function normalizeBasePath(path) {
  if (!path) return '';
  if (!path.startsWith('/')) return `/${path}`;
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function buildSuccessUrl(origin, basePath = '') {
  const o = (origin || '').replace(/\/$/, '');
  const prefix = normalizeBasePath(basePath);
  return `${o}${prefix}/thank-you?session_id={CHECKOUT_SESSION_ID}`;
}

export function buildCancelUrl(origin, basePath = '') {
  const o = (origin || '').replace(/\/$/, '');
  const prefix = normalizeBasePath(basePath);
  return `${o}${prefix}/pricing`;
}
