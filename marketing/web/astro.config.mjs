import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kanap.net',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'de', 'es'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          fr: 'fr',
          de: 'de',
          es: 'es',
        },
      },
      // Exclude the trial funnel from the sitemap — it's behind robots noindex
      filter: (page) => !page.includes('/trial/') && !page.includes('/404'),
    }),
  ],
  server: {
    port: 4321,
    host: true,
  },
});
