import { ENV } from './env';
import { logger } from './logger.js';
import type { EmailLocale } from './email-templates';
import type { TenantContext } from './tenants';
import { renderEmailTemplate, formatAmountForLocale, renderTemplate } from './email-templates';

type SendResult = { ok: boolean; error?: string };

type Recipient = string | string[];

export type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

type SendTransactionalOptions = {
  replyTo?: Recipient;
  cc?: Recipient;
  bccSupport?: boolean;
  attachments?: EmailAttachment[];
};

const SUPPORTED_LOCALES: EmailLocale[] = ['fr', 'en', 'de', 'it'];

function normalizeRecipient(recipient: Recipient | undefined | null): string[] {
  if (!recipient) return [];
  if (Array.isArray(recipient)) {
    return recipient.map((item) => item.trim()).filter(Boolean);
  }
  return recipient
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveEmailLocale(locale?: string | null): EmailLocale {
  if (!locale) return 'fr';
  const lower = locale.toLowerCase();
  if (SUPPORTED_LOCALES.includes(lower as EmailLocale)) {
    return lower as EmailLocale;
  }
  return 'fr';
}

async function sendTransactionalEmail(
  to: Recipient,
  subject: string,
  html: string,
  bccSupport = true,
  options: SendTransactionalOptions = {},
): Promise<SendResult> {
  const key = ENV.RESEND_API_KEY;
  if (!key) {
    const error = 'RESEND_API_KEY missing';
    logger.error(new Error(error), { where: 'sendTransactionalEmail' });
    return { ok: false, error };
  }

  const recipients = normalizeRecipient(to);
  if (recipients.length === 0) {
    return { ok: false, error: 'Missing recipient' };
  }

  const supportEmail = (ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch').trim();
  const fromName = ENV.SENDER_NAME || 'Pedro Déménagement';
  const from = `${fromName} <${supportEmail}>`;

  const payload: Record<string, any> = {
    from,
    to: recipients,
    subject,
    html,
  };

  if (bccSupport && supportEmail && !recipients.includes(supportEmail)) {
    payload.bcc = [supportEmail];
  }

  const ccList = normalizeRecipient(options.cc);
  if (ccList.length > 0) {
    payload.cc = ccList;
  }

  const replyToList = normalizeRecipient(options.replyTo);
  if (replyToList.length > 0) {
    payload.reply_to = replyToList.length === 1 ? replyToList[0] : replyToList;
  }

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.error(new Error(text), { where: 'sendTransactionalEmail', subject });
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (error: any) {
    logger.error(error, { where: 'sendTransactionalEmail' });
    return { ok: false, error: error?.message || 'Failed to send email' };
  }
}

// Small wrapper used by some codepaths to send a simple HTML with explicit subject
function sendEmailInternal(subject: string, to: string, html: string): Promise<SendResult> {
  return sendTransactionalEmail(to, subject, html, false);
}

type TemplateSendOptions = {
  template: string;
  to: Recipient;
  locale?: string | null;
  data?: Record<string, any>;
  bccSupport?: boolean;
  replyTo?: Recipient;
  cc?: Recipient;
  attachments?: EmailAttachment[];
};

export async function sendEmailTemplate(options: TemplateSendOptions): Promise<SendResult> {
  const { template, to, locale, data, bccSupport = true, replyTo, cc, attachments } = options;
  const rendered = renderEmailTemplate(template, { locale, data });
  return sendTransactionalEmail(to, rendered.subject, rendered.html, bccSupport, { replyTo, cc, attachments });
}

function formatOrderAmount(amount: unknown, currency: string | null | undefined, locale: EmailLocale) {
  return formatAmountForLocale(amount, currency, locale);
}

function formatDateForLocale(value: unknown, locale: EmailLocale) {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  try {
    const date = new Date(numeric * 1000);
    if (Number.isNaN(date.getTime())) return '';
    const localeTag = locale === 'fr' ? 'fr-CH' : locale === 'de' ? 'de-CH' : locale === 'it' ? 'it-CH' : 'en-CH';
    return new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch {
    return '';
  }
}

function orderLocale(order: any): EmailLocale {
  const metadata = order?.metadata || {};
  const locale =
    order?.locale ||
    metadata.locale ||
    metadata.lang ||
    metadata.language ||
    (typeof metadata.acceptLanguage === 'string' ? metadata.acceptLanguage.split(',')[0] : null);
  return resolveEmailLocale(locale);
}

function buildOrderTemplateData(order: any, locale: EmailLocale) {
  const metadata = order?.metadata || {};
  const amount = typeof order?.amount_total === 'number' ? order.amount_total : Number(order?.amount_total || 0);
  const currency = order?.currency || metadata.currency || 'CHF';
  const formattedAmount = formatOrderAmount(amount, currency, locale);

  return {
    order_number: order?.order_number || metadata.order_number || '—',
    customer_name: order?.customer_name || metadata.name || '',
    customer_email: order?.customer_email || metadata.email || '',
    plan_name: order?.plan || metadata.plan || '',
    template_name: order?.template_key || metadata.template || '',
    amount_formatted: formattedAmount,
    amount_currency: String(currency || 'CHF').toUpperCase(),
    amount_minor: amount,
    amount_value: amount / 100,
    payment_status: order?.status || metadata.status || '',
    metadata,
    support_email: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
  } as Record<string, any>;
}

export async function sendAdminNotificationEmail(order: any) {
  const locale = orderLocale(order);
  const data = buildOrderTemplateData(order, locale);
  return sendEmailTemplate({
    template: 'orders/admin-new-order',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale,
    data,
    bccSupport: false,
  });
}

export async function sendAdminUserSignupEmail(info: {
  email: string;
  name?: string | null;
  phone?: string | null;
  plan?: string | null;
  template?: string | null;
  tenant?: TenantContext;
}) {
  const to = ENV.SUPPORT_EMAIL;
  if (!to) return { ok: false, error: 'Missing support email' };
  const subject = info?.email ? `Nouveau compte: ${info.email}` : 'Nouveau compte créé';
  const html = renderTemplate('admin_user_signup', { ...info, tenant_id: info.tenant?.slug });
  return sendEmailInternal(subject, to, html);
}

export async function sendClientConfirmationEmail(order: any) {
  const locale = orderLocale(order);
  const to = order?.customer_email || order?.email;
  if (!to) return { ok: false, error: 'Missing recipient' };
  const data = buildOrderTemplateData(order, locale);
  return sendEmailTemplate({
    template: 'orders/order-confirmation',
    to,
    locale,
    data,
    bccSupport: true,
  });
}

export async function sendOrderUpdateEmail(order: any, update: { status: string; note?: string }) {
  const locale = orderLocale(order);
  const to = order?.customer_email || order?.email;
  if (!to) return { ok: false, error: 'Missing recipient' };
  const data = {
    ...buildOrderTemplateData(order, locale),
    new_status: update.status,
    note: update.note || '',
    note_block: update.note
      ? `<p style="margin:16px 0;"><strong>${locale === 'en' ? 'Comment' : locale === 'de' ? 'Kommentar' : locale === 'it' ? 'Commento' : 'Commentaire'} :</strong> ${update.note}</p>`
      : '',
  };
  return sendEmailTemplate({ template: 'orders/order-update', to, locale, data, bccSupport: true });
}

export async function sendSubscriptionRenewalEmail(order: any, invoice: any) {
  const locale = orderLocale(order);
  const to = order?.customer_email || order?.email;
  if (!to) return { ok: false, error: 'Missing recipient' };
  const amount = invoice?.amount_paid ?? order?.amount_total;
  const currency = invoice?.currency || order?.currency;
  const periodStart = formatDateForLocale(invoice?.lines?.data?.[0]?.period?.start, locale);
  const periodEnd = formatDateForLocale(invoice?.lines?.data?.[0]?.period?.end, locale);
  const renewalPeriod = periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : '';
  const data = {
    ...buildOrderTemplateData(order, locale),
    invoice_number: invoice?.number || '',
    amount_formatted: formatOrderAmount(amount, currency, locale),
    period_start: periodStart,
    period_end: periodEnd,
    renewal_period: renewalPeriod,
  };
  return sendEmailTemplate({ template: 'orders/subscription-renewal', to, locale, data, bccSupport: true });
}

export async function sendSubscriptionCancelledEmail(order: any, subscription: any) {
  const locale = orderLocale(order);
  const to = order?.customer_email || order?.email;
  if (!to) return { ok: false, error: 'Missing recipient' };
  const canceledAt = formatDateForLocale(subscription?.canceled_at, locale);
  const data = {
    ...buildOrderTemplateData(order, locale),
    cancellation_reason: subscription?.cancellation_reason || '',
    canceled_at: canceledAt,
  };
  return sendEmailTemplate({ template: 'orders/subscription-cancelled', to, locale, data, bccSupport: true });
}

// Backend subscription updates (price change, cancel at period end)
export async function sendSubscriptionUpdateEmail({
  to,
  subscriptionId,
  action,
  locale,
}: {
  to: string;
  subscriptionId: string;
  action: 'updated' | 'canceled' | string;
  locale?: string | null;
}) {
  return sendEmailTemplate({
    template: 'subscription_update',
    to,
    locale,
    data: { subscriptionId, action },
    bccSupport: true,
  });
}

export async function sendWelcomeEmail(to: string, name?: string | null, verifyUrl?: string | null, locale?: string | null) {
  if (!to) return { ok: false, error: 'Missing recipient' };
  const verifySection = verifyUrl
    ? `<p style="margin:16px 0;"><a href="${verifyUrl}" target="_blank">${locale === 'en' ? 'Confirm my email address' : locale === 'de' ? 'Meine E-Mail-Adresse bestätigen' : locale === 'it' ? 'Conferma il mio indirizzo email' : 'Confirmer mon adresse email'}</a></p>`
    : '';
  return sendEmailTemplate({
    template: 'auth/welcome',
    to,
    locale,
    data: {
      user_name: name || '',
      verify_url: verifyUrl || '',
      verify_section: verifySection,
    },
    bccSupport: true,
  });
}

export async function sendNewUserAdminEmail(payload: { email: string; name?: string; phone?: string; locale?: string | null }) {
  const locale = resolveEmailLocale(payload.locale);
  return sendEmailTemplate({
    template: 'auth/admin-new-user',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale,
    data: {
      user_email: payload.email,
      user_name: payload.name || '',
      user_phone: payload.phone || '',
    },
    bccSupport: false,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, locale?: string | null) {
  if (!to) return { ok: false, error: 'Missing recipient' };
  return sendEmailTemplate({
    template: 'auth/reset-request',
    to,
    locale,
    data: {
      reset_url: resetUrl,
    },
    bccSupport: false,
  });
}

export async function sendPasswordChangedEmail(to: string, locale?: string | null) {
  if (!to) return { ok: false, error: 'Missing recipient' };
  return sendEmailTemplate({ template: 'auth/password-changed', to, locale, data: {}, bccSupport: false });
}

export async function sendContactNotificationEmail(data: {
  name: string;
  email: string;
  company?: string;
  message: string;
  source?: string;
  locale?: string | null;
  tenant?: TenantContext;
}) {
  const locale = resolveEmailLocale(data.locale);
  return sendEmailTemplate({
    template: 'contact/contact-notification',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale,
    data: {
      sender_name: data.name,
      sender_email: data.email,
      sender_company: data.company || '',
      sender_message: data.message,
      source: data.source || 'contact',
      tenant_id: data.tenant?.slug,
    },
    bccSupport: false,
    replyTo: data.email,
  });
}

export async function sendContactConfirmationEmail(data: {
  to: string;
  name?: string;
  message?: string;
  locale?: string | null;
  tenant?: TenantContext;
}) {
  return sendEmailTemplate({
    template: 'contact/contact-confirmation',
    to: data.to,
    locale: data.locale,
    data: {
      sender_name: data.name || '',
      sender_message: data.message || '',
      tenant_id: data.tenant?.slug,
    },
    bccSupport: true,
  });
}

export async function sendBookingNotificationEmail(data: {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  address?: string;
  notes?: string;
  startTime: string;
  endTime: string;
  locale?: string | null;
  tenant?: TenantContext;
}) {
  const locale = resolveEmailLocale(data.locale);
  return sendEmailTemplate({
    template: 'booking/booking-notification',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale,
    data: {
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone || '',
      service: data.service || '',
      address: data.address || '',
      notes: data.notes || '',
      start_time: data.startTime,
      end_time: data.endTime,
      tenant_id: data.tenant?.slug,
    },
    bccSupport: false,
    replyTo: data.email,
  });
}

export async function sendBookingConfirmationEmail(data: {
  to: string;
  name?: string;
  service?: string;
  startTime?: string;
  endTime?: string;
  locale?: string | null;
  tenant?: TenantContext;
}) {
  return sendEmailTemplate({
    template: 'booking/booking-confirmation',
    to: data.to,
    locale: data.locale,
    data: {
      customer_name: data.name || '',
      service: data.service || '',
      start_time: data.startTime || '',
      end_time: data.endTime || '',
      tenant_id: data.tenant?.slug,
    },
    bccSupport: true,
  });
}

export async function sendDemoRequestEmail(data: {
  name: string;
  email: string;
  company?: string;
  message?: string;
  locale?: string | null;
  timeslot?: string;
  tenant?: TenantContext;
}) {
  const locale = resolveEmailLocale(data.locale);
  return sendEmailTemplate({
    template: 'demo/demo-request',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale,
    data: {
      requester_name: data.name,
      requester_email: data.email,
      requester_company: data.company || '',
      requester_message: data.message || '',
      preferred_timeslot: data.timeslot || '',
      tenant_id: data.tenant?.slug,
    },
    bccSupport: false,
    replyTo: data.email,
  });
}

export async function sendDemoConfirmationEmail(data: {
  to: string;
  name?: string;
  locale?: string | null;
  timeslot?: string;
  tenant?: TenantContext;
}) {
  return sendEmailTemplate({
    template: 'demo/demo-confirmation',
    to: data.to,
    locale: data.locale,
    data: {
      requester_name: data.name || '',
      preferred_timeslot: data.timeslot || '',
      tenant_id: data.tenant?.slug,
    },
    bccSupport: true,
  });
}

export async function sendFeedbackNotificationEmail({
  to,
  message,
  project,
  author,
  locale,
  tenant,
}: {
  to?: string;
  message: string;
  project: string;
  author?: string;
  locale?: string | null;
  tenant?: TenantContext;
}) {
  const recipient = to || ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch';
  return sendEmailTemplate({
    template: 'feedback/feedback',
    to: recipient,
    locale,
    data: {
      feedback_message: message,
      project_name: project,
      feedback_author: author || '',
      tenant_id: tenant?.slug,
    },
    bccSupport: !to,
  });
}

export async function sendSupportTicketEmail({
  to,
  ticketId,
  summary,
  customerName,
  priority,
  locale,
}: {
  to: string;
  ticketId: string;
  summary: string;
  customerName?: string | null;
  priority?: string | null;
  locale?: string | null;
}) {
  return sendEmailTemplate({
    template: 'support/admin-support',
    to,
    locale,
    data: {
      ticket_id: ticketId,
      ticket_summary: summary,
      customer_name: customerName || '',
      ticket_priority: priority || 'normal',
    },
    bccSupport: false,
  });
}

export async function sendSupportConfirmationEmail({
  to,
  ticketId,
  summary,
  locale,
}: {
  to: string;
  ticketId: string;
  summary: string;
  locale?: string | null;
}) {
  return sendEmailTemplate({
    template: 'support/support-confirmation',
    to,
    locale,
    data: {
      ticket_id: ticketId,
      ticket_summary: summary,
    },
    bccSupport: true,
  });
}

export async function sendProjectReadyEmail({
  to,
  projectName,
  previewUrl,
  locale,
}: {
  to: string;
  projectName: string;
  previewUrl: string;
  locale?: string | null;
}) {
  return sendEmailTemplate({
    template: 'deployment/project-published',
    to,
    locale,
    data: {
      project_name: projectName,
      preview_url: previewUrl,
    },
    bccSupport: true,
  });
}

export async function sendAdminDeploymentEmail({
  projectName,
  previewUrl,
  locale,
}: {
  projectName: string;
  previewUrl: string;
  locale?: string | null;
}) {
  return sendEmailTemplate({
    template: 'deployment/admin-deployment',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale,
    data: {
      project_name: projectName,
      preview_url: previewUrl,
    },
    bccSupport: false,
  });
}

export async function sendProjectDelayedEmail({
  to,
  projectName,
  newEta,
  locale,
}: {
  to: string;
  projectName: string;
  newEta: string;
  locale?: string | null;
}) {
  return sendEmailTemplate({
    template: 'deployment/project-delayed',
    to,
    locale,
    data: {
      project_name: projectName,
      new_eta: newEta,
    },
    bccSupport: true,
  });
}

export async function sendSystemAlertEmail(subject: string, details: Record<string, any>) {
  return sendEmailTemplate({
    template: 'system/system-alert',
    to: ENV.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch',
    locale: 'fr',
    data: {
      alert_subject: subject,
      alert_body: JSON.stringify(details, null, 2),
    },
    bccSupport: false,
  });
}

export async function sendDeploymentReadyEmail(order: any, previewUrl: string) {
  const locale = orderLocale(order || {});
  const to = order?.customer_email || order?.email || order?.to || '';
  if (!to) return { ok: false, error: 'Missing recipient' };
  return sendProjectReadyEmail({ to, projectName: order?.projectName || 'Votre site', previewUrl, locale });
}

export async function sendInvoiceOrReceiptEmail(_stripeData: any) {
  return { ok: true };
}

export function renderEmail(template: string, data: Record<string, any>, locale?: string | null) {
  return renderEmailTemplate(template, { data, locale });
}
