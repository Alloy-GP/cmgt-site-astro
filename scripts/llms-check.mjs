#!/usr/bin/env node
/**
 * scripts/llms-check.mjs — prove, against a LIVE site, that AI assistants can read it.
 *
 *   npm run llms:check -- https://cmgt.org
 *   node scripts/llms-check.mjs https://cmgt.org https://alloygp.co ...   # every client in one run
 *   node scripts/llms-check.mjs http://localhost:4321 --no-bots            # dev server
 *   flags: --json (machine output)  --no-bots (skip user-agent probes)  --quiet (errors only)
 *
 * What it checks, per site:
 *   1. /robots.txt      200, has a Sitemap line that resolves, and every AI crawler
 *                       token is allowed to fetch "/" under the real robots.txt rules.
 *   2. /llms.txt        200, text, spec shape (H1, blockquote, H2 link sections), and
 *                       EVERY link returns 200 on the same host with no redirect.
 *   3. sitemap          cross-check: llms.txt links missing from the sitemap, and
 *                       sitemap URLs the index does not mention (information).
 *   4. /llms-full.txt   200, text, one "URL:" block per indexed link.
 *   5. bot reachability "/" fetched with each AI crawler's user-agent returns 200 and
 *                       real HTML — catches Vercel/Cloudflare bot challenges that
 *                       robots.txt can't tell you about.
 *
 * Exit code 1 when any site has an error. Zero dependencies. Node 18+.
 */

const args = process.argv.slice(2);
const SITES = args.filter((a) => !a.startsWith('--')).map((u) => u.replace(/\/+$/, ''));
const JSON_OUT = args.includes('--json');
const NO_BOTS = args.includes('--no-bots');
const QUIET = args.includes('--quiet');

if (!SITES.length) {
  console.error('usage: node scripts/llms-check.mjs <https://site> [more sites…] [--json] [--no-bots] [--quiet]');
  process.exit(2);
}

/** robots.txt tokens that must be allowed to fetch "/". Token → user-agent string for the live probe (null = token only). */
const AI_AGENTS = {
  'GPTBot':             'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot':      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'ChatGPT-User':       'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  'ClaudeBot':          'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Claude-SearchBot':   'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +Claude-SearchBot@anthropic.com)',
  'Claude-User':        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  'anthropic-ai':       null,
  'PerplexityBot':      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  'Perplexity-User':    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
  'Google-Extended':    null,
  'Googlebot':          'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.0.0 Safari/537.36',
  'Bingbot':            'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  'Applebot':           'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  'Applebot-Extended':  null,
  'DuckAssistBot':      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; DuckAssistBot/1.0; +http://duckduckgo.com/duckassistbot)',
  'Amazonbot':          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
  'meta-externalagent': 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
  'MistralAI-User':     'Mozilla/5.0 (compatible; MistralAI-User/1.0; +https://docs.mistral.ai/robots)',
  'CCBot':              'CCBot/2.0 (https://commoncrawl.org/faq/)',
};

const CHALLENGE_MARKERS = /Vercel Security Checkpoint|Just a moment\.\.\.|cf-browser-verification|cf_chl_|Attention Required!|Access denied|Checking your browser|challenge-platform/i;

/* ───────────────────────────── helpers ───────────────────────────── */

async function get(url, { ua, redirect = 'follow', timeout = 15_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { 'user-agent': ua ?? 'llms-check/1.0 (+https://alloygp.co)', accept: 'text/html,text/plain,application/xml;q=0.9,*/*;q=0.8' }, redirect, signal: ctrl.signal });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text, finalUrl: res.url || url, location: res.headers.get('location') };
  } catch (e) {
    return { status: 0, headers: new Headers(), text: '', finalUrl: url, error: e?.name === 'AbortError' ? 'timeout' : String(e?.message ?? e) };
  } finally {
    clearTimeout(t);
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const norm = (u) => { try { const x = new URL(u); x.hash = ''; x.search = ''; let p = x.pathname.replace(/\/+$/, '') || '/'; return x.origin.toLowerCase() + p; } catch { return u; } };

/* ───────────────────────────── robots.txt ───────────────────────────── */

function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let cur = null;
  let lastWasAgent = false;
  for (let raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(); const val = m[2].trim();
    if (key === 'sitemap') { sitemaps.push(val); continue; }
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') cur.rules.push({ allow: key === 'allow', path: val });
  }
  return { groups, sitemaps };
}

/** Google-style evaluation: most specific group, longest matching rule wins, Allow beats Disallow on ties. */
function robotsAllows(robots, token, path = '/') {
  const t = token.toLowerCase();
  let group = robots.groups.find((g) => g.agents.includes(t)) ?? robots.groups.find((g) => g.agents.some((a) => a !== '*' && t.startsWith(a)));
  if (!group) group = robots.groups.find((g) => g.agents.includes('*'));
  if (!group) return { allowed: true, via: 'no matching group' };
  let best = null;
  for (const r of group.rules) {
    if (r.path === '' ) { if (!r.allow) continue; }
    const re = new RegExp('^' + r.path.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$'));
    if (re.test(path)) {
      const len = r.path.length;
      if (!best || len > best.len || (len === best.len && r.allow && !best.allow)) best = { len, allow: r.allow, path: r.path };
    }
  }
  const allowed = best ? best.allow : true;
  return { allowed, via: `group [${group.agents.join(', ')}]${best ? ` rule "${best.allow ? 'Allow' : 'Disallow'}: ${best.path}"` : ' (no rule matched)'}` };
}

/* ───────────────────────────── llms.txt ───────────────────────────── */

function parseLlms(text) {
  const lines = text.split(/\r?\n/);
  const h1 = lines.find((l) => /^# \S/.test(l));
  const blockquote = lines.find((l) => /^> \S/.test(l));
  const sections = [];
  let cur = null;
  for (const l of lines) {
    const h2 = l.match(/^## (.+)$/);
    if (h2) { cur = { title: h2[1].trim(), links: [] }; sections.push(cur); continue; }
    const link = l.match(/^- \[([^\]]*)\]\(([^)\s]+)\)(?::\s*(.*))?$/);
    if (link && cur) cur.links.push({ title: link[1], url: link[2], description: link[3] ?? '' });
  }
  return { h1: h1?.slice(2).trim(), blockquote: blockquote?.slice(2).trim(), sections };
}

/* ───────────────────────────── sitemap ───────────────────────────── */

async function sitemapUrls(url, depth = 0) {
  if (depth > 2) return [];
  const res = await get(url);
  if (res.status !== 200) return null;
  const locs = [...res.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (/<sitemapindex/i.test(res.text)) {
    const nested = await mapLimit(locs, 4, (u) => sitemapUrls(u, depth + 1));
    return nested.flat().filter(Boolean);
  }
  return locs;
}

/* ───────────────────────────── per-site run ───────────────────────────── */

async function checkSite(site) {
  const r = { site, errors: [], warnings: [], info: [], ok: [] };
  const err = (m) => r.errors.push(m); const warn = (m) => r.warnings.push(m); const ok = (m) => r.ok.push(m); const info = (m) => r.info.push(m);
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(site);

  // 1. robots.txt
  const robotsRes = await get(`${site}/robots.txt`);
  let robots = null;
  if (robotsRes.status !== 200) err(`robots.txt: HTTP ${robotsRes.status || robotsRes.error}`);
  else {
    robots = parseRobots(robotsRes.text);
    const blocked = Object.keys(AI_AGENTS).map((t) => ({ t, ...robotsAllows(robots, t, '/') })).filter((x) => !x.allowed);
    if (blocked.length) for (const b of blocked) err(`robots.txt blocks ${b.t} from "/" via ${b.via}`);
    else ok(`robots.txt allows all ${Object.keys(AI_AGENTS).length} AI crawler tokens to fetch "/"`);
    if (!robots.sitemaps.length) err('robots.txt has no Sitemap: line');
    else {
      for (const sm of robots.sitemaps) {
        const smRes = await get(sm);
        if (smRes.status !== 200) (isLocal ? warn : err)(`robots.txt Sitemap ${sm} → HTTP ${smRes.status || smRes.error}${isLocal ? ' (expected on a dev server: the sitemap is built by `astro build`)' : ''}`);
        else if (!sm.toLowerCase().startsWith(site.toLowerCase())) (isLocal ? info : warn)(`robots.txt Sitemap ${sm} is on a different host than ${site}${isLocal ? ' (expected on a dev server)' : ''}`);
        else ok(`robots.txt Sitemap resolves: ${sm}`);
      }
    }
    if (!/llms\.txt/i.test(robotsRes.text)) info('robots.txt does not mention llms.txt (a comment pointing to it is a harmless courtesy)');
  }

  // 2. llms.txt
  const llmsRes = await get(`${site}/llms.txt`, { redirect: 'manual' });
  let links = [];
  if (llmsRes.status !== 200) err(`llms.txt: HTTP ${llmsRes.status || llmsRes.error}${llmsRes.location ? ` → ${llmsRes.location}` : ''}`);
  else {
    const ct = llmsRes.headers.get('content-type') ?? '';
    if (!/^text\/(plain|markdown)/i.test(ct)) warn(`llms.txt content-type is "${ct}" (expected text/plain or text/markdown)`);
    const parsed = parseLlms(llmsRes.text);
    if (!parsed.h1) err('llms.txt: missing "# Title" first heading');
    if (!parsed.blockquote) warn('llms.txt: missing "> summary" blockquote');
    links = parsed.sections.flatMap((s) => s.links.map((l) => ({ ...l, section: s.title })));
    if (!links.length) err('llms.txt: no "- [title](url): description" entries under any "## Section"');
    const bytes = Buffer.byteLength(llmsRes.text);
    if (bytes > 32 * 1024) warn(`llms.txt is ${(bytes / 1024).toFixed(1)} KB — it should be an index, not the content`);
    if (/\bTODO\b/.test(llmsRes.text)) err('llms.txt still contains "TODO"');
    if (parsed.sections.some((s) => s.title === 'More pages')) warn('llms.txt has a "More pages" section: pages are sitting in UNSORTED and have not been curated');
    const offHost = links.filter((l) => !norm(l.url).startsWith(norm(site)));
    if (offHost.length === links.length && links.length) (isLocal ? info : warn)(`llms.txt links point at ${new URL(links[0].url).origin}, not ${site}${isLocal ? ' (expected on a dev server: links use the configured site URL; they are probed on this host below)' : ' — is astro.config site: wrong for this deployment?'}`);
    else for (const l of offHost) warn(`llms.txt link is on another host: ${l.url}`);
    const insecure = links.filter((l) => /^http:\/\//i.test(l.url) && !isLocal);
    for (const l of insecure) err(`llms.txt link is not https: ${l.url}`);
    const noDesc = links.filter((l) => !l.description);
    if (noDesc.length) info(`${noDesc.length} llms.txt link(s) have no description`);
    if (parsed.h1 && links.length) ok(`llms.txt parses: "${parsed.h1}", ${parsed.sections.length} sections, ${links.length} links, ${(bytes / 1024).toFixed(1)} KB`);

    // Every link must be a live, non-redirecting page on this deployment.
    const probe = await mapLimit(links, 8, async (l) => {
      const target = isLocal || !norm(l.url).startsWith(norm(site)) ? l.url.replace(/^https?:\/\/[^/]+/, site) : l.url;
      const res = await get(target, { redirect: 'manual' });
      return { l, target, res };
    });
    let liveCount = 0;
    const noindex = [];
    for (const { target, res } of probe) {
      if (res.status >= 300 && res.status < 400) err(`llms.txt link redirects (stale path — update it): ${target} → ${res.location}`);
      else if (res.status !== 200) err(`llms.txt link is not 200: ${target} → HTTP ${res.status || res.error}`);
      else if (!/text\/html/i.test(res.headers.get('content-type') ?? '')) warn(`llms.txt link is not HTML: ${target} (${res.headers.get('content-type')})`);
      else {
        liveCount++;
        if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(res.text)) noindex.push(target);
      }
    }
    if (liveCount === links.length && links.length) ok(`all ${links.length} llms.txt links return 200 HTML with no redirect`);
    if (noindex.length === links.length) warn(`every page carries <meta name="robots" content="noindex"> — expected on stg/preview (PUBLIC_ENV != production); MUST be 0 on production`);
    else for (const u of noindex) warn(`llms.txt link is noindex (list it under Optional or drop it): ${u}`);
  }

  // 3. sitemap cross-check
  if (robots?.sitemaps?.length && links.length) {
    const smUrl = isLocal ? robots.sitemaps[0].replace(/^https?:\/\/[^/]+/, site) : robots.sitemaps[0];
    const all = await sitemapUrls(smUrl);
    if (all === null) (isLocal ? info : warn)(`sitemap cross-check skipped: ${smUrl} not readable`);
    else {
      const smSet = new Set(all.map(norm));
      const llmsSet = new Set(links.map((l) => norm(l.url)));
      const notInSitemap = [...llmsSet].filter((u) => !smSet.has(u));
      const notInLlms = [...smSet].filter((u) => !llmsSet.has(u));
      for (const u of notInSitemap) warn(`listed in llms.txt but not in the sitemap: ${u}`);
      if (notInLlms.length) info(`${notInLlms.length} sitemap URL(s) not in llms.txt (fine if intentional): ${notInLlms.slice(0, 12).join(', ')}${notInLlms.length > 12 ? ', …' : ''}`);
      if (!notInSitemap.length) ok(`every llms.txt link is also in the sitemap (${all.length} sitemap URLs total)`);
    }
  }

  // 4. llms-full.txt
  const fullRes = await get(`${site}/llms-full.txt`, { redirect: 'manual', timeout: 60_000 });
  if (fullRes.status !== 200) err(`llms-full.txt: HTTP ${fullRes.status || fullRes.error}`);
  else {
    const ct = fullRes.headers.get('content-type') ?? '';
    if (!/^text\/(plain|markdown)/i.test(ct)) warn(`llms-full.txt content-type is "${ct}"`);
    const urlBlocks = (fullRes.text.match(/^URL: /gm) ?? []).length;
    const unavailable = (fullRes.text.match(/Page text unavailable/g) ?? []).length;
    const kb = (Buffer.byteLength(fullRes.text) / 1024).toFixed(0);
    const sectionLinks = links.filter((l) => l.section !== 'Optional').length;
    if (unavailable) err(`llms-full.txt: ${unavailable} page(s) could not be fetched when the file was generated (X-Llms-Pages ${fullRes.headers.get('x-llms-pages')})`);
    if (links.length && urlBlocks !== sectionLinks) warn(`llms-full.txt has ${urlBlocks} page blocks but llms.txt lists ${sectionLinks} non-optional links`);
    if (Number(kb) < 5) warn(`llms-full.txt is only ${kb} KB — is the content region being found?`);
    if (!unavailable && (!links.length || urlBlocks === sectionLinks)) ok(`llms-full.txt: ${urlBlocks} pages, ${kb} KB, cache "${fullRes.headers.get('cache-control')}"`);
  }

  // 5. bot reachability
  if (!NO_BOTS) {
    const probes = Object.entries(AI_AGENTS).filter(([, ua]) => ua);
    const results = await mapLimit(probes, 4, async ([token, ua]) => ({ token, res: await get(`${site}/`, { ua }) }));
    let fine = 0;
    for (const { token, res } of results) {
      if (res.status !== 200) err(`"/" as ${token} → HTTP ${res.status || res.error} (bot blocked at the edge — check Vercel Firewall / Cloudflare bot settings)`);
      else if (CHALLENGE_MARKERS.test(res.text) || !/<title/i.test(res.text)) err(`"/" as ${token} → challenge/interstitial page, not the site`);
      else fine++;
    }
    if (fine === probes.length) ok(`"/" returns real HTML to all ${probes.length} AI user-agents (no edge challenge)`);
  }

  return r;
}

/* ───────────────────────────── main ───────────────────────────── */

const results = [];
for (const site of SITES) {
  const r = await checkSite(site);
  results.push(r);
  if (!JSON_OUT) {
    console.log(`\n${r.errors.length ? '✗' : '✓'} ${site}`);
    if (!QUIET) for (const m of r.ok) console.log(`   ✓ ${m}`);
    for (const m of r.errors) console.log(`   ✗ ${m}`);
    if (!QUIET) for (const m of r.warnings) console.log(`   ! ${m}`);
    if (!QUIET) for (const m of r.info) console.log(`   · ${m}`);
    console.log(`   ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  }
}
if (JSON_OUT) console.log(JSON.stringify(results, null, 2));
process.exit(results.some((r) => r.errors.length) ? 1 : 0);
