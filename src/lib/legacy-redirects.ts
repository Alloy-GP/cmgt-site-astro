/**
 * src/lib/legacy-redirects.ts — pattern-based redirects that the static
 * `redirects` map in astro.config.mjs cannot express. Consumed by the catch-all
 * route src/pages/[...slug].astro, which is the only place unmatched URLs land.
 *
 * Why a catch-all route and not middleware: when no route matches, Astro renders
 * the /404 route and forces the response status to 404 even if middleware returns
 * a redirect, so the redirect arrived on Vercel as "404 + Location" and was never
 * followed. A catch-all page is a real route, so its 301 is honoured. Exact-match
 * legacy slugs stay in astro.config.mjs, which the Vercel adapter serves at the
 * edge without invoking the function at all.
 *
 * Both jobs came out of the 2026-W36 backlink audit:
 *
 * 1. Legacy URL *families* from the two previous cmgt.org sites that still carry
 *    referring domains and were returning 404:
 *    - the pre-WordPress ASP portal — /cm, /cm/*.asp, /<community>/outside_home.asp,
 *      /alz/*.asp — goes to the homeowner hub, where account access lives now;
 *    - WordPress date-archive blog posts (/2018/05/16/<slug>) go to the Resources
 *      hub, because the blog was not rebuilt;
 *    - WordPress uploads (/wp-content/...) go to the homeowner hub; the linked files
 *      were homeowner forms. Vercel's firewall currently denies /wp-content paths at
 *      the edge (x-vercel-mitigated: deny), so this rule only takes effect if that
 *      managed rule is relaxed in the Vercel dashboard.
 *
 * 2. Mixed-case paths. Astro routes are case-sensitive, and Google was ranking
 *    /Resources (capital R) for two page-1 terms while the live URL returned 404.
 *    Any path containing an uppercase letter is sent to its lowercase form. Static
 *    assets (anything with a file extension), /api routes, and Astro internals are
 *    left alone: several files in public/ have capitals in their names.
 */

const HOMEOWNER_HUB = '/homeowner-hub';
const RESOURCES_HUB = '/resources';

/** /cm, /cm/anything, and any *.asp page anywhere (the old portal was all ASP). */
const ASP_PORTAL = /^\/cm(\/|$)|\.asp$/i;
/** WordPress permalink structure: /YYYY/MM/DD/slug */
const WP_BLOG_ARCHIVE = /^\/20\d\d\/\d\d\/\d\d\//;
const WP_UPLOADS = /^\/wp-content\//i;
/** Anything that looks like a file request, e.g. /photos/PHOTO-MANIFEST.md */
const HAS_EXTENSION = /\.[a-z0-9]{2,5}$/i;

/**
 * The path (with query string preserved where it matters) the request should be
 * 301'd to, or null when no legacy rule applies and the URL is a genuine 404.
 */
export function legacyRedirectTarget(url: URL): string | null {
  const { pathname, search } = url;

  if (ASP_PORTAL.test(pathname)) return HOMEOWNER_HUB;
  if (WP_UPLOADS.test(pathname)) return HOMEOWNER_HUB;
  if (WP_BLOG_ARCHIVE.test(pathname)) return RESOURCES_HUB;

  if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_') &&
    !HAS_EXTENSION.test(pathname) &&
    pathname !== pathname.toLowerCase()
  ) {
    return pathname.toLowerCase() + search;
  }

  return null;
}
