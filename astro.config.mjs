import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE ?? 'https://fishered.github.io/Leo_Blog';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  integrations: [sitemap()],
  vite: {
    server: {
      watch: {
        ignored: [
          '**/dist/**',
          '**/.astro/**',
          '**/logs/**',
          '**/artifacts/**',
          '**/design/**',
          '**/.idea/**',
        ],
      },
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
});
