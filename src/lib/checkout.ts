import type { APIContext } from 'astro';
import { Buffer } from 'buffer';

import { ENV } from './env';
import { getStripe } from './stripe';
import { assertRateLimit } from './rate-limit';
import { resolveLocaleFromRequest } from './locale';
import { getSupabaseAdmin } from './supabase';
import { determineStripePriceId, isSubscriptionPlan } from './pricing.js';
import { buildSuccessUrl, buildCancelUrl } from './urls.js';
import { serializeMetadata } from './metadata.js';
import { isAllowedTemplate } from './templates.js';
import { getCheckoutConfig, normalizeCheckoutTenantSlug, type DynamicCheckoutConfig, type PlanCheckoutConfig } from './checkout-config';
import { tenantBrand, resolveTenantFromRequest } from './tenants';
import { sendContactConfirmationEmail, sendEmailTemplate } from './email';
import { getTenantFromContext } from '~/utils/tenant';

const SUPPORTED_LOCALES = ['fr', 'en', 'de', 'it'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type CheckoutContext = Pick<APIContext, 'request' | 'locals' | 'url'> & { tenantOverride?: string };

function normalizeLocale(raw: string | null | undefined, request: Request): SupportedLocale {
  const value = (raw || '').toLowerCase();
  if (SUPPORTED_LOCALES.includes(value as SupportedLocale)) return value as SupportedLocale;
  const fallback = resolveLocaleFromRequest(request, 'fr');
  return (SUPPORTED_LOCALES.includes(fallback as SupportedLocale) ? fallback : 'fr') as SupportedLocale;
}

function resolveTenant(ctx: CheckoutContext) {
  if (ctx.tenantOverride) {
    const normalized = normalizeCheckoutTenantSlug(ctx.tenantOverride);
    return resolveTenantFromRequest(ctx.request, normalized);
  }
  return getTenantFromContext({ request: ctx.request, locals: ctx.locals });
}

function parseBodyParams(body: Record<string, any>) {
  return {
    plan: String(body.plan || '').toLowerCase(),
    template: String(body.template || '').trim(),
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    company: String(body.company || '').trim(),
    agencyId: String(body.agencyId || body.agency_id || '').trim(),
    locale: String(body.locale || '').trim(),
  };
}

async function handlePlanCheckout(ctx: CheckoutContext, config: PlanCheckoutConfig): Promise<Response> {
  const { request, url, locals } = ctx;
  const tenant = resolveTenant({ request, url, locals, tenantOverride: ctx.tenantOverride });
  const stripe = await getStripe();
  if (!stripe) return new Response('Stripe not configured', { status: 501 });

  const origin = ENV.ORIGIN || request.headers.get('origin') || url.origin;
  const ctype = request.headers.get('content-type') || '';
  const isJson = ctype.includes('application/json');

  let data = {
    plan: url.searchParams.get('plan') || 'essential',
    template: url.searchParams.get('template') || '',
    name: url.searchParams.get('name') || '',
    email: url.searchParams.get('email') || '',
    phone: url.searchParams.get('phone') || '',
    company: url.searchParams.get('company') || '',
    agencyId: url.searchParams.get('agencyId') || url.searchParams.get('agency_id') || '',
    locale: url.searchParams.get('locale') || '',
  };

  if (isJson) {
    const body = await request.json().catch(() => ({}));
    data = { ...data, ...parseBodyParams(body) };
  }

  const plan = String(data.plan || 'essential').toLowerCase();
  if (!config.allowedPlans.includes(plan)) return new Response('Invalid plan', { status: 400 });

  const templateRaw = String(data.template || '').trim();
  const template = isAllowedTemplate(templateRaw) ? templateRaw : '';

  let priceId = determineStripePriceId(plan, ENV);
  if (!priceId) {
    try {
      const prices = await stripe.prices.list({
        lookup_keys: [plan],
        active: true,
        expand: ['data.product'],
      });
      priceId = prices.data[0]?.id || null;
    } catch (err) {
      console.error('Stripe lookup_key error:', err);
    }
  }

  if (!priceId) return new Response('Price not configured', { status: 400 });

  const metadata = serializeMetadata({
    plan,
    template,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    agencyId: data.agencyId,
    tenant_id: tenant.slug,
    locale: data.locale,
  });

  const session = await stripe.checkout.sessions.create({
    mode: isSubscriptionPlan(plan) ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: buildSuccessUrl(origin, tenant.basePath || ''),
    cancel_url: buildCancelUrl(origin, tenant.basePath || ''),
    metadata,
  });

  if (request.method === 'GET') {
    return new Response(null, {
      status: 303,
      headers: { Location: session.url || buildSuccessUrl(origin, tenant.basePath || '') },
    });
  }

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}

function parseCount(raw: FormDataEntryValue | null, maxPhotos: number) {
  const num = Math.floor(Number(raw || 1));
  if (!Number.isFinite(num)) return 1;
  return Math.min(Math.max(num, 1), maxPhotos);
}

function computeDynamicTotal(count: number, config: DynamicCheckoutConfig) {
  let total = 0;
  let price = config.basePrice;
  for (let i = 0; i < count; i += 1) {
    if (i > 0) price = Math.max(config.minPrice, price * config.discountFactor);
    total += price;
  }
  return { total, last: price, avg: total / count };
}

function formatChf(amount: number) {
  return `CHF ${amount.toFixed(2)}`;
}

async function handleDynamicCheckout(ctx: CheckoutContext, config: DynamicCheckoutConfig): Promise<Response> {
  const { request, url, locals } = ctx;
  const tenant = resolveTenant({ request, url, locals, tenantOverride: ctx.tenantOverride });
  assertRateLimit(request, { key: 'checkout-dynamic', limit: 5, window: 60 });

  const form = await request.formData();
  const locale = normalizeLocale(String(form.get('locale') || ''), request);
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim();
  const phone = String(form.get('phone') || '').trim();
  const deliveryEmail = String(form.get('delivery_email') || '').trim();
  const service = String(form.get('service') || '').trim();
  const intake = String(form.get('intake') || '').trim();
  const payment = String(form.get('payment') || '').trim();
  const transferLink = String(form.get('transfer_link') || '').trim();
  const returnAddress = String(form.get('return_address') || '').trim();
  const notes = String(form.get('notes') || '').trim();
  const photoCount = parseCount(form.get('photo_count'), config.maxPhotos);

  if (!name || !email) return new Response('Missing name or email', { status: 400 });
  if (!config.allowedIntakeMethods.includes(intake)) return new Response('Invalid intake method', { status: 400 });
  if (!config.allowedPaymentMethods.includes(payment)) return new Response('Invalid payment method', { status: 400 });
  if (intake === 'mail' && !returnAddress) return new Response('Missing return address', { status: 400 });

  const fileEntries = form.getAll('files');
  const files = fileEntries.filter((item): item is File => item instanceof File && item.size > 0);
  const fileNames = files.map((file) => file.name);
  const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);

  if (files.length > config.maxFiles) return new Response(`Too many files (max ${config.maxFiles})`, { status: 400 });
  if (intake === 'online' && !transferLink && files.length === 0) return new Response('Provide files or a transfer link', { status: 400 });
  if (files.some((file) => !(file.type.startsWith('image/') || file.type === 'application/pdf')))
    return new Response('Unsupported file type', { status: 400 });
  if (totalBytes > config.maxAttachmentBytes && !transferLink) {
    return new Response('Files too large, use a transfer link', { status: 400 });
  }

  const { total, last, avg } = computeDynamicTotal(photoCount, config);
  const totalMinor = Math.round(total * 100);

  const summaryLines = [
    `Service: ${service || '—'}`,
    `Intake: ${intake}`,
    `Payment: ${payment}`,
    `Photos: ${photoCount}`,
    `Estimate: ${formatChf(total)} (last ${formatChf(last)}, avg ${formatChf(avg)})`,
    `Transfer link: ${transferLink || '—'}`,
    `Return address: ${returnAddress || '—'}`,
    `Delivery email: ${deliveryEmail || '—'}`,
    `Phone: ${phone || '—'}`,
    `Files: ${fileNames.length ? fileNames.join(', ') : '—'}`,
    totalBytes > config.maxAttachmentBytes ? 'Files exceed email limit; use transfer link.' : '',
    notes ? `Notes: ${notes}` : '',
  ].filter(Boolean);

  const sb = getSupabaseAdmin();
  if (sb) {
    await sb.from('leads').insert({
      name,
      email,
      company: '',
      message: summaryLines.join('\n'),
      source: config.planKey,
      locale,
      tenant_id: tenant.slug,
    });
  }

  let attachments: { filename: string; content: string; contentType?: string }[] = [];
  if (files.length && totalBytes <= config.maxAttachmentBytes) {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name || 'fichier',
        content: buffer.toString('base64'),
        contentType: file.type || 'application/octet-stream',
      });
    }
  }

  const brand = tenantBrand(tenant);
  const notifyTo = brand?.email || ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch';

  if (ENV.RESEND_API_KEY) {
    await sendEmailTemplate({
      template: 'contact/contact-notification',
      to: notifyTo,
      locale,
      data: {
        sender_name: name,
        sender_email: email,
        sender_company: '',
        sender_message: summaryLines.join('\n'),
        source: config.planKey,
        tenant_id: tenant.slug,
      },
      replyTo: email,
      bccSupport: false,
      attachments,
    });

    await sendContactConfirmationEmail({
      to: email,
      name,
      message: `Merci. Nous avons bien reçu votre demande (${photoCount} photo${photoCount > 1 ? 's' : ''}).`,
      locale,
      tenant,
    });
  }

  const origin = (ENV.ORIGIN || url.origin).replace(/\/$/, '');
  const thankYou = config.thankYouPaths[locale];
  const cancel = config.cancelPaths[locale];

  if (payment === 'card') {
    const stripe = await getStripe();
    if (!stripe) return new Response('Stripe not configured', { status: 501 });

    const successUrl = new URL(thankYou, origin);
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    successUrl.searchParams.set('lang', locale);

    const cancelUrl = new URL(cancel, origin);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: config.currency,
      customer_email: email,
      billing_address_collection: 'auto',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: config.currency,
            unit_amount: totalMinor,
            product_data: {
              name: config.productName(photoCount),
              description: 'Restauration + colorisation',
            },
          },
        },
      ],
      metadata: {
        ...serializeMetadata({
          plan: config.planKey,
          template: config.templateKey,
          name,
          email,
          phone,
          company: '',
          tenant_id: tenant.slug,
          locale,
        }),
        photo_count: String(photoCount),
        service,
        intake,
        payment,
        transfer_link: transferLink,
        return_address: returnAddress,
        delivery_email: deliveryEmail,
        notes,
      },
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
    });

    return new Response(null, { status: 303, headers: { Location: session.url || successUrl.toString() } });
  }

  const redirectUrl = new URL(thankYou, origin);
  redirectUrl.searchParams.set('lang', locale);
  redirectUrl.searchParams.set('method', payment);
  redirectUrl.searchParams.set('count', String(photoCount));
  redirectUrl.searchParams.set('total', totalMinor.toString());
  redirectUrl.searchParams.set('intake', intake);
  return new Response(null, { status: 303, headers: { Location: redirectUrl.toString() } });
}

export async function handleUnifiedCheckout(ctx: CheckoutContext): Promise<Response> {
  const tenantOverride = ctx.tenantOverride || ctx.url.searchParams.get('tenant') || undefined;
  const context = { ...ctx, tenantOverride };
  const tenant = resolveTenant(context);
  const config = getCheckoutConfig(tenant.slug);
  if (!config) return new Response('Checkout not available', { status: 404 });

  if (config.mode === 'plan') {
    return handlePlanCheckout(context, config);
  }

  if (config.mode === 'dynamic') {
    if (context.request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    return handleDynamicCheckout(context, config);
  }

  return new Response('Unsupported checkout', { status: 400 });
}

export async function handlePlanCheckoutRequest(ctx: CheckoutContext): Promise<Response> {
  const tenantOverride = ctx.tenantOverride || ctx.url.searchParams.get('tenant') || undefined;
  const context = { ...ctx, tenantOverride };
  const config = getCheckoutConfig(resolveTenant(context).slug);
  if (!config || config.mode !== 'plan') return new Response('Checkout not available', { status: 404 });
  return handlePlanCheckout(context, config);
}
