import type { APIRoute } from 'astro';
import { handlePlanCheckoutRequest } from '~/lib/checkout';

export const prerender = false;

export const GET: APIRoute = async (ctx) => handlePlanCheckoutRequest(ctx);
