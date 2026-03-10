import { ALLOWED_PLANS } from './pricing.js';

export type CheckoutMode = 'plan' | 'dynamic';

export type PlanCheckoutConfig = {
  mode: 'plan';
  allowedPlans: string[];
};

export type DynamicCheckoutConfig = {
  mode: 'dynamic';
  currency: 'chf';
  basePrice: number;
  discountFactor: number;
  minPrice: number;
  maxPhotos: number;
  maxFiles: number;
  maxAttachmentBytes: number;
  allowedPaymentMethods: string[];
  allowedIntakeMethods: string[];
  thankYouPaths: Record<'fr' | 'en' | 'de' | 'it', string>;
  cancelPaths: Record<'fr' | 'en' | 'de' | 'it', string>;
  planKey: string;
  templateKey: string;
  productName: (count: number) => string;
};

export type TenantCheckoutConfig = PlanCheckoutConfig | DynamicCheckoutConfig;

const ATELIER_PATHS = {
  thankYou: {
    fr: '/atelier-memoire/thank-you',
    en: '/atelier-memoire/thank-you',
    de: '/atelier-memoire/thank-you',
    it: '/atelier-memoire/thank-you',
  },
  cancel: {
    fr: '/atelier-memoire/prix',
    en: '/atelier-memoire/en/pricing',
    de: '/atelier-memoire/de/preise',
    it: '/atelier-memoire/it/prezzi',
  },
};

const CHECKOUT_CONFIGS: Record<string, TenantCheckoutConfig> = {
  tonsiteweb: {
    mode: 'plan',
    allowedPlans: ALLOWED_PLANS,
  },
  ateliermemoire: {
    mode: 'dynamic',
    currency: 'chf',
    basePrice: 49,
    discountFactor: 0.9,
    minPrice: 10,
    maxPhotos: 100,
    maxFiles: 10,
    maxAttachmentBytes: 20 * 1024 * 1024,
    allowedPaymentMethods: ['card', 'invoice', 'twint'],
    allowedIntakeMethods: ['online', 'mail', 'unsure'],
    thankYouPaths: ATELIER_PATHS.thankYou,
    cancelPaths: ATELIER_PATHS.cancel,
    planKey: 'atelier-memoire',
    templateKey: 'atelier-memoire',
    productName: (count: number) => `Restauration photo (${count})`,
  },
};

const TENANT_ALIASES: Record<string, string> = {
  'atelier-memoire': 'ateliermemoire',
  ateliermemoire: 'ateliermemoire',
  'tonsiteweb': 'tonsiteweb',
};

export function normalizeCheckoutTenantSlug(raw: string | null | undefined) {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return '';
  return TENANT_ALIASES[key] || key.replace(/[^a-z0-9-]/g, '');
}

export function getCheckoutConfig(slug: string | null | undefined): TenantCheckoutConfig | null {
  const normalized = normalizeCheckoutTenantSlug(slug);
  if (!normalized) return null;
  return CHECKOUT_CONFIGS[normalized] || null;
}
