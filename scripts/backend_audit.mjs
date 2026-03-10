#!/usr/bin/env node
/**
 * Backend audit script
 * - Scans API routes and libs for integration usage
 * - Maps integrations to required env vars
 * - Compares against .env, .env.production, .env.example and process.env
 * - Optionally pings services to validate credentials (with --ping)
 * - Outputs a JSON report to scripts/backend_audit_report.json
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ---------- Helpers ----------
function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function listFiles(dir, exts = ['.ts', '.js', '.mjs']) {
  const out = [];
  function walk(d) {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.includes(path.extname(e.name))) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function parseEnvFile(filePath) {
  const txt = readText(filePath);
  const map = new Map();
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const k = m[1];
    // keep value raw without quotes normalization; used for heuristics only
    const v = m[2].trim();
    map.set(k, v);
  }
  return map;
}

function uniq(arr) { return Array.from(new Set(arr)); }

function hasAny(obj, keys) {
  return keys.some((k) => !!obj[k]);
}

function pickFirst(sourceMaps, key) {
  for (const m of sourceMaps) {
    if (m.has(key)) return m.get(key);
    if (typeof m[key] !== 'undefined') return m[key];
  }
  return undefined;
}

function bool(v) { return v !== undefined && String(v).trim() !== ''; }

// ---------- Discover ENV keys declared in src/lib/env.ts ----------
function discoverEnvKeysFromEnvTs() {
  const envTsPath = path.join(REPO_ROOT, 'src', 'lib', 'env.ts');
  const txt = readText(envTsPath);
  if (!txt) return [];
  const keys = [];
  const objBlock = txt.split(/const\s+ENV\s*=\s*\{/)[1]?.split(/\}\s*;\s*\n/)[0] || '';
  // match lines like: KEY: ...
  for (const line of objBlock.split(/\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*:/);
    if (m) keys.push(m[1]);
  }
  return uniq(keys);
}

// ---------- Scan source for env usages outside env.ts ----------
function discoverEnvKeysFromSource() {
  const srcDir = path.join(REPO_ROOT, 'src');
  const files = listFiles(srcDir, ['.ts', '.js', '.mjs', '.astro']);
  const keys = new Set();
  const reDirect = /\b(?:process\.env|import\.meta\.env|ENV)\.([A-Z0-9_]+)/g;
  for (const f of files) {
    if (f.endsWith('env.ts')) continue;
    const txt = readText(f);
    let m;
    while ((m = reDirect.exec(txt))) keys.add(m[1]);
  }
  return Array.from(keys);
}

// ---------- Endpoints & Dependencies ----------
const methodRe = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/g;

function deriveApiRoute(filePath) {
  // filePath relative to src/pages/api
  const rel = path.relative(path.join(REPO_ROOT, 'src', 'pages', 'api'), filePath);
  const parts = rel.split(path.sep);
  const filename = parts.pop();
  const base = '/api/' + parts.join('/');
  const name = filename.replace(/\.(ts|js|mjs)$/, '');
  return base + (name === 'index' ? '' : (base.endsWith('/') ? '' : '/') + name);
}

function detectDependencies(filePath, content) {
  const deps = new Set();
  const add = (d) => deps.add(d);
  const has = (s) => content.includes(s);

  // Supabase
  if (/getSupabaseAdmin\s*\(/.test(content) || has("utils/supabase/admin") || has('getAdminClient')) add('supabase.admin');
  if (/getSupabaseAnon\s*\(/.test(content) || has("utils/supabase/auth") || has('withAuth(')) add('supabase.anon');

  // Stripe
  if (/getStripe\s*\(/.test(content) || filePath.endsWith('stripe-webhook.ts')) add('stripe.core');
  if (filePath.endsWith('stripe-webhook.ts') || /STRIPE_WEBHOOK_SECRET/.test(content)) add('stripe.webhook');

  // Email
  if (has("lib/email") || /send[A-Za-z]+Email\s*\(/.test(content)) add('email.resend');

  // Google Docs/Drive
  if (has('lib/google-docs') || /GOOGLE_SERVICE_ACCOUNT_/.test(content)) add('google.sa');

  // Vercel
  if (has('lib/vercel')) add('vercel.api');

  // Pricing overrides (optional)
  if (/determineStripePriceId\s*\(/.test(content) || /PRICE_ESSENTIAL/.test(content)) add('stripe.price_overrides');

  return Array.from(deps);
}

const INTEGRATION_KEYS = {
  'supabase.admin': { required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], optional: [] },
  'supabase.anon': { required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'], optional: ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY'] },
  'stripe.core': { required: ['STRIPE_SECRET_KEY'], optional: ['STRIPE_PUBLISHABLE_KEY'] },
  'stripe.webhook': { required: ['STRIPE_WEBHOOK_SECRET'], optional: [] },
  'email.resend': { required: ['RESEND_API_KEY'], optional: ['SENDER_EMAIL', 'SENDER_NAME'] },
  'google.sa': { required: ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'], optional: ['GOOGLE_DRIVE_PARENT_FOLDER_ID', 'GOOGLE_DOCS_SECTION_TEMPLATE_ID'] },
  'vercel.api': { required: ['VERCEL_TOKEN'], optional: ['VERCEL_PROJECT_ID', 'VERCEL_TEAM_ID'] },
  'stripe.price_overrides': { required: [], optional: ['PRICE_ESSENTIAL','PRICE_ADVANCED','PRICE_CARE_79','PRICE_CARE_149','PRICE_CARE_249','PRICE_ESSENTIAL_999','PRICE_ESSENTIAL_1249','PRICE_ESSENTIAL_1500'] },
};

// ---------- Load env files ----------
const ENV_FILE = path.join(REPO_ROOT, '.env');
const ENV_PROD_FILE = path.join(REPO_ROOT, '.env.production');
const ENV_EXAMPLE_FILE = path.join(REPO_ROOT, '.env.example');

const envDot = parseEnvFile(ENV_FILE);
const envProd = parseEnvFile(ENV_PROD_FILE);
const envExample = parseEnvFile(ENV_EXAMPLE_FILE);

// Also view process.env
const envProcess = process.env;

function presenceForKey(key) {
  const present = {
    process: bool(envProcess[key]),
    env: envDot.has(key) && bool(envDot.get(key)),
    production: envProd.has(key) && bool(envProd.get(key)),
    example: envExample.has(key) && bool(envExample.get(key)),
  };
  const anywhere = present.process || present.env || present.production || present.example;
  return { ...present, anywhere };
}

// Resolve value for checks (preference: process -> .env -> .env.production -> .env.example)
function valueForKey(key) {
  const v = pickFirst([envProcess, envDot, envProd, envExample], key);
  return typeof v === 'string' ? v : undefined;
}

// ---------- Build endpoint map ----------
const apiDir = path.join(REPO_ROOT, 'src', 'pages', 'api');
const routeFiles = listFiles(apiDir, ['.ts', '.js', '.mjs']).filter((p) => !p.endsWith('.d.ts'));

const endpoints = [];
for (const f of routeFiles) {
  const txt = readText(f);
  if (!txt) continue;
  const route = deriveApiRoute(f);
  const methods = [];
  let m;
  while ((m = methodRe.exec(txt))) methods.push(m[1]);
  const deps = detectDependencies(f, txt);
  const reqKeys = uniq(deps.flatMap((d) => INTEGRATION_KEYS[d]?.required || []));
  const optKeys = uniq(deps.flatMap((d) => INTEGRATION_KEYS[d]?.optional || []));
  const missing = reqKeys.filter((k) => !presenceForKey(k).anywhere);
  endpoints.push({ file: path.relative(REPO_ROOT, f), route, methods: uniq(methods), deps, requiredKeys: reqKeys, optionalKeys: optKeys, missingKeys: missing });
}

// ---------- Discover all keys ----------
const declaredKeys = discoverEnvKeysFromEnvTs();
const discoveredKeys = uniq([...declaredKeys, ...discoverEnvKeysFromSource()]).sort();

// ---------- Optional: live checks with --ping ----------
const doPing = process.argv.includes('--ping') || process.argv.includes('-p');

async function checkSupabase() {
  const url = valueForKey('SUPABASE_URL') || valueForKey('PUBLIC_SUPABASE_URL');
  const service = valueForKey('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return { status: 'skip', info: 'missing url or service key' };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from('orders').select('id').limit(1);
    if (error) throw error;
    return { status: 'ok', info: `${data?.length || 0} rows` };
  } catch (e) {
    return { status: 'fail', info: String(e?.message || e) };
  }
}

async function checkStripe() {
  const key = valueForKey('STRIPE_SECRET_KEY');
  if (!key) return { status: 'skip', info: 'missing STRIPE_SECRET_KEY' };
  try {
    const mod = await import('stripe');
    const Stripe = (mod.default || mod);
    const stripe = new Stripe(key);
    const prices = await stripe.prices.list({ limit: 1 });
    return { status: 'ok', info: `${prices?.data?.length || 0} prices` };
  } catch (e) {
    return { status: 'fail', info: String(e?.message || e) };
  }
}

async function checkResend() {
  const key = valueForKey('RESEND_API_KEY');
  if (!key) return { status: 'skip', info: 'missing RESEND_API_KEY' };
  try {
    const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return { status: 'fail', info: `HTTP ${res.status}` };
    const json = await res.json();
    return { status: 'ok', info: `${json?.data?.length || 0} domains` };
  } catch (e) {
    return { status: 'fail', info: String(e?.message || e) };
  }
}

async function checkVercel() {
  const token = valueForKey('VERCEL_TOKEN');
  if (!token) return { status: 'skip', info: 'missing VERCEL_TOKEN' };
  try {
    const res = await fetch('https://api.vercel.com/v9/projects', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { status: 'fail', info: `HTTP ${res.status}` };
    const json = await res.json();
    return { status: 'ok', info: `${json?.projects?.length || 0} projects` };
  } catch (e) {
    return { status: 'fail', info: String(e?.message || e) };
  }
}

function checkGoogle() {
  const email = valueForKey('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const pk = valueForKey('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  if (!email && !pk) return { status: 'skip', info: 'missing SA email/private key' };
  if (!email || !pk) return { status: 'warn', info: 'partial config' };
  const looksLikeKey = /BEGIN PRIVATE KEY/.test(pk) || pk.includes('\\n') || pk.length > 40;
  return { status: looksLikeKey ? 'ok' : 'warn', info: looksLikeKey ? 'format looks valid' : 'key format suspicious' };
}

const integrationChecks = {};
async function runPings() {
  integrationChecks.supabase = await checkSupabase();
  integrationChecks.stripe = await checkStripe();
  integrationChecks.resend = await checkResend();
  integrationChecks.vercel = await checkVercel();
  integrationChecks.google = checkGoogle();
}

// ---------- Compose env presence map ----------
const envPresence = {};
for (const key of discoveredKeys) envPresence[key] = presenceForKey(key);

// ---------- Aggregate missing keys per-integration and global ----------
const missingGlobal = new Set();
for (const ep of endpoints) for (const k of ep.missingKeys) missingGlobal.add(k);

const perIntegration = {};
for (const [name, spec] of Object.entries(INTEGRATION_KEYS)) {
  const miss = spec.required.filter((k) => !presenceForKey(k).anywhere);
  perIntegration[name] = { required: spec.required, optional: spec.optional, missing: miss };
}

// ---------- Run ----------
(async () => {
  if (doPing) await runPings();

  const report = {
    summary: {
      apiRoutes: endpoints.length,
      declaredEnvKeys: declaredKeys.length,
      discoveredEnvKeys: discoveredKeys.length,
      missingRequiredKeys: Array.from(missingGlobal).sort(),
    },
    endpoints,
    envPresence,
    integrations: perIntegration,
    checks: integrationChecks,
    meta: { generatedAt: new Date().toISOString(), ping: !!doPing },
  };

  const outPath = path.join(REPO_ROOT, 'scripts', 'backend_audit_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  // Console summary
  const ok = (s) => (s ? '\x1b[32m' : '\x1b[31m');
  console.log(`\n🧪 Backend audit complete`);
  console.log(`• Routes: ${endpoints.length}`);
  console.log(`• Env keys discovered: ${discoveredKeys.length} (declared: ${declaredKeys.length})`);
  console.log(`• Missing required keys: ${Array.from(missingGlobal).length}`);

  if (Array.from(missingGlobal).length) {
    console.log(`\n❌ Missing keys (required by at least one route):`);
    for (const k of Array.from(missingGlobal).sort()) {
      const p = envPresence[k];
      const locs = [p.env && '.env', p.production && '.env.production', p.example && '.env.example', p.process && 'process']
        .filter(Boolean)
        .join(', ');
      console.log(`  - ${k}  ${locs ? `(present in: ${locs})` : ''}`);
    }
  }

  console.log(`\n🔎 Per-integration status:`);
  for (const [name, data] of Object.entries(perIntegration)) {
    const missing = data.missing.length ? `missing: ${data.missing.join(', ')}` : 'ok';
    console.log(`  • ${name.padEnd(20)} ${missing}`);
  }

  if (doPing) {
    console.log(`\n🌐 Live checks (--ping):`);
    for (const [name, res] of Object.entries(integrationChecks)) {
      const c = res.status === 'ok' ? '\x1b[32m' : res.status === 'warn' || res.status === 'skip' ? '\x1b[33m' : '\x1b[31m';
      console.log(`  • ${name.padEnd(10)} ${c}${res.status.toUpperCase()}\x1b[0m  ${res.info || ''}`);
    }
  } else {
    console.log(`\n(Use --ping to perform live API checks for Supabase, Stripe, Resend, Vercel)`);
  }

  console.log(`\n🧾 Report written to scripts/backend_audit_report.json\n`);
})();

