# Stale Saturn

Legacy static Astro site kept in this repository as a reference snapshot of an older AstroWind-based setup.

This folder is not the active Tolo Coiffure site. The live Tolo Coiffure implementation is managed from the repository root. `stale-saturn/` exists as a self-contained static project for reference, comparison, or reuse of older layouts and content patterns.

## What this folder contains

- Standalone `Astro 5` static site
- Tailwind-based widget and layout system
- Blog routes and markdown content
- Local vendor integration under `vendor/integration`
- Independent config, build scripts, and deploy files

## Key files

| Path | Purpose |
| --- | --- |
| `stale-saturn/astro.config.ts` | Astro config for the static subproject |
| `stale-saturn/src/config.yaml` | Site metadata and app toggles |
| `stale-saturn/src/pages/` | Static pages, blog routes, and landing pages |
| `stale-saturn/src/components/` | Reusable widgets and UI components |
| `stale-saturn/vendor/integration/` | Local AstroWind-style integration code |
| `stale-saturn/vercel.json` | Vercel deployment config |
| `stale-saturn/netlify.toml` | Netlify deployment config |

## Local usage

Run commands from `stale-saturn/`:

```bash
cd stale-saturn
npm install
npm run dev
```

Default local URL:

```text
http://localhost:4321/
```

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the static site |
| `npm run preview` | Preview the production build |
| `npm run check` | Run Astro, ESLint, and Prettier checks |
| `npm run fix` | Auto-fix linting and formatting issues |

## Important context

- This subproject still contains the original AstroWind-oriented sample content and metadata in `src/config.yaml` and page content.
- It should be treated as legacy/reference code unless you explicitly want to revive or customize it as a separate site.
- Documentation for the active Tolo Coiffure site is in the root `README.md`.
