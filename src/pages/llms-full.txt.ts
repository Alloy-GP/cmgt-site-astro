/**
 * /llms-full.txt — every indexed page's text in one plain-text file, the companion
 * to /llms.txt. Lets an agent ingest the whole site in a single request instead of
 * crawling it.
 *
 * Server-rendered on demand, then cached at the CDN for a day: the pages are
 * fetched from this very deployment (so a preview describes the preview and
 * production describes production), the <main> region is converted to Markdown,
 * and the results are concatenated in registry order. If a page cannot be fetched
 * the file still ships with a stub for that page and a short cache lifetime, so a
 * transient failure heals itself on the next request. It never touches the rest
 * of the site and has no failure mode that affects any page.
 */
import type { APIRoute } from 'astro';
import { SITE } from '~/config/site';
import { LLMS, UNSORTED } from '~/data/llms';
import {
  absoluteUrl,
  extractMainHtml,
  extractTitle,
  htmlToMarkdown,
  mapLimit,
  renderLlmsFull,
  type FullPage,
} from '~/lib/llms';

export const prerender = false;

const CONCURRENCY = 6;
const PER_PAGE_TIMEOUT_MS = 8_000;
const PER_PAGE_CHAR_CAP = 60_000;
const CACHE_OK = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
const CACHE_DEGRADED = 'public, max-age=0, s-maxage=600';

export const GET: APIRoute = async ({ site, url }) => {
  const canonical = (site?.origin ?? SITE.url).replace(/\/+$/, '');
  // Pages are fetched from the canonical public host, never from this request's
  // own origin. On Vercel, Astro's `url` inside a function is `https://localhost/…`
  // (the first production runs came back 0/48: "fetch failed (fetching
  // https://localhost)"), so neither `url.origin` nor a hostname test can be
  // trusted there; preview/stg URLs also sit behind Deployment Protection.
  // `astro dev` is the one place where the canonical host is not this code, so
  // only there do we fetch ourselves — decided by the build-time DEV flag.
  const fetchOrigin = import.meta.env.DEV ? url.origin : canonical;
  const summary = LLMS.summary?.trim() || SITE.defaultDescription;

  const targets = [
    ...LLMS.sections.flatMap((s) => s.links.map((link) => ({ section: s.title, link }))),
    ...UNSORTED.map((link) => ({ section: 'More pages', link })),
  ].filter(({ link }) => !/^\/llms(-full)?\.txt$/.test(link.path));

  const pages: FullPage[] = await mapLimit(targets, CONCURRENCY, async ({ section, link }) => {
    const pageUrl = absoluteUrl(canonical, link.path);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PER_PAGE_TIMEOUT_MS);
    try {
      const res = await fetch(absoluteUrl(fetchOrigin, link.path), {
        headers: {
          accept: 'text/html',
          'user-agent': `${SITE.name}-llms-full/1.0 (+${canonical}/llms.txt)`,
        },
        redirect: 'manual', // a redirect means the registry path is stale — surface it, don't follow it
        signal: ctrl.signal,
      });
      if (res.status !== 200) return { section, title: link.title, url: pageUrl, markdown: null, status: res.status };
      const html = await res.text();
      let markdown = htmlToMarkdown(extractMainHtml(html), pageUrl);
      if (markdown.length > PER_PAGE_CHAR_CAP) markdown = markdown.slice(0, PER_PAGE_CHAR_CAP) + '\n\n(truncated)';
      return { section, title: link.title || extractTitle(html, SITE.name), url: pageUrl, markdown: markdown || null, status: 200 };
    } catch (e) {
      // Keep the reason in the stub so a bad run is diagnosable from the file itself.
      const reason = e instanceof Error ? (e.name === 'AbortError' ? `timeout after ${PER_PAGE_TIMEOUT_MS} ms` : `${e.name}: ${e.message}`) : String(e);
      return { section, title: link.title, url: pageUrl, markdown: null, error: `${reason} (fetching ${fetchOrigin})` };
    } finally {
      clearTimeout(timer);
    }
  });

  const failed = pages.filter((p) => p.markdown === null).length;
  const body = renderLlmsFull({ name: SITE.name, url: canonical }, summary, pages, new Date());

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': failed ? CACHE_DEGRADED : CACHE_OK,
      'X-Llms-Pages': `${pages.length - failed}/${pages.length}`,
    },
  });
};
