import { ENV } from './env';

export async function getStripe() {
  const key = ENV.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    // Dynamic import to avoid hard dependency at build time
    const mod = await import('stripe');
    const Stripe = (mod.default || (mod as any)) as any;
    return new Stripe(key, { apiVersion: '2024-06-20' });
  } catch (e) {
    return null;
  }
}

