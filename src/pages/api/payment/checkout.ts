import type { APIRoute } from 'astro';
import { handlePlanCheckoutRequest } from '~/lib/checkout';

export const prerender = false;

export const POST: APIRoute = async (ctx) => handlePlanCheckoutRequest(ctx);
