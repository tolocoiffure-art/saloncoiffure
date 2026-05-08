import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteCacheDir = path.join(process.env.TMPDIR || '/tmp', 'tolocoiffure-vite-cache');

export default defineConfig({
  site: 'https://tolocoiffure.ch',
  base: '/',
  trailingSlash: 'never',
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind({ applyBaseStyles: false })],
  vite: {
    cacheDir: viteCacheDir,
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
        'astrowind:config': path.resolve(__dirname, 'src/mocks/astrowind-config.ts'),
      },
    },
    server: {
      host: true,
      allowedHosts: ['tolocoiffure.ch', 'www.tolocoiffure.ch'],
    },
  },
});
