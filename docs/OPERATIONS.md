# Operations checklist

Pedro Demenagement now connects the Astro admin portal with Supabase, Stripe, Google Docs/Drive and Resend. This document lists the
manual plumbing required before onboarding paying customers.

## 1. Environment variables

Set these variables in `.env`, on your hosting provider and in GitHub/Vercel/Netlify projects:

| Key | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project REST URL. |
| `SUPABASE_ANON_KEY` | Public anon key for browser auth endpoints. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used by backend API routes. |
| `RESEND_API_KEY` | API key used for transactional emails (welcome, password reset, tickets). |
| `STRIPE_SECRET_KEY` | Stripe secret key (2024-06-20 API version). |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret for `/api/stripe-webhook`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email with Docs + Drive scopes. |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Private key (replace `\n` with real newlines). |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Folder where client workspaces are provisioned. |
| `GOOGLE_DOCS_SECTION_TEMPLATE_ID` | Optional doc template duplicated for each site (leave blank to create empty docs). |
| `SUPPORT_EMAIL` | Outbound email used for ticket notifications (defaults to contact@lausannedemenagement.ch). |
| `SENDER_NAME` | Display name for transactional emails. |

Run `npm run check` locally after updating the environment to validate required keys.

## 2. Supabase setup

1. Import `db/schema.sql` into your Supabase SQL editor. It creates tables for agencies, CRM entities, websites, sections,
   support requests and subscription events.
2. In the **Auth** settings, enable email/password signups and supply your custom SMTP (or leave Supabase defaults if you want
   Supabase to deliver confirmation emails). Our API still sends branded emails via Resend.
3. Under **Authentication → Redirect URLs**, whitelist `https://pedrodemenagement.ch/auth/callback` and your local URL
   `http://localhost:4321/auth/callback`.
4. Add Row Level Security policies allowing service role access for the backend tables if you are using RLS (the schema keeps it
   simple by assuming the service role key is used server-side).

## 3. Google Workspace automation

* Create a service account inside Google Cloud, enable the **Google Docs API** and **Google Drive API** and grant domain-wide
  delegation if you manage a Workspace domain.
* Share the parent folder (defined by `GOOGLE_DRIVE_PARENT_FOLDER_ID`) with the service account email so it can create folders and
  copy templates.
* (Optional) Prepare a Google Doc template that already includes placeholders for the sections you expect. The ID becomes
  `GOOGLE_DOCS_SECTION_TEMPLATE_ID`.
* Each new website created in `/app/websites` provisions a folder and document automatically, synchronises headings into the
  portal and keeps the content editable in Google Docs for your customers.

## 4. Stripe plumbing

* Configure products/prices inside Stripe that map to the IDs used in the sales flow (see `ENV.PRICE_*` entries).
* Add the `STRIPE_WEBHOOK_SECRET` from your webhook endpoint (e.g. `https://pedrodemenagement.ch/api/stripe-webhook`). The backend now
  exposes `/api/backend/subscriptions/:id` for cancel/update flows from the dashboard and stores audit events in Supabase.
* Test subscription updates by running `npm run dev` and using the dashboard (route `/app/subscriptions`).

## 5. Email deliverability

* Resend is used for account creation, password reset, project status updates, subscription notifications and support tickets.
  Once `RESEND_API_KEY` is configured you should set up a verified sender domain and update `SUPPORT_EMAIL` accordingly.
* If you prefer Supabase’s built-in SMTP, adjust `src/lib/email.ts` to route through your provider instead of Resend.

## 6. Recommended cron / automation

* Configure Supabase scheduled functions or an external cron (GitHub Actions, n8n, Zapier) to hit
  `/api/backend/websites/:id` with `{ "syncFromDoc": true }` after clients modify their Google Doc so sections stay up to date.
* Use Zapier or Stripe Billing automation to create support tickets automatically when invoices are unpaid or when an upsell is
  purchased. The new `/api/backend/support` endpoints accept JSON payloads that can be triggered by webhooks.

## 7. Smoke tests

After configuring everything run:

```bash
npm install
npm run check
npm run dev
```

Log in via `/auth/signin`, create a website, trigger a support ticket and verify emails appear in your Resend dashboard.
