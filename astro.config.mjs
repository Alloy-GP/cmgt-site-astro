// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // ── STEP 1: update to client's live domain ────────────────────
  site: 'https://cmgt.org',

  output: 'server',
  adapter: vercel(),
  trailingSlash: 'never',

  integrations: [
    react(),
    sitemap(), // auto-generates /sitemap-index.xml on every build — no manual sitemap.xml needed
  ],

  prefetch: { prefetchAll: true },

  // Prevents CSRF errors when testing on vercel.app before custom domain is live
  security: { checkOrigin: false },

  build: {
    // Embeds all CSS as inline <style> tags — eliminates render-blocking stylesheet request
    inlineStylesheets: 'always',
  },

  redirects: {
    // ── Deleted pages (content pass) ──────────────────────────────
    '/resources/louisiana-hoa-laws': '/resources',
    '/louisiana-hoa-laws': '/resources',

    // ── Condo page moved to design-canonical route ────────────────
    '/condo-and-townhome-management': '/condo-management',

    // ── Financial Management: design declares this legacy 301-in ────
    '/financial-administrative': '/hoa-financial-management',

    // ── Contact is a stub → the proposal flow is the single contact page
    '/contact': '/request-a-proposal',

    // ── Deleted / relocated pages → 301s ──────────────────────────
    '/ballin-on-belrose': '/testimonials',
    '/team-and-careers': '/about/team-careers',
    '/privacy-policy': '/privacy',
    '/terms-of-service': '/terms',
    '/cookie-policy': '/cookies',

    // ── Geo pages: flat (old ROUTES.md scaffold) → nested canonical ─
    '/alabama-hoa-management': '/hoa-management/alabama',
    '/louisiana-hoa-management': '/hoa-management/louisiana',
    '/mississippi-hoa-management': '/hoa-management/mississippi',
    '/texas-hoa-management': '/hoa-management/texas',
    '/florida-hoa-management': '/hoa-management/florida',

    // ── CMGT Cares → nested under /about ──────────────────────────
    '/cmgt-cares': '/about/cmgt-cares',

    // ── Guides: flat → nested under /resources ────────────────────
    '/hoa-reserve-study': '/resources/hoa-reserve-study',
    '/hoa-budget-template': '/resources/hoa-budget-template',
    '/hurricane-preparedness-for-hoas': '/resources/hurricane-preparedness-for-hoas',
    '/hoa-rules-enforcement': '/resources/hoa-rules-enforcement',
  },
});
