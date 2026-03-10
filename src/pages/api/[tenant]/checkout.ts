import type { APIRoute } from 'astro';
import { handleUnifiedCheckout } from '~/lib/checkout';

export const prerender = false;

export const GET: APIRoute = async (ctx) =>
  handleUnifiedCheckout({ ...ctx, tenantOverride: ctx.params.tenant });

export const POST: APIRoute = async (ctx) =>
  handleUnifiedCheckout({ ...ctx, tenantOverride: ctx.params.tenant });
