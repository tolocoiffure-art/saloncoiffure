import fs from "fs";
import path from "path";

const report = {};

// ---------- helpers ----------
function logResult(key, status, info = "") {
  report[key] = { status, info };
  console.log(`${status === "ok" ? "✅" : status === "warn" ? "⚠️" : "❌"} ${key} ${info}`);
}

// ---------- ENV ----------
const requiredKeys = [
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VERCEL_TOKEN",
  "RESEND_API_KEY",
];
const missing = requiredKeys.filter((k) => !process.env[k]);
logResult("env.keys", missing.length ? "warn" : "ok", missing.join(", "));

// ---------- SUPABASE ----------
try {
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const { data, error } = await supa.from("orders").select("id").limit(1);
  if (error) throw error;
  logResult("supabase.connection", "ok", `${data?.length || 0} rows`);
} catch (e) {
  logResult("supabase.connection", "fail", e.message);
}

// ---------- STRIPE ----------
try {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const prices = await stripe.prices.list({ limit: 1 });
  logResult("stripe.connection", "ok", `${prices.data.length} prices`);
} catch (e) {
  logResult("stripe.connection", "fail", e.message);
}

// ---------- EMAIL ----------
try {
  const Resend = (await import("resend")).Resend;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const domains = await resend.domains.list();
  logResult("email.connection", "ok", `${domains.data?.length || 0} domains`);
} catch (e) {
  logResult("email.connection", "fail", e.message);
}

// ---------- VERCEL ----------
try {
  const res = await fetch("https://api.vercel.com/v9/projects", {
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  logResult("vercel.api", "ok", `${json.projects?.length || 0} projects`);
} catch (e) {
  logResult("vercel.api", "fail", e.message);
}

// ---------- TEMPLATE CHECK ----------
try {
  const templateDir = path.join(process.cwd(), "src", "templates");
  const exists = fs.existsSync(templateDir);
  const count = exists ? fs.readdirSync(templateDir).length : 0;
  logResult("templates.visible", exists && count ? "ok" : "warn", `${count} templates`);
} catch (e) {
  logResult("templates.visible", "fail", e.message);
}

// ---------- SUMMARY ----------
fs.writeFileSync("./scripts/runtime_report.json", JSON.stringify(report, null, 2));
console.log("🧾 Report written to scripts/runtime_report.json");
