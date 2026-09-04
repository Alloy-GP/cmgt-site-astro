/**
 * src/middleware.ts — request-level redirects that the static `redirects` map in
 * astro.config.mjs cannot express. Exact-match legacy slugs stay in that map,
 * which the Vercel adapter serves at the edge without invoking this function.
 *
 * Both jobs here came out of the 2026-W36 backlink audit:
 *
 * 1. Legacy URL *families* from the two previous cmgt.org sites that still carry
 *    referring domains and were returning 404:
 *    - the pre-WordPress ASP portal — /cm, /cm/*.asp, /<community>/outside_home.asp,
 *      /alz/*.asp — goes to the homeowner hub, which is where account access lives now;
 *    - WordPress date-archive blog posts (/2018/05/16/<slug>) go to the Resources hub,
 *      because the blog was not rebuilt;
 *    - WordPress uploads (/wp-content/...) go to the homeowner hub; the linked files
 *      were homeowner forms. Vercel's firewall currently denies /wp-content paths at
 *      the edge (x-vercel-mitigated: deny), so this rule only takes effect if that
 *      managed rule is relaxed in the Vercel dashboard.
 *
 * 2. Mixed-case paths. Astro routes are case-sensitive, and Google was ranking
 *    /Resources (capital R) for two page-1 terms while the live URL returned 404.
 *    Any path containing an uppercase letter is 301'd to its lowercase form. Static
 *    assets (anything with a file extension), /api routes, and Astro internals are
 *    left alone: several files in public/ have capitals in their names.
 */
import { defineMiddleware } from 'astro:middleware';

const HOMEOWNER_HUB = '/homeowner-hub';
const RESOURCES_HUB = '/resources';

/** /cm, /cm/anything, and any *.asp page anywhere (the old portal was all ASP). */
const ASP_PORTAL = /^\/cm(\/|$)|\.asp$/i;
/** WordPress permalink structure: /YYYY/MM/DD/slug */
const WP_BLOG_ARCHIVE = /^\/20\d\d\/\d\d\/\d\d\//;
const WP_UPLOADS = /^\/wp-content\//i;
/** Anything that looks like a file request, e.g. /photos/PHOTO-MANIFEST.md */
const HAS_EXTENSION = /\.[a-z0-9]{2,5}$/i;

export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;

  if (ASP_PORTAL.test(pathname)) return context.redirect(HOMEOWNER_HUB, 301);
  if (WP_UPLOADS.test(pathname)) return context.redirect(HOMEOWNER_HUB, 301);
  if (WP_BLOG_ARCHIVE.test(pathname)) return context.redirect(RESOURCES_HUB, 301);

  if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_') &&
    !HAS_EXTENSION.test(pathname) &&
    pathname !== pathname.toLowerCase()
  ) {
    return context.redirect(pathname.toLowerCase() + search, 301);
  }

  return next();
});
