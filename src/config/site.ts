/**
 * src/config/site.ts
 * Single source of truth for site-wide SEO defaults.
 * Edit this file for each client — never hardcode these values elsewhere.
 */

export const SITE = {
  /** Canonical base URL — no trailing slash. Must match astro.config.mjs site: */
  url: 'https://cmgt.org',

  /** Display name — used in og:site_name, JSON-LD, email footer */
  name: 'CMGT',

  /** Twitter/X handle — include the @ */
  twitterHandle: '@cmgt',

  /** og:locale */
  locale: 'en_US',

  /** Fallback <title> if a page doesn't pass its own */
  defaultTitle: 'CMGT — Short tagline here',

  /** Fallback meta description */
  defaultDescription: 'One sentence describing what the business does and who it serves.',

  /**
   * Default OG image — place the file at public/assets/og.png
   * Dimensions: 1200×630px PNG, under 300KB
   */
  defaultOgImage: '/assets/og.png',
  ogImageWidth:  '1200',
  ogImageHeight: '630',

  /**
   * Organization JSON-LD — emitted on every page.
   *
   * Organization, not LocalBusiness. CMGT operates six Google Business Profiles,
   * and each city page emits its own LocalBusiness with that office's address and
   * local phone number. When this node was also a LocalBusiness, every city page
   * declared two businesses with two different phone numbers, which works against
   * the NAP consistency those pages exist to establish. The company is the
   * Organization; each office is a LocalBusiness that points back at it via
   * parentOrganization.
   *
   * Consequently no LocalBusiness-only properties belong here — priceRange was
   * removed for that reason.
   */
  org: {
    type: 'Organization',
    /**
     * Stable description for this node. Deliberately not the per-page meta
     * description: the node carries a fixed @id, so it must describe the same
     * entity identically on every page rather than changing page to page.
     */
    description:
      'Gulf South HOA, condo, and rental management — 400+ communities across Louisiana, Mississippi, Alabama, Texas, and Florida, independently owned since 2007.',
    telephone: '+1-225-503-2648',
    email: 'info@cmgt.org',
    streetAddress: '140 Aspen Square Suite H',
    addressLocality: 'Denham Springs',
    addressRegion: 'LA',
    postalCode: '70726',
    addressCountry: 'US',
    /**
     * The states CMGT actually serves. Was 'United States', which is true but
     * useless; this list came from the homepage's own Organization block, which
     * duplicated this node and has been removed in favour of it.
     */
    areaServed: ['Louisiana', 'Texas', 'Mississippi', 'Alabama', 'Florida Panhandle'],
    logo: 'https://cmgt.org/assets/logo.svg',
  },
} as const;
