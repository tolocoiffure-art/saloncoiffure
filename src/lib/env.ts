// src/lib/env.ts
// ✅ Safe for both Vite (dev) and Node (server) – no dynamic access to import.meta.env
// Works seamlessly in Astro 5 + Vercel + local environments

// Explicitly declare each variable instead of looping/dynamic indexing
const ENV = {
  ORIGIN:
    process.env.SITE_URL ??
    import.meta.env.SITE_URL ??
    import.meta.env.PUBLIC_SITE_URL ??
    import.meta.env.ORIGIN ??
    'http://www.pedrodemenagement.ch',

  SUPABASE_URL:
    process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '',

  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '',

  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  STRIPE_SECRET_KEY:
    process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY ?? '',

  STRIPE_PUBLISHABLE_KEY:
    process.env.STRIPE_PUBLISHABLE_KEY ?? import.meta.env.STRIPE_PUBLISHABLE_KEY ?? '',

  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET ?? '',

  RESEND_API_KEY:
    process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY ?? '',

  GOOGLE_SERVICE_ACCOUNT_EMAIL:
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',

  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ??
    import.meta.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ??
    '',

  GOOGLE_DRIVE_PARENT_FOLDER_ID:
    process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? import.meta.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? '',

  GOOGLE_DOCS_SECTION_TEMPLATE_ID:
    process.env.GOOGLE_DOCS_SECTION_TEMPLATE_ID ??
    import.meta.env.GOOGLE_DOCS_SECTION_TEMPLATE_ID ??
    '',

  SUPPORT_EMAIL:
    process.env.SENDER_EMAIL ??
    import.meta.env.SENDER_EMAIL ??
    'contact@lausannedemenagement.ch',

  SENDER_NAME:
    process.env.SENDER_NAME ?? import.meta.env.SENDER_NAME ?? 'Pedro Déménagement',

  ZAPIER_WEBHOOK_URL:
    process.env.ZAPIER_WEBHOOK_URL ?? import.meta.env.ZAPIER_WEBHOOK_URL ?? '',

  CONTENT_INTAKE_FORM_URL:
    process.env.CONTENT_INTAKE_FORM_URL ?? import.meta.env.CONTENT_INTAKE_FORM_URL ?? '',

  PRICE_ESSENTIAL:
    process.env.PRICE_ESSENTIAL ?? import.meta.env.PRICE_ESSENTIAL ?? '',

  PRICE_ADVANCED:
    process.env.PRICE_ADVANCED ?? import.meta.env.PRICE_ADVANCED ?? '',

  PRICE_CARE_79:
    process.env.PRICE_CARE_79 ?? import.meta.env.PRICE_CARE_79 ?? '',

  PRICE_CARE_149:
    process.env.PRICE_CARE_149 ?? import.meta.env.PRICE_CARE_149 ?? '',

  PRICE_CARE_249:
    process.env.PRICE_CARE_249 ?? import.meta.env.PRICE_CARE_249 ?? '',

  PRICE_ESSENTIAL_999:
    process.env.PRICE_ESSENTIAL_999 ?? import.meta.env.PRICE_ESSENTIAL_999 ?? '',

  PRICE_ESSENTIAL_1249:
    process.env.PRICE_ESSENTIAL_1249 ?? import.meta.env.PRICE_ESSENTIAL_1249 ?? '',

  PRICE_ESSENTIAL_1500:
    process.env.PRICE_ESSENTIAL_1500 ?? import.meta.env.PRICE_ESSENTIAL_1500 ?? '',

  VERCEL_TOKEN:
    process.env.VERCEL_TOKEN ?? import.meta.env.VERCEL_TOKEN ?? '',
  VERCEL_PROJECT_ID:
    process.env.VERCEL_PROJECT_ID ?? import.meta.env.VERCEL_PROJECT_ID ?? '',
  VERCEL_TEAM_ID:
    process.env.VERCEL_TEAM_ID ?? import.meta.env.VERCEL_TEAM_ID ?? '',

  GODADDY_API_KEY:
    process.env.GODADDY_API_KEY ?? import.meta.env.GODADDY_API_KEY ?? '',
  GODADDY_API_SECRET:
    process.env.GODADDY_API_SECRET ?? import.meta.env.GODADDY_API_SECRET ?? '',

  DEPLOY_AUTOMATION_ENABLED:
    process.env.DEPLOY_AUTOMATION_ENABLED ?? import.meta.env.DEPLOY_AUTOMATION_ENABLED ?? '',
  DOMAIN_ROOT:
    process.env.DOMAIN_ROOT ?? import.meta.env.DOMAIN_ROOT ?? '',

  LAUSANNE_BOOKING_PRICE_CHF:
    process.env.LAUSANNE_BOOKING_PRICE_CHF ?? import.meta.env.LAUSANNE_BOOKING_PRICE_CHF ?? '',
  LAUSANNE_BOOKING_CURRENCY:
    process.env.LAUSANNE_BOOKING_CURRENCY ?? import.meta.env.LAUSANNE_BOOKING_CURRENCY ?? '',
  LAUSANNE_BOOKING_PRODUCT_NAME:
    process.env.LAUSANNE_BOOKING_PRODUCT_NAME ?? import.meta.env.LAUSANNE_BOOKING_PRODUCT_NAME ?? '',
};

// ✅ Explicitly typed export (for IDE autocomplete + safety)
export type EnvKeys = keyof typeof ENV;

export function requireEnv(name: EnvKeys): string {
  const value = ENV[name];
  if (!value || value.trim() === '') {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
}

export function getEnv(name: EnvKeys, fallback?: string): string {
  const value = ENV[name];
  return (value && value.trim() !== '' ? value : fallback) ?? '';
}

export { ENV };

export function validateEnvVars(required: EnvKeys[] = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
]) {
  const missing: string[] = [];
  for (const key of required) {
    const v = ENV[key];
    if (!v || String(v).trim() === '') missing.push(key);
  }
  return { ok: missing.length === 0, missing };
}
