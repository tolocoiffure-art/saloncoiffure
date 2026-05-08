# Multi‑Tenant Architecture & Tenant Readiness Report

_Last updated: 2026‑01‑18 — scope: Astro multi‑brand stack (Pedro Déménagement + TonSiteWeb)_

## 1) High‑level summary
- The codebase is a single Astro 5 server‑rendered app with host‑based tenant resolution and optional path prefixes (`middleware.ts` + `src/lib/tenants.ts`).
- Tenants map 1:1 to brands (`BRANDS`), except for TonSiteWeb (productized site builder) and Maison Cortes (special archive path).
- All tenants share layouts, components, assets, and API routes; tenant context is passed via `Astro.locals.tenant`.
- Supabase is the default data plane (leads, websites, sections), plus optional email via Resend and Stripe for checkout mocks.
- Current risk: lead capture for the core proof tenant (`lausannedemenagement`) still uses a `mailto:` fallback instead of posting to `/api/contact` → no Supabase persistence, no confirmation emails.

## 2) Repository map (operationally relevant)
```
/astro.config.ts              # Vercel serverless output, cacheDir=.vite-cache
/middleware.ts                # Tenant/host resolution, path prefixing, site-fallback resolver
/src/lib
  ├─ tenants.ts               # Tenant registry (host, path, query), basePath handling
  ├─ brand.ts / brands.config # Brand keys, domain mapping, theme + contact info
  ├─ locale.ts                # Locale resolution; detectRequestLocale for APIs
  ├─ env.ts                   # Typed env loader (Supabase, Resend, Stripe, Zapier, etc.)
  ├─ website-resolver.ts      # Supabase-backed per-customer website resolver for fallback sites
  └─ email.ts / email-templates.ts # Notifications + confirmations via Resend
/src/pages
  ├─ index.astro / pricing.astro / services.astro / contact.astro  # Brand-aware pages
  ├─ maison-cortes/*          # Niche archive tenant
  ├─ atelier-memoire/*        # Tenant with fixed basePath /atelier-memoire
  ├─ tonsiteweb/*             # Public pages (fr/en/de/it) + app/* dashboard shells
  ├─ api/*                    # JSON/HTML endpoints (contact, checkout, auth, etc.)
  └─ __site/[...path].astro   # Fallback renderer for customer sites (Supabase content)
/src/components
  ├─ widgets/*                # Shared sections (Hero, Pricing, Steps, Contact, etc.)
  ├─ ui/Form.astro            # Multi-step form renderer (currently mailto default)
  └─ common/*                 # Meta, analytics, scripts
/public                       # Static assets & favicons
/data / vendor / scripts      # Inventory, integration helpers, ops scripts
```

## 3) Tenant roster & value
- **pedro** (default): Baselined moving brand; fallback for unknown hosts; full marketing pages + APIs.
- **lausanne / lausannedemenagement.ch**: Proof that host-based tenanting works for a sibling brand; localized FR/EN/DE/IT copy; pricing/services/contact routes reuse shared components. Lead flow still mailto (should be `/api/contact`).
- **urgent / debarras / transport / videmaison / videsuccession / nettoyagesuccession / lausannenettoyage / etatdeslieux**: Verticalized variants using the same skeleton; pricing/services tuned per brand type; contact shares the same mailto form.
- **laclemanexperience**: Luxury “experience” tenant with multilingual forms and bespoke copy; uses Supabase-aware `contact.astro` config (hidden fields set to tenant, locale).
- **maisoncortes**: Archived microsite under `/maison-cortes`; uses dedicated redirect in `middleware.ts`.
- **ateliermemoire**: Dedicated base path `/atelier-memoire` enforced by middleware + page-level guards.
- **tonsiteweb**: Productized multi-lingual offering with:
  - Marketing pages per locale (home, pricing, services, contact, about, choose-template).
  - Dashboard shells under `/tonsiteweb/<locale>/app/*` that import shared backend pages (`src/pages/app/*.astro`).
  - Checkout/contact APIs: `/api/contact`, `/api/checkout.ts` (Stripe), `/api/domains/*`, `/api/backend/*`, etc.
  - Supabase website resolver (`__site/[...path].astro`) for client sites on custom domains.

## 4) Tenant resolution flow (runtime)
1. `middleware.ts`
   - Calls `resolveTenantFromRequest()`:
     - Host match > query param `?tenant=` > first path segment > fallback to `pedro`.
     - Applies `tenant.basePath` (strip or prepend) unless `preserveBasePath` is true.
     - Blocks Atelier Mémoire hosts from hitting generic pages; normalizes TonSiteWeb legacy prefixes.
   - Sets `Astro.locals.tenant` and forwards `x-tenant-id`.
   - If no tenant match and a Supabase website exists for the host, rewrites to `/__site/*` with `x-website-id`.
2. Pages and APIs read `Astro.locals.tenant` (or recompute from host) to:
   - Pick brand styling (`PageLayout`, CSS vars).
   - Select locale (brand-specific default).
   - Render tenant-specific views (hero/pricing/options).
   - Persist tenant_id on Supabase writes.

## 5) HTTP surface (stable & expected)
### Public pages (per tenant unless redirected)
- `GET /` — Home (brand-aware hero, FAQs, CTA to contact).
- `GET /pricing` — Brand-type pricing matrices; language-aware for lausanne/laclemanexperience.
- `GET /services` — Offering catalog per brand type.
- `GET /contact` — Lead form; **currently posts to mailto unless overridden**.
- `GET /choose-template` — Template picker (shared, brand-skinned).
- `GET /thank-you` — Post-form confirmation.
- Tenant-specific bases:
  - `/atelier-memoire/*` guarded.
  - `/maison-cortes/*` archived catalog.
  - `/tonsiteweb/*` localized marketing + `/tonsiteweb/<locale>/app/*` dashboard shells.

### API routes (server output = serverless entrypoints)
- Leads & comms:
  - `POST /api/contact` — Rate-limited; saves to Supabase `leads`; emails via Resend; redirects to `/thank-you` for HTML forms; JSON response for XHR.
  - `POST /api/feedback` — Stores feedback; locale-aware.
  - `POST /api/demo` — Demo intake, Supabase + email.
- Auth:
  - `POST /api/auth/forgot-password` — Supabase admin link + Resend; locale detection fixed.
  - `POST /api/auth/reset-password` — Password reset handler.
- Checkout & billing:
  - `POST /api/checkout` — Stripe session creation (mock/real depending on env); used by TonSiteWeb.
  - `POST /api/stripe-webhook` — Stripe webhook endpoint.
- Domains & sites (TonSiteWeb):
  - `/api/domains/*`, `/api/backend/*`, `/api/subscriptions/*`, `/api/payment/*` — Domain provisioning, backend CRUD, subscriptions.
  - `GET /__site/*` (via middleware rewrite) — Renders Supabase-backed customer sites.
- Atelier Mémoire:
  - `/api/atelier-memoire/*` — Photo restoration workflow endpoints.
- Health & misc:
  - `GET /api/health` — Liveness.
  - `GET /api/[tenant]/` — Tenant-specific helpers.

### Forms & CTAs (expected behavior)
- **Desired baseline (all brands):** HTML form `action="/api/contact"` `method="post"` with hidden `tenant` + `source`; JS/XHR may use JSON to `/api/contact`.
- **Current reality:**
  - `src/components/ui/Form.astro` defaults to `action="mailto:contact@lausannedemenagement.ch"` and `encType="text/plain"`, so all brand marketing forms open the mail client instead of hitting Supabase.
  - TonSiteWeb marketing/dashboards already use APIs (Stripe checkout mock, domain CRUD).
  - Lac Léman Experience contact builds hidden fields for tenant/locale but still relies on the shared Form component; needs explicit action override.

## 6) Tenants deep-dive
### TonSiteWeb (product tenant)
- **Value:** Demonstrates multi-locale marketing + SaaS dashboard shells + checkout; showcases reusable backend pages (`src/pages/app/*.astro`) via locale wrappers (`src/pages/tonsiteweb/<lang>/app/*.astro`).
- **Routes:**
  - Marketing: `/tonsiteweb/<lang>/(home|pricing|services|contact|about|choose-template|terms|privacy|thank-you)`.
  - Dashboard shells: `/tonsiteweb/<lang>/app/(index|clients|documents|invoices|orders|projects|settings|subscriptions|support|tasks|websites)`.
  - APIs: contact, checkout, domains, backend support, subscriptions, payment, auth.
- **Data flows:** Supabase for websites/domains/sections; Stripe for checkout (mock/real); Resend for emails; Zapier optional.
- **Gaps / next:** Harden dashboard pages (currently static shells), add auth guard, connect app routes to live Supabase CRUD, ensure locale propagation on API calls, add tests around `resolveTonSiteWebComponent`.

### Lausanne Déménagement (proof tenant)
- **Value:** Validates host-based brand switching, localization (FR/EN/DE/IT) on core moving business; most visited routes: `/`, `/pricing`, `/services`, `/contact`.
- **Current issue:** Lead form uses `mailto:` from `Form.astro` → no Supabase insertion, no confirmation, no analytics.
- **Expected behavior:** Post to `/api/contact` with `tenant=lausanne`, `source=contact`, capture `name/email/phone/message`, redirect to `/thank-you`, trigger email + Zapier if configured.
- **Other notes:** Pricing/services copy already brand-aware; CTAs link to `/contact#form` and WhatsApp; data model ready to accept leads once form action is fixed.

## 7) Gaps & missing pieces (priority)
1) **Lead capture for all moving brands (especially lausannedemenagement):**
   - Set `action="/api/contact"` and `method="post"` in `Form.astro` default, or override per page.
   - Add hidden fields: `tenant`, `source`, `locale`.
   - Ensure `/contact` pages pass `encType="application/x-www-form-urlencoded"` or JSON fetch.
   - Add regression tests hitting `/api/contact` for branded tenants.
2) **TonSiteWeb app pages:**
   - Wire dashboard pages to real data (Supabase) and add auth guard.
   - Confirm Stripe mock path works end-to-end in staging (checkout + webhook).
3) **Infra hygiene:**
   - Clear root-owned `.vite-cache` to unblock local builds.
   - Add CI job to `npm run build` + minimal e2e smoke for `/pricing`, `/contact`, `/api/contact`.
4) **Localization consistency:**
   - Ensure `detectRequestLocale` is used across APIs (already added, verify callers).
   - Persist `preferredLang` handling for server redirects (currently only client-side).
5) **Maison Cortes warnings:**
   - `MaisonCortesSelectionEntry` import fixed; still need to confirm product data aligns with API responses.

## 8) Suggested next steps (investor-friendly milestone framing)
- **Milestone A — Lead Integrity (1–2 days):**
  - Patch `Form.astro` default action to `/api/contact`, wire hidden tenant/source/locale.
  - Update contact pages to pass tenant/source fields.
  - Add smoke tests: POST `/api/contact` for `lausanne`, ensure Supabase insert mock succeeds.
- **Milestone B — TonSiteWeb Demo Depth (3–5 days):**
  - Connect `/tonsiteweb/<lang>/app/*` shells to Supabase tables (clients, projects, domains).
  - Gate app routes behind session (Supabase auth) with graceful redirect to `/tonsiteweb/<lang>/auth/*`.
  - Validate Stripe mock + webhook path; add fixture runbook.
- **Milestone C — Reliability & DX (2 days):**
  - Fix build cache ownership; add CI `npm run build`.
  - Add `/health` + `/api/contact` monitors per tenant domain.
  - Backfill analytics events for form submits vs. mailto falls back.
- **Milestone D — Content & Intl (1–2 days):**
  - Audit locale fallbacks for Lausanne/Lac Léman; add missing `it/de` strings to pricing/services.
  - Surface language selector state server-side (currently client-localStorage only).

## 9) Risks & mitigations
- **Missed leads (current):** Mailto bypasses backend. _Mitigation_: enforce `/api/contact` post; Zapier/Resend hooks.
- **Multi-tenant drift:** New tenants may skip basePath/host guards. _Mitigation_: add tests for `resolveTenantFromRequest` + middleware rewrites.
- **Checkout demo fragility:** Stripe mocks may diverge. _Mitigation_: add contract tests and fixture data.
- **Content regressions on build:** Root-owned `.vite-cache` blocks local builds. _Mitigation_: clean cache, set `VITE_CACHE_DIR` env if needed.

## 10) Proof points to highlight to investors
- Host-based tenant resolution with path-prefix support already live (`middleware.ts` + `tenants.ts`).
- Shared component library renders differentiated brands with theme variables (`PageLayout` CSS vars from `brands.config.ts`).
- TonSiteWeb demonstrates the “multi-tenant as product” story: localized marketing + dashboard shells + Stripe + Supabase-powered site resolver for custom domains.
- Lac Léman Experience shows multilingual premium flow; Atelier Mémoire shows basePath isolation.
- APIs are tenant-aware, rate-limited, and email-enabled; simple to extend to additional brands.

## 11) Quick remediation plan for lausannedemenagement lead flow
- Update `src/components/ui/Form.astro` default:
  - `action="/api/contact"`, `method="post"`, `encType="application/x-www-form-urlencoded"`.
  - Append hidden inputs `tenant`, `source` (`contact`), `locale`.
- In `contact.astro`, pass `action="/api/contact"` explicitly until default is updated.
- Validate with `curl -X POST http://localhost:4321/api/contact -d "name=Test&email=test@example.com&message=Hi&tenant=lausanne"`.
- Deploy; confirm Supabase `leads` table receives entries, Resend emails sent, redirect to `/thank-you`.

## 12) Architecture blueprint (stack & runtime)
- **Framework:** Astro 5 (SSR, output=serverless), Tailwind, astro-icon, @astrolib/seo.
- **Runtime target:** Vercel serverless (Node 20) with `@astrojs/vercel`; serverless entry point at `dist/server/entry.mjs`.
- **Middleware:** `middleware.ts` performs tenant resolution, basePath rewrite, host guards, and fallback site resolution via Supabase.
- **Data plane:** Supabase (Postgres) accessed via `getSupabaseAdmin` / `getSupabaseAnon`; tables: `leads`, `websites`, `website_domains`, `website_sections`, selection/reservation tables for Maison Cortes, support tables for TonSiteWeb.
- **Email:** Resend via `src/lib/email.ts` + templates; fallback to no-op if env not set.
- **Payments:** Stripe SDK imported (externalized in Vite) used by checkout routes; currently mock/stub-friendly.
- **Domains:** Domain resolution + provisioning under `api/domains` (TonSiteWeb).
- **Analytics:** astrowind config provides baseline; custom events pending.
- **Localization:** `resolveLocaleFromRequest` (pages), `detectRequestLocale` (APIs); accepts FR/EN/DE/IT (+AR/ZH for LCE).
- **Asset strategy:** Remote image inventory (`data/imageInventory.ts`) and static `/public`; Tailwind JIT for styles.
- **Caching:** Vite cache at `.vite-cache`; currently root-owned on host—needs cleanup to allow builds.
- **CLI tooling:** `npm run dev/build/preview/check/test/smoke` with Astro check + ESLint + Prettier.

## 13) Tenant route table (what exists vs. expected)
| Tenant | Base | Key pages | CTAs | Forms target | Expected API hookup | Notes |
|--------|------|-----------|------|---------------|---------------------|-------|
| pedro (default) | / | /, /pricing, /services, /contact, /choose-template, /thank-you | Contact, WhatsApp | **mailto (current)** | `/api/contact` | Should align with Lausanne flow once fixed |
| lausanne | / | Same as pedro + localized | Contact, WhatsApp | **mailto (current)** | `/api/contact` | Proof brand; needs lead pipeline fix |
| urgent | / | Urgent pricing/services/contact | Call, contact form | mailto | `/api/contact` | High-priority SLA copy |
| transport | / | Transport pricing/services/contact | Booking CTA | mailto | `/api/contact` | Stripe not used |
| debarras | / | Debarras pricing/services/contact | Contact | mailto | `/api/contact` | |
| videmaison | / | Vide maison pricing/services/contact | Contact | mailto | `/api/contact` | |
| videsuccession | / | Succession pricing/services/contact | Contact | mailto | `/api/contact` | |
| nettoyagesuccession | / | Nettoyage pricing/services/contact | Contact | mailto | `/api/contact` | |
| lausannenettoyage | / | Nettoyage pricing/services/contact | Contact | mailto | `/api/contact` | |
| etatdeslieux | / | Etat des lieux pricing/services/contact | Contact | mailto | `/api/contact` | |
| laclemanexperience | / | Premium experience pages + contact | Concierge CTA | mailto (with hidden fields) | `/api/contact` | Needs explicit action |
| maisoncortes | /maison-cortes | Archive catalog | Selection | `/api/maison-cortes/select` | Already API-backed |
| ateliermemoire | /atelier-memoire | Dedicated pages (fr/de/it/etc) | Contact | mailto | `/api/contact` | BasePath enforced |
| tonsiteweb | /tonsiteweb | Marketing + dashboard shells | Checkout, contact, signup | API-backed | `/api/contact`, `/api/checkout`, `/api/domains`, `/api/backend` | Most complete tenant |

## 14) API contract quick reference
- **POST /api/contact**
  - Inputs: `name`, `email`, `company?`, `message`, `source`, `tenant`, optional JSON vs form.
  - Behavior: Rate limit; insert `leads` (tenant_id); send notification + confirmation email if Resend configured; optional Zapier webhook; redirect 303 to `/thank-you` on HTML form.
  - Gaps: Marketing forms not posting here by default.
- **POST /api/feedback**
  - Inputs: `message`, `page`, `locale`; inserts into feedback store.
- **POST /api/demo**
  - Inputs: `name`, `email`, `company`, `template`, `plan`; inserts into Supabase + email.
- **POST /api/checkout**
  - Inputs: plan info; creates Stripe session (mock/real).
  - Used by TonSiteWeb pricing CTA.
- **POST /api/stripe-webhook**
  - Stripe signature validation; updates subscription state (TonSiteWeb).
- **Auth routes:** `/api/auth/forgot-password`, `/api/auth/reset-password` — Supabase admin link + email templates; locale-aware.
- **Domain/site routes:** `/api/domains/*`, `/api/backend/*`, `/api/subscriptions/*`, `/api/payment/*` — TonSiteWeb site/domain management.
- **Maison Cortes selection:** `/api/maison-cortes/select` — adds/removes reserved SKUs; cookie-based selection TTL.
- **Atelier Mémoire:** `/api/atelier-memoire/*` — processing pipeline (not fully documented here; confirm in code before go-live).
- **Health:** `/api/health` — liveness check.

## 15) Supabase schema snapshot (practical)
- `leads` (id, name, email, company, message, source, tenant_id, created_at)
- `websites` (id, slug, name, status, plan, domain, preview_url, production_url, google_doc_id, google_folder_id, template_key, metadata, agency_id, client_id, created_at)
- `website_domains` (id, website_id, domain, is_primary, created_at)
- `website_sections` (id, website_id, section_key, heading, content, media, google_doc_id, google_doc_heading, created_at)
- `reservations` / selection tables (Maison Cortes) — hold sku, reservationId, ttl
- Support tables for backend (tickets, orders, tasks) expected for TonSiteWeb — verify before wiring dashboards.
- Auth handled by Supabase Auth (email magic links).

## 16) Environment variable contract (must-have for prod)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (admin), `SUPABASE_ANON_KEY` (client)
- `RESEND_API_KEY` (email)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SITE_URL` / `PUBLIC_SITE_URL` / `ORIGIN` (canonical)
- `SUPPORT_EMAIL`, `SENDER_EMAIL`, `SENDER_NAME`
- `ZAPIER_WEBHOOK_URL` (optional)
- `GOOGLE_*` (Docs/Drive automation for TonSiteWeb content intake)
- `DOMAIN_ROOT` (for subdomain-based site resolution)
- `DEPLOY_AUTOMATION_ENABLED`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (if using CI deploy script)

## 17) Build & deploy runbook (prod)
1) Pre-flight
   - Ensure `.vite-cache` ownership is clean or set `VITE_CACHE_DIR`.
   - `npm ci`
   - `npm run check` (astro check + eslint + prettier)
   - `npm run test` (unit; add e2e once available)
2) Build
   - `npm run build` (output=server)
   - Verify warnings: Maison Cortes prerender notices (intentional SSR), externalized deps (`stripe`, `googleapis`).
3) Package for Vercel
   - `vercel build` or rely on Astro adapter output under `.vercel/output`.
4) Deploy
   - Set env in Vercel project/teams.
   - Run smoke: `/pricing`, `/services`, `/contact`, `/api/health`, `/api/contact` (form POST).
5) Post-deploy
   - Check Supabase `leads` table for inserts.
   - Trigger Stripe mock session (TonSiteWeb pricing).
   - Validate `__site` rewrite by hitting a known Supabase website domain.

## 18) Local dev runbook
- `npm run dev -- --host --port 4321`
- Host simulation: `curl -H "Host: lausannedemenagement.ch" http://localhost:4321/pricing`
- Clean cache (if root-owned): `sudo rm -rf .vite-cache` or `VITE_CACHE_DIR=.cache npm run dev`
- Supabase env: set `SUPABASE_URL` + keys; without them, lead writes are skipped (no crash).
- Resend disabled by default unless key present.
- Stripe: use test keys to avoid live charges.

## 19) Observability & SLO sketch
- **Logs:** Vercel function logs; consider piping to Logflare/Datadog.
- **Metrics:** Add minimal endpoint timing + error rate (contact, checkout).
- **Alerts:** 5xx > 1% on `/api/contact`, `/api/checkout`; health endpoint down.
- **SLO targets:** 99% availability for public pages; 99.5% for `/api/contact`; p95 < 600ms for contact POST.
- **Tracing TODO:** Add request-id header from middleware, propagate to email/logs.

## 20) Security & privacy
- Rate limiting present on contact/auth/forgot — extend to checkout/domain routes.
- Supabase service key only server-side; never ship to client.
- Validate Stripe webhook signature.
- Sanitize user input before inserting to Supabase; ensure email templates escape content.
- GDPR: include DPO contact (already in privacy), add data retention policy for leads.
- CSRF: form POST to same origin; consider CSRF token for app/dashboard routes.

## 21) Detailed backlog (micro-steps to productionize)
### Lead integrity rollout (all moving brands)
- [ ] Change `Form.astro` defaults: `action="/api/contact"`, `method="post"`, `encType="application/x-www-form-urlencoded"`.
- [ ] Inject hidden inputs: `tenant`, `source`, `locale` (server-derived).
- [ ] Update `contact.astro` to pass `action`, `method`, `encType` explicitly until defaults propagate.
- [ ] Add unit test: `POST /api/contact` with form data → 303 redirect + Supabase insert stubbed.
- [ ] Add e2e smoke: headless browser fills `/contact` (lausanne host) and checks thank-you redirect.
- [ ] Add analytics event hook on submit (optional).

### TonSiteWeb app hardening
- [ ] Protect `/tonsiteweb/<lang>/app/*` with Supabase auth (server guard + client redirect).
- [ ] Wire `clients`, `projects`, `tasks`, `domains`, `websites` pages to Supabase queries.
- [ ] Implement create/edit/delete flows via JSON fetch to `/api/backend/*`.
- [ ] Add `lang` propagation to API calls; ensure `detectRequestLocale` used server-side.
- [ ] Stripe checkout smoke (test keys) + webhook verification in staging.
- [ ] Add seed scripts for demo tenants (clients, domains, projects).

### Fallback site resolver
- [ ] Ensure `getWebsiteByHost` handles www/subdomain variants (already normalizes).
- [ ] Add cache layer (memory) to reduce Supabase lookups.
- [ ] Add monitoring on `__site/*` responses (5xx/404 rates).

### Internationalization polish
- [ ] Fill missing DE/IT strings for Lausanne services/pricing.
- [ ] Server-side respect `preferredLang` cookie for redirects.
- [ ] Update SEO meta per locale (og:locale, canonical with lang prefix if used).

### Build/CI hygiene
- [ ] Fix `.vite-cache` ownership; add `.gitignore` for alt cache dir.
- [ ] Add GitHub Action: `npm ci`, `npm run check`, `npm run build`.
- [ ] Add minimal Playwright smoke (pricing/contact/checkout contact POST).

### Maison Cortes
- [ ] Validate selection API response schema vs UI.
- [ ] Add inventory test ensuring SKUs in `products` match `inventory` refs.

### Atelier Mémoire
- [ ] Confirm `/api/atelier-memoire/*` flow; add form action override to `/api/contact` if lead capture is required.

## 22) Acceptance criteria per milestone
- **Milestone A (Lead integrity):** Form POSTs hit `/api/contact`, Supabase rows created for `lausanne`, Resend emails sent in staging, thank-you redirect works, mailto removed.
- **Milestone B (TonSiteWeb depth):** Auth guard active, CRUD pages reading/writing Supabase, Stripe test checkout success, webhook updates subscription status, dashboard localized.
- **Milestone C (Reliability):** CI green on `check` + `build`; `/api/health` and `/api/contact` monitored; cache ownership fixed.
- **Milestone D (Intl):** Lausanne DE/IT pricing/services strings present; language persisted server-side; canonical/og localized.

## 23) Test matrix (high-level)
- Hosts: `lausannedemenagement.ch`, `pedrodemenagement.ch`, `tonsiteweb.ch`, `ateliermemoire.ch`, `maisoncortes.ch`.
- Routes: `/`, `/pricing`, `/services`, `/contact`, `/choose-template`, `/thank-you`, `/tonsiteweb/en/app/index`.
- APIs: `/api/contact` (form + JSON), `/api/checkout`, `/api/auth/forgot-password`, `/api/stripe-webhook` (signed), `/__site/*`.
- Locales: FR/EN/DE/IT (+ AR/ZH for LCE).
- Devices: Mobile/desktop hero rendering and CTAs.

## 24) Edge cases to cover
- Missing/invalid email on contact → 400 JSON; form shows required message.
- Contact POST without Supabase keys → still 200/303 but no insert; ensure log warns.
- Tenant host mismatch (ateliermemoire host without basePath) → middleware redirects to `/atelier-memoire`.
- TonSiteWeb legacy `/tonsiteweb` prefix on host-based tenant → middleware strips/redirects.
- `aw_lang` cookie set to unsupported value → fallback to default locale.
- Stripe webhook with invalid signature → 400, no state change.

## 25) “What’s missing” inventory (explicit)
- Form action override across all brand pages.
- Auth/session layer for TonSiteWeb dashboards.
- Automated tests (unit + e2e) covering tenant routing, contact, checkout.
- Monitoring/alerts.
- Content completeness for non-FR locales.
- Cleanup of root-owned `.vite-cache`.

## 26) Investor one-liners (positioning)
- “One Astro codebase, many revenue lines” — host-based tenanting proven with Lausanne + TonSiteWeb.
- “Leads flow to Supabase + email in one place” — once mailto is removed, everything tracks.
- “Product SKU (TonSiteWeb) already ships Stripe mock + domain stack” — needs auth to flip to paid.
- “Fallback site renderer means we can sell white-label sites on custom domains today.”

## 27) Next 48h action plan
- Day 1: Fix `Form.astro`, update contact pages, add smoke test for `/api/contact`, clear `.vite-cache`, run build.
- Day 2: Wire TonSiteWeb app routes to Supabase read-only, add auth guard stub, run Stripe test checkout, prepare demo data.

## 28) FAQ (engineering)
- **Why mailto?** Legacy default; safe to remove—API already handles rate limiting + emails.
- **Does tenant resolution work behind proxies?** Yes, uses `x-forwarded-host` then `host`.
- **Can we add a new brand?** Add to `BRANDS`, update host mapping in `brand.ts`, optional basePath in `tenants.ts`, provide assets.
- **How to render customer sites?** Supabase `websites` + `website_sections`; middleware rewrites to `/__site/*` when host matches `website_domains`.

## 29) Glossary
- Tenant: brand/site grouping resolved by host/path.
- Brand: styling + copy profile in `brands.config.ts`.
- Lead: row in `leads` Supabase table.
- Selection: Maison Cortes reserved SKU cookie.
- LCE: Lac Léman Experience.
- TSWeb: TonSiteWeb.

## 30) Printable executive summary (for quick handoff)
- Multi-tenant Astro app with proven host-based branding and shared components.
- TonSiteWeb demonstrates SaaS depth (multi-locale, checkout, domain resolver, dashboard shells).
- Core risk: mailto-based contact forms → fix by pointing to `/api/contact` with tenant metadata.
- Supabase, Resend, Stripe already integrated; deployment target is Vercel serverless.
- Clear milestones A–D to reach production-grade, with test matrix and acceptance criteria defined.

## 31) 2026-02-20 booking + contact flow updates (Lausanne)
### Backend routes & methods added
- **`GET /api/booking?date=YYYY-MM-DD`**: returns tenant-scoped availability (bookings + blocks) for the requested date, used by the Lausanne booking UI to render available slots.
- **`POST /api/booking`**: validates booking payload, checks conflicts, creates a `bookings` row in Supabase, and returns a Stripe Checkout URL (or 303 redirect for HTML form submissions).

### New backend logic + methods
- **`src/lib/booking.ts`** introduced helpers to parse booking payloads, detect conflicts, persist bookings, create Stripe checkout sessions, and finalize bookings after checkout.
- **`finalizeBookingFromSession`** is invoked from the Stripe webhook when `metadata.booking_id` is present to mark a booking as confirmed and store Stripe session data.

### Stripe webhook behavior (updated)
- **`POST /api/stripe-webhook`** now detects `checkout.session.completed` events tied to bookings (`metadata.booking_id`) and finalizes the booking record before sending booking emails.

### Email templates + senders added
- **Templates**: `booking/booking-notification` (admin) and `booking/booking-confirmation` (customer).
- **Senders**: `sendBookingNotificationEmail` (to support email) and `sendBookingConfirmationEmail` (to customer), triggered after booking confirmation in the Stripe webhook.

### Supabase schema/migrations
- **New tables**: `bookings`, `booking_blocks` with indexes for tenant + time queries.
- **RLS** enabled on the new tables. Migrations are included under `supabase/migrations/20260220000000_booking_pipeline.sql`.

### Front-end changes (Lausanne only)
- **Contact page booking section** added for Lausanne: date picker, slot selection, and booking form that posts to `/api/booking`.
- **Availability loader**: client-side JS fetches `/api/booking?date=...` and renders time slots; prevents submission if no slot selected.

### Contact form default behavior (all tenants)
- **`Form.astro`** now defaults to `action="/api/contact"` and includes hidden `tenant`, `source`, `locale` fields to persist leads in Supabase.

### Notes on completeness (current state)
- Booking flow is **live (non-mock)** end-to-end for Lausanne when Supabase + Stripe + Resend keys are configured.
- **Calendly is not integrated**; booking availability is handled in Supabase (`bookings` + `booking_blocks`) via the custom booking endpoint.
