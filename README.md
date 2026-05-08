# Tolo Coiffure

Website for `tolocoiffure.ch`, a hair salon in Lausanne built with `Astro 5`, `Tailwind CSS`, and the Vercel serverless adapter.

This codebase is documented as the Tolo Coiffure site, with custom content, curated salon imagery, booking links, and clean production routing.

## Overview

- Editorial homepage for Tolo Coiffure
- Services and pricing for women and men
- Atelier and gallery pages driven by local image assets
- Contact page with Calendly, WhatsApp, email, address, hours, and Google Maps
- Host-aware routing for `tolocoiffure.ch`
- Optional Swiss-only access control in production

## Routing

Source pages live in `src/pages/tolo-coiffure/`, while visitors use clean URLs:

- `/`
- `/services`
- `/atelier`
- `/galerie`
- `/contact`

`src/middleware.ts` rewrites those clean URLs internally to the Tolo Coiffure page files and redirects `/tolo-coiffure/*` paths back to their canonical public URLs.

## Key files

| Path | Purpose |
| --- | --- |
| `src/tenants/tolo-coiffure/config.ts` | Domain, booking links, phone, email, address, Google Maps |
| `src/tenants/tolo-coiffure/content.ts` | Homepage copy and testimonials |
| `src/tenants/tolo-coiffure/services.ts` | Service catalog and CHF pricing |
| `src/tenants/tolo-coiffure/gallery.ts` | Image loading, alt text, ordering, gallery curation |
| `src/pages/tolo-coiffure/*.astro` | Public Tolo Coiffure pages |
| `src/middleware.ts` | Canonical routing and Swiss-only access logic |
| `astro.config.ts` | Astro, Tailwind, Vercel, and allowed host configuration |

## Stack

- `Astro 5`
- `Tailwind CSS`
- `@astrojs/vercel`
- `astro:assets` with `sharp` for optimized images

## Local development

Prerequisites:

- `Node.js 20.x`
- `npm`

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:4321/`.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local Astro dev server |
| `npm run build` | Build the production site |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run Astro, ESLint, and Prettier checks |
| `npm run fix` | Auto-fix linting and formatting issues |
| `npm run test` | Run the test suite |

## Content updates

Use these files for routine edits:

- Update salon copy and testimonials in `src/tenants/tolo-coiffure/content.ts`
- Update services and prices in `src/tenants/tolo-coiffure/services.ts`
- Update booking links, address, phone, or email in `src/tenants/tolo-coiffure/config.ts`
- Update opening hours in `src/pages/tolo-coiffure/contact.astro`
- Add or replace images in `src/assets/tolocoiffure_images/`

## Deployment notes

- Production uses the Vercel adapter in serverless mode.
- Swiss-only access is enabled in production unless `SWISS_IP_ONLY=0`.
- `SWISS_IP_BYPASS_TOKEN` can be used for controlled bypass testing when geo-restriction is active.

## Note on repository history

This repository still contains shared or older tenant code for other projects, but the active middleware and public routing are currently wired to Tolo Coiffure.
