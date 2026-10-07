/**
 * /llms.txt — the curated index AI assistants read first (https://llmstxt.org/).
 *
 * Prerendered: built once per deploy from src/data/llms.ts, so it is a static file
 * in production and costs nothing per request. The build FAILS on a broken registry
 * (path with no page, duplicate, trailing slash, TODO copy) and WARNS about pages
 * that exist but are not listed — so the index can go stale loudly, never silently.
 *
 * Nothing here is client-specific: name and canonical URL come from site config,
 * content from src/data/llms.ts, logic from src/lib/llms.ts.
 */
import type { APIRoute } from 'astro';
import { SITE } from '~/config/site';
import { LLMS, UNSORTED } from '~/data/llms';
import { renderLlmsTxt, routesFromPageFiles, validateRegistry } from '~/lib/llms';

export const prerender = true;

// Keys only — nothing is imported. This is the real route table, so a path in the
// registry that points at a deleted or renamed page fails the build.
const PAGE_FILES = Object.keys(import.meta.glob('/src/pages/**/*.{astro,md,mdx,ts,js}'));

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.origin ?? SITE.url).replace(/\/+$/, '');
  const llmsSite = { name: SITE.name, url: origin };
  const registry = { ...LLMS, summary: LLMS.summary?.trim() || SITE.defaultDescription };

  const issues = validateRegistry(registry, llmsSite, { routes: routesFromPageFiles(PAGE_FILES), unsorted: UNSORTED });
  for (const w of issues.filter((i) => i.level === 'warn')) console.warn(`[llms.txt] ${w.message}`);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) {
    throw new Error(
      `[llms.txt] ${errors.length} error(s) in src/data/llms.ts — fix before deploying:\n` +
        errors.map((e) => `  • ${e.message}`).join('\n'),
    );
  }

  return new Response(renderLlmsTxt(registry, llmsSite, { unsorted: UNSORTED }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
