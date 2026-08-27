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
    // ── Account access consolidated onto the homeowner hub ─────────
    // /login was the unlinked mockup URL. The header now carries a single
    // "HOA Homeowners & Boards" entry pointing at /homeowner-hub, which
    // replaced Log In / Pay Dues / Order Documents.
    '/login': '/homeowner-hub',

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

    // ════════════════════════════════════════════════════════════════
    // LEGACY LIVE-SITE URLs (from the current cmgt.org / Screaming Frog +
    // launch-readiness crawl). These are the REAL old WordPress URLs with
    // backlinks/bookmarks — must 301 at DNS cutover so nothing 404s.
    // ════════════════════════════════════════════════════════════════

    // Old /state/* geo pages → nested geo hubs
    '/state/alabama': '/hoa-management/alabama',
    '/state/florida': '/hoa-management/florida',
    '/state/louisiana': '/hoa-management/louisiana',
    '/state/mississippi': '/hoa-management/mississippi',
    '/state/texas': '/hoa-management/texas',

    // Old service / solution slugs
    '/developer-management': '/developer-hoa-management',
    '/full-service-management': '/hoa-management-services',
    '/community-association-management': '/hoa-management-services',
    '/property-management-leasing': '/rentals',
    '/cmgt-rentals': '/rentals',

    // Old company / conversion slugs
    '/cmgtcares': '/about/cmgt-cares',
    '/team-careers': '/about/team-careers',
    '/timeline': '/our-story',
    '/community-faq': '/faq',
    '/request-proposal': '/request-a-proposal',

    // Old blog + hubs (blog not rebuilt → Resources hub)
    '/blog': '/resources',
    '/category/industry-trends': '/resources',
    '/category/cmgt-cares': '/about/cmgt-cares',
    '/rental-property-management-faq': '/rentals',
    '/fix-it-squad-faq': '/fix-it-squad',

    // Old CMGT Cares event / community posts → the CMGT Cares page
    '/ballin-on-belrose-2026': '/about/cmgt-cares',
    '/toys-for-tots': '/about/cmgt-cares',
    '/river-ranch-recognition': '/about/cmgt-cares',
    '/bring-a-noodle': '/about/cmgt-cares',
    '/louisianas-first-cai-chapter': '/about/cmgt-cares',
    '/wheels-to-succeed-2022': '/about/cmgt-cares',
    '/project-graduation-2022': '/about/cmgt-cares',
    '/denham-springs-athletic-association': '/about/cmgt-cares',

    // Old WordPress (Yoast) sitemap URLs → our real sitemap. The old index used
    // an underscore (sitemap_index.xml); Astro generates sitemap-index.xml.
    // Redirecting these clears the legacy 404s search tools still remember.
    '/sitemap_index.xml': '/sitemap-index.xml',
    '/post-sitemap.xml': '/sitemap-index.xml',
    '/page-sitemap.xml': '/sitemap-index.xml',
    '/category-sitemap.xml': '/sitemap-index.xml',
    '/location-sitemap.xml': '/sitemap-index.xml',
    '/state-sitemap.xml': '/sitemap-index.xml',
    '/resource-sitemap.xml': '/sitemap-index.xml',
    '/header-type-sitemap.xml': '/sitemap-index.xml',
    '/testimonial-sitemap.xml': '/sitemap-index.xml',
    '/author-sitemap.xml': '/sitemap-index.xml',
  },
});
