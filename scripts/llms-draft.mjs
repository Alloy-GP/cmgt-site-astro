#!/usr/bin/env node
/**
 * scripts/llms-draft.mjs — seed or top up src/data/llms.ts from the pages that exist.
 *
 *   npm run llms:draft                 # create the registry if missing, else append new pages to UNSORTED
 *   npm run llms:draft -- --force      # regenerate the whole draft (overwrites curated copy — be sure)
 *   npm run llms:draft -- --summary "One paragraph about the company"   # used when creating
 *
 * Reads every static page under src/pages, pulls `title`, `description` and `robots`
 * from the layout tag (<BaseLayout title="…" description="…">, resolving frontmatter
 * consts), skips API routes, dynamic routes, 404 and noindex pages, strips the brand
 * suffix from titles, and writes TypeScript the endpoint can import.
 *
 * Never edits curated entries: when the file exists it only appends paths that are
 * not already mentioned anywhere in it, into the UNSORTED block at the bottom.
 * Zero dependencies. Node 18+.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : undefined; };

const ROOT = findRoot();
const PAGES = join(ROOT, 'src', 'pages');
const OUT = join(ROOT, 'src', 'data', 'llms.ts');
const SITE_TS = join(ROOT, 'src', 'config', 'site.ts');

function findRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(dir, 'astro.config.mjs'))) return dir;
    dir = dirname(dir);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..');
}

/* ───────────── site config ───────────── */

function readSiteConfig() {
  const src = existsSync(SITE_TS) ? readFileSync(SITE_TS, 'utf8') : '';
  const pick = (key) => src.match(new RegExp(`^\\s*${key}:\\s*(?:'([^']*)'|"([^"]*)"|\`([^\`]*)\`)`, 'm'))?.slice(1).find((g) => g !== undefined) ?? '';
  return { name: pick('name'), url: pick('url'), defaultDescription: pick('defaultDescription') };
}

/* ───────────── page discovery ───────────── */

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function routeFor(file) {
  let rel = relative(PAGES, file).split(/[\\/]/).join('/');
  if (rel.split('/').some((s) => s.startsWith('_'))) return null;
  if (rel.startsWith('api/')) return null;
  if (/\[/.test(rel)) return null;
  if (!/\.(astro|md|mdx)$/.test(rel)) return null;
  rel = rel.replace(/\.(astro|md|mdx)$/, '');
  if (rel === 'index') rel = '';
  else if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  const path = '/' + rel;
  if (path === '/404') return null;
  return path;
}

function unquote(v) {
  return v.replace(/^\s*(['"`])([\s\S]*)\1\s*$/, '$2');
}

/** Pull title/description/robots from the first component tag that carries a title= attribute. */
function extractMeta(source) {
  const tpl = source.includes('---') ? source.slice(source.indexOf('---', 3) + 3) : source;
  const tag = tpl.match(/<([A-Z][\w.]*)\b([^>]*\btitle\s*=[^>]*)>/s);
  const attrs = tag?.[2] ?? '';
  const attr = (name) => {
    const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{([\\s\\S]*?)\\})`));
    if (!m) return undefined;
    const v = m.slice(1).find((g) => g !== undefined)?.trim();
    if (v === undefined) return undefined;
    if (m[3] !== undefined) return resolveExpr(v, source);
    return v;
  };
  return { title: attr('title'), description: attr('description'), robots: attr('robots') };
}

/** `{title}` → the frontmatter const's string literal, when it is one. Anything else → undefined. */
function resolveExpr(expr, source) {
  if (/^(['"`])[\s\S]*\1$/.test(expr) && !/\$\{/.test(expr)) return unquote(expr);
  const id = expr.match(/^([A-Za-z_$][\w$]*)$/)?.[1];
  if (!id) return undefined;
  const m = source.match(new RegExp(`(?:const|let|var)\\s+${id}\\s*(?::[^=]+)?=\\s*(['"\`])([^'"\`]*)\\1`));
  return m ? m[2] : undefined;
}

function stripBrand(title, brand) {
  if (!title) return '';
  let t = title.replace(/\s+/g, ' ').trim();
  if (brand) {
    const b = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`\\s*[—|–-]\\s*${b}\\b.*$`, 'i'), '');
    t = t.replace(new RegExp(`^${b}\\s*[—|–-]\\s*`, 'i'), '');
  }
  return t;
}

function labelFromPath(path) {
  const last = path.split('/').filter(Boolean).pop() ?? 'Home';
  return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sectionFor(path) {
  const segs = path.split('/').filter(Boolean);
  if (segs.length <= 1) return 'Pages';
  return segs[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const LEGAL = /\/(privacy|privacy-policy|terms|terms-of-service|terms-conditions|cookies|cookie-policy|legal|accessibility|disclaimer)$/;

function discover(site) {
  const pages = [];
  for (const file of walk(PAGES)) {
    const path = routeFor(file);
    if (!path) continue;
    const src = readFileSync(file, 'utf8');
    const meta = extractMeta(src);
    if (meta.robots && /noindex/i.test(meta.robots)) continue;
    pages.push({
      path,
      title: stripBrand(meta.title, site.name) || labelFromPath(path),
      description: (meta.description ?? '').replace(/\s+/g, ' ').trim(),
      resolved: meta.title !== undefined && meta.description !== undefined,
    });
  }
  pages.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)));
  return pages;
}

/* ───────────── TS emit ───────────── */

const q = (s) => `'${String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function emitLink(p, indent = '    ') {
  const desc = p.description ? ` description: ${q(p.description)},` : '';
  const todo = p.resolved ? '' : ' // ← could not read title/description from the page; check by hand';
  return `${indent}{ path: ${q(p.path)}, title: ${q(p.title)},${desc} },${todo}`;
}

function emitFresh(pages, summary) {
  const optional = pages.filter((p) => LEGAL.test(p.path));
  const rest = pages.filter((p) => !LEGAL.test(p.path));
  const groups = new Map();
  for (const p of rest) {
    const s = sectionFor(p.path);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(p);
  }
  const sections = [...groups.entries()]
    .sort(([a], [b]) => (a === 'Pages' ? -1 : b === 'Pages' ? 1 : a.localeCompare(b)))
    .map(([title, links]) => `  {\n    title: ${q(title)},\n    links: [\n${links.map((l) => emitLink(l, '      ')).join('\n')}\n    ],\n  },`)
    .join('\n');

  return `/**
 * src/data/llms.ts — what /llms.txt says about this site. Curated, not generated.
 *
 * Drafted by scripts/llms-draft.mjs from the pages that existed at the time; the
 * grouping below is mechanical (by first URL segment). Rewrite it the way you would
 * explain the site to a new hire: start-here pages first, then services, then
 * locations, then guides, then company. Titles are short labels. Descriptions say
 * what question the page answers. Keep facts stable (no review counts or prices
 * that drift).
 *
 * The build fails if a path here has no page, and warns about pages that exist but
 * are not listed. \`npm run llms:draft\` appends missing pages to UNSORTED below.
 */
import type { LlmsRegistry, LlmsLink } from '~/lib/llms';

export const LLMS: LlmsRegistry = {
  // One paragraph: what the company does, for whom, where. Empty → SITE.defaultDescription.
  summary: ${q(summary ?? '')},

  // Short, stable facts an assistant can state verbatim.
  facts: [
  ],

  sections: [
${sections}
  ],

  // Pages an assistant can skip when context is short.
  optional: [
${optional.map((l) => emitLink(l, '    ')).join('\n')}
  ],
};

// ── Pages found in src/pages but not listed above. Move each into a section, or
//    delete it to leave it out of the index. \`npm run llms:draft\` appends here.
export const UNSORTED: LlmsLink[] = [
];
`;
}

/* ───────────── main ───────────── */

const site = readSiteConfig();
const pages = discover(site);

if (!pages.length) {
  console.error(`llms-draft: no static pages found under ${relative(ROOT, PAGES)}.`);
  process.exit(1);
}

if (!existsSync(OUT) || flag('--force')) {
  const summary = opt('--summary') ?? site.defaultDescription ?? '';
  writeFileSync(OUT, emitFresh(pages, summary));
  console.log(`llms-draft: wrote ${relative(ROOT, OUT)} with ${pages.length} page(s) in a mechanical grouping.`);
  console.log('           Next: curate the sections, write the summary + facts, then `npm run build`.');
  const unresolved = pages.filter((p) => !p.resolved);
  if (unresolved.length) console.log(`           ${unresolved.length} page(s) need titles/descriptions checked by hand (marked in the file).`);
  process.exit(0);
}

const current = readFileSync(OUT, 'utf8');
const missing = pages.filter((p) => !new RegExp(`path:\\s*['"]${p.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`).test(current));
if (!missing.length) {
  console.log(`llms-draft: ${relative(ROOT, OUT)} already lists every page. Nothing to do.`);
  process.exit(0);
}
const marker = /(export const UNSORTED: LlmsLink\[\] = \[\n)([\s\S]*?)(\];)/;
if (!marker.test(current)) {
  console.error(`llms-draft: ${relative(ROOT, OUT)} has no UNSORTED block to append to. Add:\n\nexport const UNSORTED: LlmsLink[] = [\n];\n`);
  process.exit(1);
}
const updated = current.replace(marker, (_m, open, body, close) => {
  const existing = body.trim();
  const added = missing.map((p) => emitLink(p, '  ')).join('\n');
  return `${open}${existing ? '  ' + existing + '\n' : ''}${added}\n${close}`;
});
writeFileSync(OUT, updated);
console.log(`llms-draft: appended ${missing.length} page(s) to UNSORTED in ${relative(ROOT, OUT)}:`);
for (const p of missing) console.log(`  + ${p.path}  (${p.title})`);
console.log('           They render under "## More pages" until you move them into a section.');
