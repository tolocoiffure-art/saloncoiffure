#!/usr/bin/env node
/**
 * Sends a copy of every transactional email template to a test address via Resend
 * Usage: node scripts/send_test_emails.mjs [--to contact@lausannedemenagement.ch] [--dry]
 */

import { renderTemplate } from './email_templates.js';

const TEST_TO = (() => {
  const i = process.argv.indexOf('--to');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env.TEST_TO || 'contact@lausannedemenagement.ch';
})();
const DRY = process.argv.includes('--dry');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM = `${process.env.SENDER_NAME || 'Pedro Demenagement'} <${process.env.SENDER_EMAIL || process.env.SUPPORT_EMAIL || 'contact@lausannedemenagement.ch'}>`;

if (!DRY && !RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY in env. Use --dry to preview only.');
  process.exit(1);
}

function formatSubject(key) {
  const map = {
    welcome: 'Bienvenue chez Pedro Demenagement',
    password_reset: 'Réinitialisez votre mot de passe',
    password_changed: 'Mot de passe mis à jour',
    project_ready: 'Votre maquette est prête',
    project_delayed: 'Mise à jour du planning',
    support_ticket: 'Nouveau ticket support',
    subscription_update: 'Mise à jour de votre abonnement',
    feedback_notification: 'Nouveau retour client',
    admin_notification: 'Nouvelle commande',
    client_confirmation: 'Commande reçue',
  };
  return map[key] || `Notification (${key})`;
}

async function sendResend(to, subject, html) {
  if (DRY) return { ok: true, id: 'dry-run' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const text = await res.text();
  try { return { ok: res.ok, ...(JSON.parse(text)) }; } catch { return { ok: res.ok, response: text }; }
}

const ORIGIN = process.env.SITE_URL || process.env.ORIGIN || 'https://pedrodemenagement.ch';
const sampleOrder = {
  order_number: 'TSW-20240609-ABCD',
  customer_name: 'Jean Dupont',
  customer_email: TEST_TO,
  company: 'ACME SA',
  phone: '+41 79 123 45 67',
  plan: 'essential1249',
  template_key: 'bold-contrast',
  amount_total: 124900,
  currency: 'CHF',
  status: 'paid',
  metadata: {
    plan: 'essential1249',
    template: 'bold-contrast',
    name: 'Jean Dupont',
    email: TEST_TO,
    company: 'ACME SA',
    phone: '+41 79 123 45 67',
    clientSlug: 'acme',
  },
};

const sample = {
  welcome: { name: 'Jean Dupont', verifyUrl: `${ORIGIN}/auth/verify?token=dummy` },
  password_reset: { resetUrl: `${ORIGIN}/auth/reset?token=dummy` },
  password_changed: {},
  project_ready: { projectName: 'Site ACME', previewUrl: `${ORIGIN}/preview/acme` },
  project_delayed: { projectName: 'Site ACME', newEta: '2025-01-15' },
  support_ticket: { ticketId: 'TSW-1234', summary: 'Le formulaire ne se soumet pas', customerName: 'Marie', priority: 'haut' },
  subscription_update: { subscriptionId: 'sub_12345', action: 'updated' },
  feedback_notification: { project: 'Site ACME', author: 'Client', message: 'Top. Merci !' },
  admin_notification: { order: sampleOrder },
  client_confirmation: { order: sampleOrder },
};

const templates = [
  'welcome',
  'password_reset',
  'password_changed',
  'project_ready',
  'project_delayed',
  'support_ticket',
  'subscription_update',
  'feedback_notification',
  'admin_notification',
  'client_confirmation',
];

console.log(`Sending ${templates.length} emails to ${TEST_TO}${DRY ? ' (dry-run)' : ''} ...`);

for (const key of templates) {
  const subject = `[TEST] ${formatSubject(key)}`;
  const html = renderTemplate(key, sample[key]);
  const res = await sendResend(TEST_TO, subject, html);
  if (res.ok) console.log(`✅ ${key} -> sent (${res.id || res.response || 'ok'})`);
  else console.log(`❌ ${key} -> failed`, res);
}

// Also test canceled variant of subscription_update
{
  const key = 'subscription_update:canceled';
  const subject = `[TEST] ${formatSubject('subscription_update')} (annulé)`;
  const html = renderTemplate('subscription_update', { subscriptionId: 'sub_12345', action: 'canceled' });
  const res = await sendResend(TEST_TO, subject, html);
  if (res.ok) console.log(`✅ ${key} -> sent (${res.id || res.response || 'ok'})`);
  else console.log(`❌ ${key} -> failed`, res);
}

console.log('Done.');

