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

    // ── Louisiana HOA law: these old slugs were parked on the hub while the law
    //    page was held back. It shipped 2026-08-21, so they now go straight there.
    //    ('louisiana hoa laws' was ranking on the hub URL because of this.)
    '/resources/louisiana-hoa-laws': '/resources/hoa-laws/louisiana',
    '/louisiana-hoa-laws': '/resources/hoa-laws/louisiana',

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

    // ── 2026-W36 backlink audit: legacy slugs (WordPress era and the older ASP
    //    site) that still carry referring domains and were returning 404. URL
    //    *families* that need a pattern (/cm/*, *.asp, /20xx/mm/dd/*, /wp-content/*)
    //    live in src/middleware.ts; these are the exact slugs.
    '/association-management': '/hoa-management-services',
    '/services': '/hoa-management-services',
    '/association-management-contact': '/request-a-proposal',
    '/property-management-contact': '/request-a-proposal',
    '/request-for-proposal': '/request-a-proposal',
    '/property-management': '/rentals',
    '/category/propertymanagement': '/rentals',
    '/category/multifamilymanagement': '/resources',
    '/category/associatemanagement': '/resources',
    '/re-sale-documents': '/homeowner-hub',
    '/association-management-forms': '/homeowner-hub',
    '/association-management-form': '/homeowner-hub',
    '/association-management-faq': '/faq',
    '/community-association-manager': '/how-we-work',
    // Old job postings
    '/careers': '/about/team-careers',
    '/our-team': '/about/team-careers',
    '/community-manager': '/about/team-careers',
    '/assistant-community-manager': '/about/team-careers',
    '/assistant-property-manager': '/about/team-careers',
    '/site-visit-specialist': '/about/team-careers',
    '/customer-service-representative-csr': '/about/team-careers',
    '/hvac-maintenance-technician': '/about/team-careers',
    '/architectural-control-specialist': '/about/team-careers',
    '/accounts-receivable-support-team-member': '/about/team-careers',
    // Old flat geo slugs
    '/baton-rouge': '/hoa-management/louisiana/baton-rouge',
    '/biloxi': '/hoa-management/mississippi/biloxi',
    '/new-orleans': '/hoa-management/louisiana',
    '/louisiana': '/hoa-management/louisiana',
    '/mississippi': '/hoa-management/mississippi',
    '/alabama': '/hoa-management/alabama',
    '/association-management-louisiana': '/hoa-management/louisiana',
    '/association-management-mississippi': '/hoa-management/mississippi',
    '/association-management-alabama': '/hoa-management/alabama',
    '/association-management-florida': '/hoa-management/florida',
    // Community roots from the old ASP portal; their *.asp children are caught by
    // the middleware pattern. Keys are lowercase because the middleware lowercases
    // mixed-case paths (e.g. /SUGARLANDESTATES) before they can match here.
    '/willowgrove': '/homeowner-hub',
    '/riverranch': '/homeowner-hub',
    '/carterplantation': '/homeowner-hub',
    '/springlake': '/homeowner-hub',
    '/lexingtonestates': '/homeowner-hub',
    '/jeffersonhills': '/homeowner-hub',
    '/sugarlandestates': '/homeowner-hub',
    '/woodlandcrossingii': '/homeowner-hub',

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
