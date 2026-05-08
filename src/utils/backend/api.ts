// src/utils/backend/api.ts
function storagePrefix() {
  if (typeof window === 'undefined') return 'tenant';
  const host = window.location?.hostname || 'tenant';
  const path = window.location?.pathname || '';
  const firstSegment = path.split('/').filter(Boolean)[0];
  const suffix = firstSegment ? `:${firstSegment.toLowerCase()}` : '';
  return `${host.toLowerCase()}${suffix}`;
}

const ACCESS_TOKEN_KEY = `${storagePrefix()}:accessToken`;
const REFRESH_TOKEN_KEY = `${storagePrefix()}:refreshToken`;

export type AuthFetchOptions = RequestInit & {
  parseJson?: boolean;
};

function buildApiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Allow callers to pass full backend paths without double-prefixing
  if (normalized.startsWith('/api/')) {
    return normalized;
  }
  return `/api/backend${normalized}`;
}

function getStoredToken(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setAuthSession(session: {
  accessToken: string;
  refreshToken?: string;
}) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  if (session.refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  }
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function authFetch(path: string, options: AuthFetchOptions = {}) {
  const token = getStoredToken(ACCESS_TOKEN_KEY);
  if (!token) {
    throw new Error('Missing auth session. Please sign in again.');
  }

  const { parseJson = true, headers, ...rest } = options;
  const response = await fetch(buildApiUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      throw new Error('Session expired. Please sign in again.');
    }

    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) errorMessage = data.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  if (!parseJson) return null;
  return response.json();
}
