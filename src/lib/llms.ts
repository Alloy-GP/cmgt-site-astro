/**
 * src/lib/llms.ts — everything behind /llms.txt and /llms-full.txt.
 *
 * Pure functions, no Astro imports, so the same file runs in the build-time
 * endpoint, in `astro dev`, and in the Node check script. Portable to any AGP
 * Astro site without edits: the per-client content lives in src/data/llms.ts and
 * the name + canonical URL come from src/config/site.ts.
 *
 * Format reference: https://llmstxt.org/ — an H1, one blockquote summary, optional
 * prose/lists, then H2 sections whose list items are `[title](url): description`.
 * An `## Optional` section marks links an agent may skip when context is short.
 */

export interface LlmsLink {
  /** Site-relative path. Leading slash, no trailing slash (except "/"), no query/hash. */
  path: string;
  /** Short human label — not the SEO <title> with its brand suffix. */
  title: string;
  /** One line. Say what question the page answers, not marketing copy. */
  description?: string;
}

export interface LlmsSection {
  title: string;
  links: LlmsLink[];
}

export interface LlmsRegistry {
  /**
   * One paragraph: what the company does, for whom, where. Rendered as the
   * blockquote under the H1. Empty → falls back to SITE.defaultDescription.
   */
  summary: string;
  /** Short factual bullets (offices, service area, phone, credentials, differentiators). */
  facts?: string[];
  /** The curated index. Order matters: put "start here" first. */
  sections: LlmsSection[];
  /** Spec'd `## Optional` section — legal/policy pages an agent may skip. */
  optional?: LlmsLink[];
}

export interface LlmsSite {
  name: string;
  /** Canonical origin, e.g. https://cmgt.org — no trailing slash. */
  url: string;
}

export interface LlmsIssue {
  level: 'error' | 'warn';
  message: string;
}

/* ───────────────────────────── paths & URLs ───────────────────────────── */

export function normalizePath(p: string): string {
  let out = (p || '').trim();
  if (!out.startsWith('/')) out = '/' + out;
  if (out.length > 1) out = out.replace(/\/+$/, '');
  return out;
}

export function absoluteUrl(site: string, path: string): string {
  return site.replace(/\/+$/, '') + normalizePath(path);
}

/** Paths that must never be listed — they are the index itself or not pages. */
const RESERVED = new Set(['/llms.txt', '/llms-full.txt', '/404', '/robots.txt']);

/* ───────────────────────────── route table ───────────────────────────── */

export interface Route {
  /** URL path as written in the file tree, e.g. "/about" or "/blog/[slug]". */
  path: string;
  pattern: RegExp;
  dynamic: boolean;
  /** `[...rest]` catch-alls match anything, so they never satisfy a lookup. */
  rest: boolean;
  file: string;
}

/**
 * Build a route table from page file paths (as returned by
 * `import.meta.glob('/src/pages/**')` or a filesystem walk). Follows Astro's
 * rules: `index` collapses, `_`-prefixed files/dirs are not routes, `[x]` is a
 * param, `[...x]` is a rest param, endpoint files drop only their `.ts/.js`.
 */
export function routesFromPageFiles(files: string[]): Route[] {
  const routes: Route[] = [];
  for (const file of files) {
    const idx = file.lastIndexOf('/pages/');
    if (idx === -1) continue;
    let rel = file.slice(idx + '/pages/'.length);
    if (rel.split('/').some((seg) => seg.startsWith('_'))) continue;
    rel = rel.replace(/\.(astro|md|mdx|markdown|html)$/i, '').replace(/\.(ts|js|mjs)$/i, '');
    if (rel === 'index') rel = '';
    else if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
    const path = '/' + rel;
    const rest = /\[\.\.\./.test(path);
    const dynamic = /\[[^\]]+\]/.test(path);
    const source =
      '^' +
      path
        .split('/')
        .map((seg) =>
          /^\[\.\.\..*\]$/.test(seg) ? '.*' : /^\[.*\]$/.test(seg) ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        )
        .join('/') +
      '$';
    routes.push({ path, pattern: new RegExp(source), dynamic, rest, file });
  }
  return routes;
}

export function matchRoute(routes: Route[], path: string): Route | undefined {
  const p = normalizePath(path);
  return routes.find((r) => !r.rest && r.pattern.test(p));
}

/** Static page routes a human would expect to see in the index. */
export function indexablePageRoutes(routes: Route[]): Route[] {
  return routes.filter(
    (r) =>
      !r.dynamic &&
      !r.path.startsWith('/api/') &&
      !RESERVED.has(r.path) &&
      !/\.[a-z0-9]+$/i.test(r.path), // rss.xml, feed.json, …
  );
}

/* ───────────────────────────── validation ───────────────────────────── */

export interface ValidateOptions {
  routes?: Route[];
  unsorted?: LlmsLink[];
  /** Warn when the rendered file exceeds this many bytes. Default 32 KB. */
  sizeBudget?: number;
}

export function allLinks(reg: LlmsRegistry, unsorted: LlmsLink[] = []): { link: LlmsLink; where: string }[] {
  const out: { link: LlmsLink; where: string }[] = [];
  for (const s of reg.sections) for (const l of s.links) out.push({ link: l, where: `"${s.title}"` });
  for (const l of reg.optional ?? []) out.push({ link: l, where: '"Optional"' });
  for (const l of unsorted) out.push({ link: l, where: 'UNSORTED' });
  return out;
}

export function validateRegistry(reg: LlmsRegistry, site: LlmsSite, opts: ValidateOptions = {}): LlmsIssue[] {
  const issues: LlmsIssue[] = [];
  const err = (m: string) => issues.push({ level: 'error', message: m });
  const warn = (m: string) => issues.push({ level: 'warn', message: m });

  if (!site.name?.trim()) err('SITE.name is empty — the H1 would be blank.');
  if (!/^https?:\/\/[^/\s]+$/.test(site.url ?? '')) err(`SITE.url must be an origin with no path or trailing slash (got "${site.url}").`);
  if (!reg.summary?.trim()) err('summary is empty and no fallback description was supplied.');
  if (!reg.sections?.length) err('sections is empty — the file would be an H1 with nothing under it.');

  const seen = new Map<string, string>();
  for (const { link, where } of allLinks(reg, opts.unsorted)) {
    const raw = link.path ?? '';
    const path = normalizePath(raw);
    if (!raw.startsWith('/')) err(`${where}: path "${raw}" must start with "/".`);
    if (/[?#\s]/.test(raw)) err(`${where}: path "${raw}" must not contain a query, hash, or whitespace.`);
    if (raw.length > 1 && raw.endsWith('/')) err(`${where}: path "${raw}" has a trailing slash; this site uses trailingSlash: 'never'.`);
    if (raw !== raw.toLowerCase()) warn(`${where}: path "${raw}" has uppercase characters.`);
    if (RESERVED.has(path) || path.startsWith('/api/')) err(`${where}: "${path}" is not a page and must not be listed.`);
    if (!link.title?.trim()) err(`${where}: "${path}" has no title.`);
    if ((link.description ?? '').length > 240) warn(`${where}: "${path}" description is ${link.description!.length} chars; keep it to one line (≤ 240).`);
    const dup = seen.get(path);
    if (dup) err(`"${path}" is listed twice (${dup} and ${where}).`);
    else seen.set(path, where);

    if (opts.routes && !matchRoute(opts.routes, path)) {
      err(`${where}: "${path}" has no page in src/pages (typo, moved, or deleted — fix the path or remove the entry).`);
    }
  }

  if (opts.routes) {
    const listed = new Set([...seen.keys()]);
    for (const r of indexablePageRoutes(opts.routes)) {
      if (!listed.has(r.path)) warn(`page not listed: ${r.path}  (run \`npm run llms:draft\` to append it, or add it to src/data/llms.ts by hand)`);
    }
  }

  if (opts.unsorted?.length) {
    warn(`${opts.unsorted.length} page(s) still in UNSORTED — they render under "More pages" until moved into a section.`);
  }

  const rendered = renderLlmsTxt(reg, site, { unsorted: opts.unsorted });
  if (/\bTODO\b/.test(rendered)) err('rendered llms.txt contains "TODO" — finish the copy before shipping.');
  const bytes = new TextEncoder().encode(rendered).length;
  if (bytes > (opts.sizeBudget ?? 32 * 1024)) warn(`llms.txt is ${(bytes / 1024).toFixed(1)} KB; it should be an index, not the content (budget ${(opts.sizeBudget ?? 32768) / 1024} KB).`);

  return issues;
}

/* ───────────────────────────── rendering ───────────────────────────── */

function oneLine(s: string | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function linkText(s: string): string {
  return oneLine(s).replace(/[[\]]/g, '');
}

function renderLink(site: string, l: LlmsLink): string {
  const desc = oneLine(l.description);
  return `- [${linkText(l.title)}](${absoluteUrl(site, l.path)})${desc ? `: ${desc}` : ''}`;
}

export function renderLlmsTxt(reg: LlmsRegistry, site: LlmsSite, extra: { unsorted?: LlmsLink[] | undefined } = {}): string {
  const out: string[] = [];
  out.push(`# ${oneLine(site.name)}`, '');
  out.push(`> ${oneLine(reg.summary)}`, '');
  if (reg.facts?.length) {
    for (const f of reg.facts) out.push(`- ${oneLine(f)}`);
    out.push('');
  }
  out.push(
    `Every page's full text in one file: ${site.url}/llms-full.txt. Complete URL list: ${site.url}/sitemap-index.xml.`,
    '',
  );
  for (const s of reg.sections) {
    if (!s.links.length) continue;
    out.push(`## ${oneLine(s.title)}`, '');
    for (const l of s.links) out.push(renderLink(site.url, l));
    out.push('');
  }
  if (extra.unsorted?.length) {
    out.push('## More pages', '');
    for (const l of extra.unsorted) out.push(renderLink(site.url, l));
    out.push('');
  }
  if (reg.optional?.length) {
    out.push('## Optional', '');
    for (const l of reg.optional) out.push(renderLink(site.url, l));
    out.push('');
  }
  return out.join('\n');
}

/* ───────────────────────── HTML → Markdown (llms-full) ───────────────────────── */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', copy: '©', reg: '®',
  trade: '™', bull: '•', middot: '·', times: '×', deg: '°', frac12: '½', frac14: '¼',
  frac34: '¾', laquo: '«', raquo: '»', ensp: ' ', emsp: ' ', thinsp: ' ', zwj: '', zwnj: '',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z0-9]+);/gi, (whole, n) => (n in NAMED_ENTITIES ? NAMED_ENTITIES[n] : whole));
}

/** The page's content region: <main>, else <article>, else <body>, else everything. */
export function extractMainHtml(html: string): string {
  for (const tag of ['main', 'article', 'body']) {
    const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (m) return m[1];
  }
  return html;
}

/** The document <title> without a trailing " — Brand" / " | Brand" suffix. */
export function extractTitle(html: string, brand?: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let t = oneLine(decodeEntities(m?.[1] ?? ''));
  if (brand) t = t.replace(new RegExp(`\\s*[—|–-]\\s*${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '');
  return t;
}

const DROP_TAGS = ['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'video', 'audio', 'canvas', 'form', 'button', 'select', 'textarea', 'nav', 'dialog'];

/**
 * Regex-based converter: good enough for machine consumption of marketing pages
 * (headings, paragraphs, lists, links, emphasis, tables). Not a general-purpose
 * HTML parser — nested same-name tags inside DROP_TAGS are the known blind spot.
 */
export function htmlToMarkdown(html: string, baseUrl: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // Count-up stats render "0" in the HTML and animate to the real value in JS. Use
  // the value from the data attribute so the text says "389 communities", not "0".
  s = s.replace(/<(\w+)\b([^>]*\bdata-(?:count-to|count|target)=["']([^"']*)["'][^>]*)>[\s\S]*?<\/\1>/gi, (_m, tag, attrs: string, value: string) => {
    const prefix = attrs.match(/\bdata-prefix=["']([^"']*)["']/i)?.[1] ?? '';
    const suffix = attrs.match(/\bdata-suffix=["']([^"']*)["']/i)?.[1] ?? '';
    return `<${tag}>${prefix}${value}${suffix}</${tag}>`;
  });
  for (const t of DROP_TAGS) s = s.replace(new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?<\\/${t}>`, 'gi'), '\n');
  s = s.replace(/<[^>]+\baria-hidden=["']true["'][^>]*>\s*<\/[^>]+>/gi, ''); // empty decorative nodes
  s = s.replace(/<(img|picture|source|input|hr|br)\b[^>]*>/gi, (_m, tag) => (tag.toLowerCase() === 'br' ? '\n' : tag.toLowerCase() === 'hr' ? '\n\n---\n\n' : ''));

  // Inline first, so block conversions see clean text.
  s = s.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => {
    const label = oneLine(stripTags(text));
    if (!label) return '';
    if (/^(#|javascript:)/i.test(href)) return label;
    if (/^(mailto|tel):/i.test(href)) return label;
    let abs = href;
    try { abs = new URL(href, baseUrl).toString(); } catch { /* leave as-is */ }
    return `[${label.replace(/[[\]]/g, '')}](${abs})`;
  });
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, x) => (oneLine(stripTags(x)) ? `**${oneLine(stripTags(x))}**` : ''));
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, x) => (oneLine(stripTags(x)) ? `*${oneLine(stripTags(x))}*` : ''));
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, x) => `\`${oneLine(stripTags(x))}\``);

  // Blocks.
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, x) => `\n\n${'#'.repeat(Number(lvl))} ${oneLine(stripTags(x))}\n\n`);
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, x) => `\n\n> ${oneLine(stripTags(x))}\n\n`);
  s = s.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) => {
    let i = 0;
    return '\n\n' + inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_mm, x) => `\n${++i}. ${oneLine(stripTags(x))}`) + '\n\n';
  });
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, x) => `\n- ${oneLine(stripTags(x))}`);
  s = s.replace(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi, (_m, x) => `\n- **${oneLine(stripTags(x))}**`);
  s = s.replace(/<dd\b[^>]*>([\s\S]*?)<\/dd>/gi, (_m, x) => ` — ${oneLine(stripTags(x))}\n`);
  s = s.replace(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi, (_m, x) => ` ${oneLine(stripTags(x))} |`);
  s = s.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_m, x) => `\n|${x.replace(/\n/g, ' ')}`);
  s = s.replace(/<\/(p|div|section|article|header|footer|aside|figure|figcaption|table|thead|tbody|ul|dl|address|details|summary)>/gi, '\n\n');
  s = s.replace(/<(p|div|section|article|header|footer|aside|figure|figcaption|table|thead|tbody|ul|dl|address|details|summary)\b[^>]*>/gi, '\n\n');

  // Remaining inline tags become a space so "11 min read</span><span>2026 Edition"
  // reads "11 min read 2026 Edition"; the stray space before punctuation is removed.
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').replace(/ ([.,;:!?%)\]])/g, '$1').replace(/([(\[]) /g, '$1').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/* ───────────────────────────── llms-full assembly ───────────────────────────── */

export interface FullPage {
  section: string;
  title: string;
  url: string;
  /** Markdown body, or null when the page could not be fetched. */
  markdown: string | null;
  status?: number;
}

export function renderLlmsFull(site: LlmsSite, summary: string, pages: FullPage[], generatedAt: Date): string {
  const out: string[] = [];
  out.push(`# ${oneLine(site.name)} — full site text`, '');
  out.push(`> ${oneLine(summary)}`, '');
  out.push(
    `Generated ${generatedAt.toISOString().slice(0, 10)} from the live pages at ${site.url}. ` +
      `Index: ${site.url}/llms.txt. Each page below starts with "Page:", "URL:" and "Section:" lines; ` +
      `the URL line is the canonical page to cite.`,
    '',
  );
  for (const p of pages) {
    out.push('---', '');
    out.push(`Page: ${oneLine(p.title)}`);
    out.push(`URL: ${p.url}`);
    out.push(`Section: ${oneLine(p.section)}`, '');
    out.push(p.markdown ?? `(Page text unavailable at generation time${p.status ? ` — HTTP ${p.status}` : ''}. Fetch the URL above.)`, '');
  }
  return out.join('\n');
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
