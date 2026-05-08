# Pedro Demenagement – Phase 2 Backend & Automation

This repo now includes a minimal backend scaffold that runs on Vercel using Astro API routes.

## What’s included

- API routes (serverless):
  - `POST /api/contact` → store lead in Supabase + optional email
  - `POST /api/demo` → store demo request in Supabase
  - `POST /api/payment/checkout` → create Stripe Checkout session (one‑time or subscription) and return URL
  - `POST /api/payment/portal` → create Stripe Billing Portal session
  - `POST /api/payment/redirect` → post-checkout orchestration (Supabase + deployment)
  - `GET /api/payment/session` → verify checkout session
  - `POST /api/stripe-webhook` → verify and persist Stripe events (checkout.session.completed)
  - `POST /api/auth/signup` → Supabase email/password signup + verification email
  - `POST /api/auth/signin` → Supabase password login (returns access/refresh tokens)
  - `POST /api/auth/forgot-password` → send secure recovery link via Resend
  - `POST /api/auth/reset-password` → verify OTP token + set new password
  - `GET /api/auth/session` → validate an access token and return the current user
  - `PATCH/DELETE /api/subscriptions/[id]` → update or cancel a Stripe subscription and sync Supabase
  - `POST /api/feedback` → persist client feedback (`project_feedback` table) + notify the team
  - Backend workspace APIs (require `Authorization: Bearer <supabase access token>`)
    - `GET/POST /api/backend/clients` & `DELETE /api/backend/clients/[id]`
    - `GET/POST /api/backend/projects` & `DELETE /api/backend/projects/[id]`
    - `GET/POST /api/backend/tasks` & `DELETE /api/backend/tasks/[id]`
    - `GET/POST /api/backend/documents` plus `GET/PUT/DELETE /api/backend/documents/[id]`
    - `GET/POST /api/backend/invoices` & `DELETE /api/backend/invoices/[id]`
    - `GET /api/backend/dashboard/summary` → aggregates metrics for `/app`
    - `GET/POST /api/backend/team` & `GET/PATCH/DELETE /api/backend/team/[id]` → roster management via `agency_members`
- Utilities:
  - `src/lib/env.ts` → safe env access
  - `src/lib/supabase.ts` → Supabase admin/anon clients
  - `src/lib/stripe.ts` → on‑demand Stripe client
  - `src/lib/email.ts` → Resend email sender (welcome/reset/feedback helpers)
  - `src/pages/api/auth/*` → production-ready Supabase auth flows
  - `src/pages/api/subscriptions/[id].ts` → subscription lifecycle automation
  - `src/pages/api/feedback.ts` → structured revision requests + alerting
- Database schema: `db/schema.sql`
- Env template: `.env.example`
- Runtime verifier: `node -r dotenv/config scripts/runtime_check.js`

## Database layout

`db/schema.sql` now provisions the full workspace schema:

- `agencies` / `agency_members` → tenancy + team directory
- `clients`, `projects`, `tasks`, `documents`, `invoices` → operational data surfaced in `/app`
- `activities` → audit log entries written by the backend APIs
- Existing tables (`orders`, `webhooks`, `project_feedback`, etc.) remain untouched

## Configure

1) Copy `.env.example` → `.env` and set values (Supabase, Stripe, Resend, Vercel).
2) Install missing SDKs if needed: `npm install resend` (already in package-lock for CI).
3) Create Stripe Prices for Essential/Advanced/Care, then set `PRICE_*` IDs.
4) Create a Stripe webhook endpoint that points to `/api/stripe-webhook` and set `STRIPE_WEBHOOK_SECRET`.
5) Create a Supabase project and run `db/schema.sql` (SQL editor) to create tables – includes `project_feedback`.
6) Set the same env vars in Vercel Project Settings → Environment Variables.
7) Run `node -r dotenv/config scripts/runtime_check.js` locally to validate connectivity before deploy.
8) When using the `/app` portal locally, store the Supabase session returned by `/api/auth/signin`:
   ```js
   localStorage.setItem('pedrodemenagement:accessToken', '<access_token>');
   localStorage.setItem('pedrodemenagement:refreshToken', '<refresh_token>');
   ```
   (The helper in `src/utils/backend/api.ts` reads these keys for every authenticated fetch.)

## Deploy

- The adapter is `@astrojs/vercel` with `output: "hybrid"`, so pages remain static while API routes run as serverless functions.
- When env vars are absent, routes return safe 501/200 responses without breaking build.

## Example calls

- Create checkout session:
  `POST /api/payment/checkout` → `{ plan: "essential"|"advanced"|"care79" }`
- Open billing portal:
  `POST /api/payment/portal` → `{ customerId: "cus_..." }`
- Lead:
  `POST /api/contact` → `{ name, email, company, message }`

## Next steps

- Add auth (Supabase Auth) and a simple `/app` portal listing projects
- Extend webhook handling to create/update client/project rows
- Add scheduled tasks (Vercel Cron) for reminders and monitoring

