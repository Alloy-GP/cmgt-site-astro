// src/lib/schema.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reusable JSON-LD schema builder functions.
//
// Usage in a .astro page:
//
//   import { breadcrumbSchema, faqSchema, serviceSchema } from '~/lib/schema';
//   import { SITE } from '~/config/site';
//
//   const breadcrumb = breadcrumbSchema([
//     { name: 'Home',     url: SITE.url + '/' },
//     { name: 'Services', url: SITE.url + '/services' },
//     { name: 'SEO',      url: SITE.url + '/services/seo' },
//   ]);
//
//   const faq = faqSchema([
//     { q: 'What do you do?', a: 'We do great things.' },
//   ]);
//
//   Then pass to BaseLayout:
//   <BaseLayout pageSchema={[breadcrumb, faq]} ...>
// ─────────────────────────────────────────────────────────────────────────────

import { SITE } from '~/config/site';

// ── Organization ─────────────────────────────────────────────────────────────
// Already rendered by BaseLayout on every page. Import this only if you need
// to reference the org object inside another schema (e.g. Article publisher).

export function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': SITE.org.type,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.org.logo,
    telephone: SITE.org.telephone,
    email: SITE.org.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.org.streetAddress,
      addressLocality: SITE.org.addressLocality,
      addressRegion: SITE.org.addressRegion,
      postalCode: SITE.org.postalCode,
      addressCountry: SITE.org.addressCountry,
    },
    areaServed: SITE.org.areaServed,
    priceRange: SITE.org.priceRange,
  };
}

// ── BreadcrumbList ────────────────────────────────────────────────────────────
// items: ordered array from Home → current page.

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── FAQPage ───────────────────────────────────────────────────────────────────
// faqs: array of question/answer pairs.
// Keep answers identical to the on-page text — Google penalises mismatches.

export function faqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export function serviceSchema(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
  areaServed?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    // Same @id as the node BaseLayout emits, so every service resolves to the one
    // company rather than to a fresh anonymous provider per page.
    provider: { '@type': 'Organization', '@id': SITE.url + '/#organization' },
    areaServed: opts.areaServed ?? SITE.org.areaServed,
    ...(opts.image ? { image: opts.image } : {}),
  };
}

// ── AggregateRating on the company ────────────────────────────────────────────
// Merges into the Organization node by @id. Only use where the same figures are
// visible on the page — Google discards review markup a reader can't see.

export function orgRatingSchema(opts: {
  ratingValue: string;
  reviewCount: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': SITE.url + '/#organization',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: opts.ratingValue,
      reviewCount: opts.reviewCount,
      bestRating: '5',
      worstRating: '1',
    },
  };
}

// ── ContactPage ───────────────────────────────────────────────────────────────

export function contactPageSchema(opts: { name: string; description: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'en-US',
    about: { '@type': 'Organization', '@id': SITE.url + '/#organization' },
  };
}

// ── Article ───────────────────────────────────────────────────────────────────
// Use for blog posts, resource articles, guides. ogType="article" on the route.

export function articleSchema(opts: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;   // ISO 8601: '2026-05-13'
  dateModified?: string;
  image?: string;
  about?: string[];        // topic names
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    // Reference the Organization node BaseLayout already emits on every page
    // instead of repeating name/logo inline. Two anonymous copies of the same
    // company read as two entities; one @id resolves to one.
    author:    { '@type': 'Organization', '@id': SITE.url + '/#organization' },
    publisher: { '@type': 'Organization', '@id': SITE.url + '/#organization' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
    inLanguage: 'en-US',
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.about
      ? { about: opts.about.map((name) => ({ '@type': 'Thing', name })) }
      : {}),
  };
}

// ── CollectionPage ────────────────────────────────────────────────────────────
// Use on hub pages whose job is to list other pages (e.g. /resources).
// items: the listed pages, in the order a reader meets them on the page.

export function collectionPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'en-US',
    publisher: { '@type': 'Organization', '@id': SITE.url + '/#organization' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

// ── Course ────────────────────────────────────────────────────────────────────

export function courseSchema(opts: {
  name: string;
  description: string;
  url: string;
  free?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    isAccessibleForFree: opts.free ?? true,
    inLanguage: 'en-US',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
}

// ── LocalBusiness ─────────────────────────────────────────────────────────────
// Use on the Contact or About page when you want the full local business card.

export function localBusinessSchema(opts?: { description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE.name,
    url: SITE.url,
    logo: SITE.org.logo,
    telephone: SITE.org.telephone,
    email: SITE.org.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.org.streetAddress,
      addressLocality: SITE.org.addressLocality,
      addressRegion: SITE.org.addressRegion,
      postalCode: SITE.org.postalCode,
      addressCountry: SITE.org.addressCountry,
    },
    areaServed: SITE.org.areaServed,
    priceRange: SITE.org.priceRange,
    ...(opts?.description ? { description: opts.description } : {}),
  };
}
