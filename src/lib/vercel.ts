import { logger } from './logger.js';
import { ENV } from './env';

const API_BASE = 'https://api.vercel.com';

function hasVercelConfig() {
  return Boolean(ENV.VERCEL_TOKEN && ENV.VERCEL_PROJECT_ID && ENV.DEPLOY_AUTOMATION_ENABLED);
}

function teamQuery() {
  const params = new URLSearchParams();
  if (ENV.VERCEL_TEAM_ID) params.set('teamId', ENV.VERCEL_TEAM_ID);
  return params.size ? `?${params.toString()}` : '';
}

function buildHeaders() {
  return {
    Authorization: `Bearer ${ENV.VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
      'User-Agent': 'PedroDemenagement-Automation/1.0',
  };
}

async function fetchJson(path: string, init: RequestInit = {}) {
  const url = `${API_BASE}${path}${path.includes('?') ? '' : teamQuery()}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init.headers || {}),
    },
  });

  if (res.status === 204) return null;
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    logger.warn('Unable to parse Vercel response', { path, text });
  }

  if (!res.ok) {
    const message = json?.error?.message || json?.message || text || res.statusText;
    const error = new Error(`Vercel API error (${res.status}): ${message}`);
    (error as any).status = res.status;
    throw error;
  }

  return json;
}

function buildDeploymentPayload(template: string, clientSlug: string) {
  const slug = clientSlug?.trim() || 'pedrodemenagement-client';
  const metadata = {
    template: template || 'default',
    clientSlug: slug,
    requestedAt: new Date().toISOString(),
  };

  return {
    name: slug,
    project: ENV.VERCEL_PROJECT_ID,
    target: 'production',
    metadata,
  };
}

function ensureProtocol(url: string | undefined | null) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export async function deployTemplate(template: string, clientSlug: string) {
  if (!hasVercelConfig()) {
    return { id: 'deploy_stub', url: '', preview: '' } as any;
  }

  try {
    const payload = buildDeploymentPayload(template, clientSlug);
    const data = await fetchJson('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    logger.info('Requested Vercel deployment', { deploymentId: data?.id, template, clientSlug });
    return data;
  } catch (error) {
    logger.error(error as any, { where: 'deployTemplate', template, clientSlug });
    throw error;
  }
}

export async function waitForDeploymentStatus(deployId: string) {
  if (!hasVercelConfig()) {
    return { id: deployId, status: 'READY', url: '' } as any;
  }

  const maxAttempts = 20;
  const delayMs = 5000;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const data = await fetchJson(`/v13/deployments/${deployId}`);
      const readyState = data?.readyState || data?.state || data?.status;
      if (!readyState) {
        logger.warn('Unknown deployment state response', { deployId, attempt, data });
      }

      if (readyState === 'READY' || readyState === 'BUILDING') {
        if (readyState === 'READY') {
          return data;
        }
      } else if (readyState === 'ERROR' || readyState === 'CANCELED') {
        return data;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      logger.error(error as any, { where: 'waitForDeploymentStatus', deployId, attempt });
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Deployment ${deployId} did not become ready in time`);
}

async function ensureProjectDomain(domain: string) {
  try {
    await fetchJson(`/v10/projects/${ENV.VERCEL_PROJECT_ID}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });
  } catch (error: any) {
    if (error?.status === 409) {
      return;
    }
    logger.error(error, { where: 'ensureProjectDomain', domain });
    throw error;
  }
}

export async function attachDomainToDeployment(domain: string, deployId: string) {
  if (!hasVercelConfig() || !domain) return { ok: true } as any;

  try {
    await ensureProjectDomain(domain);
    await fetchJson(`/v2/now/deployments/${deployId}/aliases`, {
      method: 'POST',
      body: JSON.stringify({ alias: domain }),
    });
    logger.info('Attached domain to deployment', { deployId, domain });
    return { ok: true } as any;
  } catch (error) {
    if ((error as any)?.status === 409) {
      logger.warn('Domain already attached', { deployId, domain });
      return { ok: true } as any;
    }
    logger.error(error as any, { where: 'attachDomainToDeployment', deployId, domain });
    throw error;
  }
}

export function generatePreviewUrl(deployData: any) {
  const candidate = deployData?.preview || deployData?.url || deployData?.aliases?.[0];
  return ensureProtocol(candidate);
}

export async function updateSupabaseWithPreviewUrl(orderId: number | string, url: string) {
  try {
    const mod = await import('./orders');
    return (mod as any).updateOrder(orderId, { preview_url: url });
  } catch (e) {
    logger.error(e as any, { where: 'updateSupabaseWithPreviewUrl' });
    return null;
  }
}
