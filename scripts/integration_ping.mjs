#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import fetch from 'node-fetch';

const log = (label, ok, info = '') =>
  console.log(`${ok ? '✅' : '❌'} ${label.padEnd(20)} ${info}`);

(async () => {
  console.log('\n🔍 Integration connectivity test\n');

  // === Supabase check ===
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
	const { data, error } = await supabase.from('agencies').select('*').limit(1);
    log('Supabase', !error, error ? error.message : `${data?.length || 0} rows ok`);
  } catch (err) {
    log('Supabase', false, err.message);
  }

  // === Stripe check ===
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const products = await stripe.products.list({ limit: 1 });
    log('Stripe', true, `${products.data.length} product(s)`);
  } catch (err) {
    log('Stripe', false, err.message);
  }

  // === Resend / Email check ===
  try {
    if (!process.env.RESEND_API_KEY) throw new Error('missing RESEND_API_KEY');
    const res = await fetch('https://api.resend.com/v1/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    log('Resend', res.ok, `${res.status} ${res.statusText}`);
  } catch (err) {
    log('Resend', false, err.message);
  }

  // === Zapier check (optional) ===
  try {
    if (!process.env.ZAPIER_WEBHOOK_URL) throw new Error('missing ZAPIER_WEBHOOK_URL');
    const res = await fetch(process.env.ZAPIER_WEBHOOK_URL, { method: 'HEAD' });
    log('Zapier', res.ok, `${res.status} ${res.statusText}`);
  } catch (err) {
    log('Zapier', false, err.message);
  }

  // === Vercel check (optional) ===
  try {
    if (!process.env.VERCEL_TOKEN) throw new Error('missing VERCEL_TOKEN');
    const res = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    });
    log('Vercel', res.ok, `${res.status} ${res.statusText}`);
  } catch (err) {
    log('Vercel', false, err.message);
  }

  console.log('\n🏁 Done\n');
})();
