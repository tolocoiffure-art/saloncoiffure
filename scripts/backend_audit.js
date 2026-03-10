#!/usr/bin/env node
/**
 * Backend audit script (CommonJS)
 * Same behavior as backend_audit.mjs but written for wider Node compatibility.
 */

const fs = require('fs');
const path = require('path');

// ---------- Helpers ----------
function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function listFiles(dir, exts = ['.ts', '.js', '.mjs']) {
  const out = [];
  (function walk(d){ let ents=[]; try{ents=fs.readdirSync(d,{withFileTypes:true});}catch{return;}
    for(const e of ents){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(exts.includes(path.extname(e.name))) out.push(p); }
  })(dir);
  return out;
}
function parseEnvFile(filePath) {
  const txt = readText(filePath); const map = new Map();
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (!m) continue;
    map.set(m[1], m[2].trim());
  }
  return map;
}
const uniq = (arr) => Array.from(new Set(arr));
const pickFirst = (maps, key) => { for (const m of maps) { if (m instanceof Map) { if (m.has(key)) return m.get(key); } else if (typeof m[key] !== 'undefined') return m[key]; } };
const bool = (v) => v !== undefined && String(v).trim() !== '';

// ---------- Discover ENV declared in src/lib/env.ts ----------
function discoverEnvKeysFromEnvTs(ROOT) {
  const envTsPath = path.join(ROOT, 'src', 'lib', 'env.ts'); const txt=readText(envTsPath);
  if (!txt) return [];
  const keys=[];
  const split1 = txt.split(/const\s+ENV\s*=\s*\{/);
  const objBlock = split1.length > 1 ? (split1[1].split(/\}\s*;\s*\n/)[0] || '') : '';
  for (const line of objBlock.split(/\n/)) { const m=line.match(/^\s*([A-Z0-9_]+)\s*:/); if(m) keys.push(m[1]); }
  return uniq(keys);
}
function discoverEnvKeysFromSource(ROOT) {
  const files = listFiles(path.join(ROOT, 'src'), ['.ts','.js','.mjs','.astro']);
  const keys=new Set(); const re=/\b(?:process\.env|import\.meta\.env|ENV)\.([A-Z0-9_]+)/g;
  for (const f of files) { if (f.endsWith('env.ts')) continue; const t=readText(f); let m; while((m=re.exec(t))) keys.add(m[1]); }
  return Array.from(keys);
}

// ---------- Endpoints & Dependencies ----------
const methodRe = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/g;
function deriveApiRoute(ROOT, filePath) {
  const rel = path.relative(path.join(ROOT, 'src', 'pages', 'api'), filePath);
  const parts = rel.split(path.sep); const filename = parts.pop();
  const base = '/api/' + parts.join('/'); const name = filename.replace(/\.(ts|js|mjs)$/, '');
  return base + (name === 'index' ? '' : (base.endsWith('/') ? '' : '/') + name);
}
function detectDependencies(filePath, content) {
  const deps=new Set(); const add=(d)=>deps.add(d); const has=(s)=>content.includes(s);
  if (/getSupabaseAdmin\s*\(/.test(content) || has("utils/supabase/admin") || has('getAdminClient')) add('supabase.admin');
  if (/getSupabaseAnon\s*\(/.test(content) || has("utils/supabase/auth") || has('withAuth(')) add('supabase.anon');
  if (/getStripe\s*\(/.test(content) || filePath.endsWith('stripe-webhook.ts')) add('stripe.core');
  if (filePath.endsWith('stripe-webhook.ts') || /STRIPE_WEBHOOK_SECRET/.test(content)) add('stripe.webhook');
  if (has("lib/email") || /send[A-Za-z]+Email\s*\(/.test(content)) add('email.resend');
  if (has('lib/google-docs') || /GOOGLE_SERVICE_ACCOUNT_/.test(content)) add('google.sa');
  if (has('lib/vercel')) add('vercel.api');
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
const ROOT = path.resolve(__dirname, '..');
const envDot = parseEnvFile(path.join(ROOT, '.env'));
const envProd = parseEnvFile(path.join(ROOT, '.env.production'));
const envExample = parseEnvFile(path.join(ROOT, '.env.example'));

function presenceForKey(key) {
  const present = {
    process: bool(process.env[key]),
    env: envDot.has(key) && bool(envDot.get(key)),
    production: envProd.has(key) && bool(envProd.get(key)),
    example: envExample.has(key) && bool(envExample.get(key)),
  };
  const anywhere = present.process || present.env || present.production || present.example;
  return { ...present, anywhere };
}
function valueForKey(key) {
  const v = pickFirst([process.env, envDot, envProd, envExample], key);
  return typeof v === 'string' ? v : undefined;
}

// ---------- Build endpoint map ----------
const apiDir = path.join(ROOT, 'src', 'pages', 'api');
const routeFiles = listFiles(apiDir, ['.ts', '.js', '.mjs']).filter((p) => !p.endsWith('.d.ts'));
const endpoints = [];
for (const f of routeFiles) {
  const txt = readText(f); if (!txt) continue;
  const route = deriveApiRoute(ROOT, f);
  const methods=[]; let m; while((m=methodRe.exec(txt))) methods.push(m[1]);
  const deps=detectDependencies(f, txt);
  const reqKeys = uniq(deps.flatMap((d)=> (INTEGRATION_KEYS[d] && INTEGRATION_KEYS[d].required) ? INTEGRATION_KEYS[d].required : []));
  const optKeys = uniq(deps.flatMap((d)=> (INTEGRATION_KEYS[d] && INTEGRATION_KEYS[d].optional) ? INTEGRATION_KEYS[d].optional : []));
  const missing = reqKeys.filter((k)=>!presenceForKey(k).anywhere);
  endpoints.push({ file: path.relative(ROOT, f), route, methods: uniq(methods), deps, requiredKeys: reqKeys, optionalKeys: optKeys, missingKeys: missing });
}

// ---------- Discover all keys ----------
const declaredKeys = discoverEnvKeysFromEnvTs(ROOT);
const discoveredKeys = uniq([...declaredKeys, ...discoverEnvKeysFromSource(ROOT)]).sort();

// ---------- Optional: live checks with --ping ----------
const doPing = process.argv.includes('--ping') || process.argv.includes('-p');

async function checkSupabase() {
  const url = valueForKey('SUPABASE_URL') || valueForKey('PUBLIC_SUPABASE_URL');
  const service = valueForKey('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return { status: 'skip', info: 'missing url or service key' };
  try {
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.from('orders').select('id').limit(1);
    if (error) throw error;
    const len = (data && data.length) ? data.length : 0;
    return { status: 'ok', info: `${len} rows` };
  } catch (e) {
    return { status: 'fail', info: String((e && e.message) || e) };
  }
}
async function checkStripe() {
  const key = valueForKey('STRIPE_SECRET_KEY');
  if (!key) return { status: 'skip', info: 'missing STRIPE_SECRET_KEY' };
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(key);
    const prices = await stripe.prices.list({ limit: 1 });
    const len = (prices && prices.data && prices.data.length) ? prices.data.length : 0;
    return { status: 'ok', info: `${len} prices` };
  } catch (e) {
    return { status: 'fail', info: String((e && e.message) || e) };
  }
}
async function checkResend() {
  const key = valueForKey('RESEND_API_KEY');
  if (!key) return { status: 'skip', info: 'missing RESEND_API_KEY' };
  try {
    const https = require('https');
    const res = await new Promise((resolve, reject) => {
      const req = https.request('https://api.resend.com/domains', { method: 'GET', headers: { Authorization: `Bearer ${key}` } }, (r) => {
        let data=''; r.on('data',(c)=>data+=c); r.on('end',()=>resolve({ statusCode: r.statusCode, body: data }));
      });
      req.on('error', reject); req.end();
    });
    if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300) return { status: 'ok', info: 'reachable' };
    return { status: 'fail', info: `HTTP ${res.statusCode}` };
  } catch (e) { return { status: 'fail', info: String((e && e.message) || e) }; }
}
async function checkVercel() {
  const token = valueForKey('VERCEL_TOKEN');
  if (!token) return { status: 'skip', info: 'missing VERCEL_TOKEN' };
  try {
    const https = require('https');
    const res = await new Promise((resolve, reject) => {
      const req = https.request('https://api.vercel.com/v9/projects', { method: 'GET', headers: { Authorization: `Bearer ${token}` } }, (r) => {
        let data=''; r.on('data',(c)=>data+=c); r.on('end',()=>resolve({ statusCode: r.statusCode, body: data }));
      });
      req.on('error', reject); req.end();
    });
    if ((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300) return { status: 'ok', info: 'reachable' };
    return { status: 'fail', info: `HTTP ${res.statusCode}` };
  } catch (e) { return { status: 'fail', info: String((e && e.message) || e) }; }
}
function checkGoogle() {
  const email = valueForKey('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const pk = valueForKey('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  if (!email && !pk) return { status: 'skip', info: 'missing SA email/private key' };
  if (!email || !pk) return { status: 'warn', info: 'partial config' };
  const looksLikeKey = /BEGIN PRIVATE KEY/.test(pk) || (pk || '').includes('\\n') || (pk || '').length > 40;
  return { status: looksLikeKey ? 'ok' : 'warn', info: looksLikeKey ? 'format looks valid' : 'key format suspicious' };
}

(async () => {
  const envPresence = {}; const missingGlobal = new Set();
  const declaredKeys = discoverEnvKeysFromEnvTs(ROOT);
  const discoveredKeys = uniq([...declaredKeys, ...discoverEnvKeysFromSource(ROOT)]).sort();
  for (const key of discoveredKeys) envPresence[key] = presenceForKey(key);
  const perIntegration = {};
  for (const [name, spec] of Object.entries(INTEGRATION_KEYS)) {
    const miss = spec.required.filter((k) => !presenceForKey(k).anywhere);
    perIntegration[name] = { required: spec.required, optional: spec.optional, missing: miss };
    for (const k of miss) missingGlobal.add(k);
  }
  for (const ep of endpoints) for (const k of ep.missingKeys) missingGlobal.add(k);

  const checks = {};
  if (doPing) {
    checks.supabase = await checkSupabase();
    checks.stripe = await checkStripe();
    checks.resend = await checkResend();
    checks.vercel = await checkVercel();
    checks.google = checkGoogle();
  }

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
    checks,
    meta: { generatedAt: new Date().toISOString(), ping: !!doPing },
  };

  const outPath = path.join(ROOT, 'scripts', 'backend_audit_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

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
    for (const [name, res] of Object.entries(checks)) {
      const color = res.status === 'ok' ? '\x1b[32m' : (res.status === 'warn' || res.status === 'skip') ? '\x1b[33m' : '\x1b[31m';
      console.log(`  • ${name.padEnd(10)} ${color}${res.status.toUpperCase()}\x1b[0m  ${res.info || ''}`);
    }
  } else {
    console.log(`\n(Use --ping to perform live API checks for Supabase, Stripe, Resend, Vercel)`);
  }

  console.log(`\n🧾 Report written to scripts/backend_audit_report.json\n`);
})();
