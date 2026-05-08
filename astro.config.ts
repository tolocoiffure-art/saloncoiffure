// astro.config.ts
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import icon from "astro-icon";
import tailwind from "@astrojs/tailwind";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteCacheDir = path.join(process.env.TMPDIR || "/tmp", "astro-pedrodemenagement-vite-cache");

export default defineConfig({
  site: "https://pedrodemenagement.ch",
  base: "/",
  trailingSlash: "never",
  output: "server",
  adapter: vercel({
    mode: "serverless",
    runtime: "nodejs20.x",
  }),
  // prerender is typically disabled when using serverless output
  // prerender: true,
  integrations: [tailwind({ applyBaseStyles: false }), icon()],
  vite: {
    cacheDir: viteCacheDir,
    resolve: {
      alias: {
        "astrowind:config": path.resolve(
          __dirname,
          "src/mocks/astrowind-config.ts"
        ),
      },
    },
    build: {
      rollupOptions: {
        // 👇 add googleapis here
        external: ["stripe", "googleapis"],
      },
    },
    server: {
      host: true,
      allowedHosts: [
        "debarraslausanne.ch",
        "www.debarraslausanne.ch",
        "lausannedemenagement.ch",
        "www.lausannedemenagement.ch",
        "demenagementurgent.ch",
        "www.demenagementurgent.ch",
        "pedrodemenagement.ch",
        "www.pedrodemenagement.ch",
        "transportmeubles.ch",
        "www.transportmeubles.ch",
        "videmaison.ch",
        "www.videmaison.ch",
        "videsuccession.ch",
        "www.videsuccession.ch",
        "nettoyagesuccession.ch",
        "www.nettoyagesuccession.ch",
        "etatdeslieuxlausanne.ch",
        "www.etatdeslieuxlausanne.ch",
        "lausannenettoyage.ch",
        "www.lausannenettoyage.ch",
        "laclemanexperience.ch",
        "www.laclemanexperience.ch",
        "maisoncortes.ch",
        "www.maisoncortes.ch",
        "ateliermemoire.ch",
        "www.ateliermemoire.ch",
        "tonsiteweb.ch",
        "www.tonsiteweb.ch",
        "tonwebsite.ch",
        "www.tonwebsite.ch",
        "tolocoiffure.ch",
        "www.tolocoiffure.ch",
      ],
    },
  },
});
