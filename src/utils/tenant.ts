import type { APIContext } from 'astro';

import { resolveTenantFromRequest, type TenantContext } from '~/lib/tenants';

export function getTenantFromContext(ctx: Pick<APIContext, 'request' | 'locals'>): TenantContext {
  return (ctx.locals?.tenant as TenantContext | undefined) ?? resolveTenantFromRequest(ctx.request);
}
