import type { APIRoute } from 'astro';
import { ENV } from '~/lib/env';
import { getStripe } from '~/lib/stripe';
import { getSupabaseAdmin } from '~/lib/supabase';
import { generateClientSlug } from '~/lib/slug';
import {
  buildOrderDraftFromSession,
  extractMetadataFromSession,
  generateOrderNumber,
  logSystemEvent,
  updateOrderStatusInSupabase,
  updateOrderStatusBySubscriptionId,
  sanitizeOrderDbPayload,
} from '~/lib/orders';
import { provisionWebsiteWorkspace, shareFileWithEmail } from '~/lib/google-docs';
import { sendAdminNotificationEmail, sendBookingConfirmationEmail, sendBookingNotificationEmail, sendClientConfirmationEmail } from '~/lib/email';
import { triggerTemplateDeployment } from '~/lib/deployment.js';
import { getTenantFromContext } from '~/utils/tenant';
import { finalizeBookingFromSession } from '~/lib/booking';
import { resolveTenantFromRequest } from '~/lib/tenants';

export const prerender = false;

async function provisionWebsiteFromCheckout(
  sb: ReturnType<typeof getSupabaseAdmin>,
  session: any,
  metadata: ReturnType<typeof extractMetadataFromSession>,
  orderId?: number | string | null
) {
  if (!sb) return null;

  const slug =
    metadata.clientSlug ||
    generateClientSlug(metadata.name || '', metadata.company || metadata.email || 'client');
  const name = metadata.company || metadata.name || 'Site client';
  const agencyId = metadata.agencyId || metadata.agency_id || null;
  const template = metadata.template || null;
  const plan = metadata.plan || null;

  const basePayload = {
    slug,
    name,
    status: 'ready',
    plan,
    template_key: template,
    published_at: new Date().toISOString(),
    agency_id: agencyId,
    metadata: {
      ...metadata,
      stripe_session_id: session?.id || null,
      order_id: orderId ?? null,
    },
  };

  const { data: website, error } = await sb
    .from('websites')
    .upsert(basePayload, { onConflict: 'slug,agency_id' })
    .select('*')
    .maybeSingle();

  if (error || !website) {
    console.error('Failed to upsert website from checkout', error);
    return null;
  }

  const domainRoot = (ENV.DOMAIN_ROOT || '').trim();
  if (domainRoot) {
    const domain = `${slug}.${domainRoot}`;
    await sb
      .from('website_domains')
      .upsert({ website_id: website.id, domain, is_primary: true }, { onConflict: 'domain' });
  }

  // Seed a simple section if none exist yet
  const { data: existingSections } = await sb
    .from('website_sections')
    .select('id')
    .eq('website_id', website.id)
    .limit(1);
  if (!existingSections || existingSections.length === 0) {
    const intro = metadata.company || metadata.name || 'Votre site est prêt à être configuré.';
    await sb.from('website_sections').insert({
      website_id: website.id,
      section_key: 'intro',
      heading: name,
      content: intro,
      google_doc_id: null,
      google_doc_heading: null,
    });
  }

  return website;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const stripe = await getStripe();
  if (!stripe) return new Response('Stripe not configured', { status: 501 });

  const sig = request.headers.get('stripe-signature');
  const whSecret = ENV.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) return new Response('Missing signature', { status: 400 });

  const rawBody = await request.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    const sb = getSupabaseAdmin();
    const eventTenantId =
      (event?.data?.object?.metadata && (event.data.object.metadata.tenant_id || event.data.object.metadata.tenantId)) ||
      null;
    if (sb) await sb.from('webhooks').insert({ provider: 'stripe', type: event.type, payload: event, tenant_id: eventTenantId });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = extractMetadataFromSession(session);
      if (session?.metadata?.booking_id) {
        const booking = await finalizeBookingFromSession(session);
        if (booking) {
          const tenant = resolveTenantFromRequest(request, booking.tenant_id || undefined);
          const locale = booking.locale || metadata.locale || 'fr';
          try {
            await sendBookingNotificationEmail({
              name: booking.customer_name || '',
              email: booking.customer_email || '',
              phone: booking.customer_phone || '',
              service: booking.service || '',
              address: booking.address || '',
              notes: booking.notes || '',
              startTime: booking.start_time,
              endTime: booking.end_time,
              locale,
              tenant,
            });
          } catch {}
          if (booking.customer_email) {
            try {
              await sendBookingConfirmationEmail({
                to: booking.customer_email,
                name: booking.customer_name || '',
                service: booking.service || '',
                startTime: booking.start_time,
                endTime: booking.end_time,
                locale,
                tenant,
              });
            } catch {}
          }
        }
        return new Response('ok');
      }

      const tenantId = metadata.tenantId || getTenantFromContext({ request, locals }).slug;
      const draft = buildOrderDraftFromSession(session, tenantId);

      let orderRecord = {
        ...draft,
        order_number: draft.order_number || (await generateOrderNumber()),
        plan: draft.plan || metadata.plan || null,
        template_key: draft.template_key || metadata.template || null,
        customer_name: draft.customer_name || metadata.name || null,
        company: draft.company || metadata.company || null,
        phone: draft.phone || metadata.phone || null,
      } as any;

      if (sb) {
        const dbPayload = sanitizeOrderDbPayload({ ...orderRecord, tenant_id: tenantId });
        const { data, error } = await sb.from('orders').insert(dbPayload).select('*').maybeSingle();
        if (error) {
          console.error('Failed to insert order from Stripe webhook', { error, dbPayload });
        } else if (data) {
          orderRecord = { ...orderRecord, ...data };
        }
      }

      const emailOrder = {
        ...orderRecord,
        metadata: { ...metadata, tenant_id: tenantId },
        customer_email: orderRecord.customer_email || session?.customer_details?.email || metadata.email,
        plan: orderRecord.plan || metadata.plan,
        template_key: orderRecord.template_key || metadata.template,
      };

      try {
        const projectName = metadata?.company || metadata?.name || 'Projet TonSiteWeb';
        const workspace = await provisionWebsiteWorkspace(`${projectName} – ${emailOrder.order_number || 'Projet'}`);
        if (workspace?.docId) {
          (emailOrder as any).content_doc_url = `https://docs.google.com/document/d/${workspace.docId}/edit`;
          if (emailOrder.customer_email) {
            try { await shareFileWithEmail(workspace.docId, String(emailOrder.customer_email), 'writer'); } catch {}
          }
        }
      } catch {}

      try {
        await logSystemEvent('order.created', {
          session_id: session.id,
          order_number: emailOrder.order_number,
          metadata,
          tenant_id: tenantId,
        });
      } catch {}
      try { await sendAdminNotificationEmail(emailOrder); } catch {}
      try { await sendClientConfirmationEmail(emailOrder); } catch {}

      // Provision website + domain for the customer (multi-tenant runtime)
      if (sb) {
        try {
          await provisionWebsiteFromCheckout(sb, session, metadata, orderRecord?.id);
        } catch (err) {
          console.error('Failed to provision website from checkout', err);
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const inv = event.data.object;
      if (inv.subscription) {
        const tenantId = String(inv.metadata?.tenant_id || '');
        try { await updateOrderStatusBySubscriptionId(String(inv.subscription), 'paid', undefined, tenantId || undefined); } catch (err) {
          console.error('Failed to mark order paid from invoice.paid', err);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const tenantId = String(sub.metadata?.tenant_id || '');
      try { await updateOrderStatusBySubscriptionId(String(sub.id), 'cancelled', undefined, tenantId || undefined); } catch (err) {
        console.error('Failed to mark order cancelled from subscription.deleted', err);
      }
    }

    if (event.type === 'checkout.session.completed') {
      if (!event?.data?.object?.metadata?.booking_id) {
        try { await triggerTemplateDeployment(event.data.object); } catch {}
      }
    }
  } catch (e) {
    console.error('Stripe webhook handler failed', e);
    return new Response('error', { status: 500 });
  }

  return new Response('ok');
};
