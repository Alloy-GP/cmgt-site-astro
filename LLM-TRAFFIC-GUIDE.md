# LLM traffic handling — the AGP standard

How every AGP client site tells AI assistants (ChatGPT, Claude, Perplexity, Gemini,
Copilot, Apple Intelligence, Meta AI) what the business is, lets their crawlers in,
hands them the whole site in one request, and **proves it is working from the outside**.

The kit is five files plus a robots.txt block. It is the same on every site; only
`src/data/llms.ts` is written per client. The starter kit (`agp-astro-starter`)
ships it, kickoff seeds the registry, and `npm run llms:check` verifies any live
site in under a minute.

---

## 1. What ships on every site

| URL / file | What it is | How it is produced |
|---|---|---|
| `/llms.txt` | The curated index AI assistants read first ([llmstxt.org](https://llmstxt.org/)): one H1, a one-paragraph summary, a short list of stable facts (offices, phones, service area, credentials), then H2 sections of `[title](url): what the page answers`. Legal pages go under `## Optional`. | `src/pages/llms.txt.ts` — **prerendered** at build from `src/data/llms.ts`. A static file in production; zero per-request cost. |
| `/llms-full.txt` | Every indexed page's text in one plain-text file, so an agent can ingest the site in a single request. Each page is a block: `Page:`, `URL:` (the canonical to cite), `Section:`, then the `<main>` content as Markdown. | `src/pages/llms-full.txt.ts` — **server-rendered on demand**, fetching this deployment's own pages, cached at the CDN for a day (`s-maxage=86400, stale-while-revalidate=604800`). ~450 KB for CMGT's 48 pages. |
| `public/robots.txt` | Allows every AI crawler explicitly (search/answer bots **and** training bots) and points at `llms.txt`. | Static. Template in the starter. |
| `src/data/llms.ts` | The one per-client file: summary, facts, sections, optional. | Seeded by `npm run llms:draft`, then curated by hand. |
| `src/lib/llms.ts` | Rendering, validation, route table, HTML→Markdown. Pure functions, no Astro imports. | Shared. Never edited per client. |
| `scripts/llms-draft.mjs` | Reads every static page's `title`/`description` from its layout tag and writes/updates the registry. | `npm run llms:draft` |
| `scripts/llms-check.mjs` | External verifier: run it against any live URL. | `npm run llms:check -- https://client.com` |

## 2. How it stays correct without anyone remembering

These are the guard rails. They are the reason this can be rolled out everywhere
and left alone.

- **The build fails** if `src/data/llms.ts` lists a path with no page in `src/pages`
  (typo, renamed, deleted), lists a path twice, uses a trailing slash, lists an
  `/api/*` route, or if any rendered text still says `TODO`. A broken index can
  never deploy.
- **The build warns** `page not listed: /x` for every static page that exists but is
  not in the registry. Nothing goes missing silently. `npm run llms:draft` appends
  those pages to the `UNSORTED` block; until they are moved into a section they
  render under `## More pages`, so they are still discoverable in the meantime.
- **The draft tool never touches curated copy.** It only appends paths it cannot
  find anywhere in the file. Run it as often as you like.
- **`llms-full.txt` degrades, never breaks.** A page that cannot be fetched gets a
  stub with its URL and the response is cached for only 10 minutes instead of a day,
  so a transient failure heals itself. It fetches with `redirect: 'manual'`, so a
  stale path shows up as a stub instead of silently following a 301.
- **Count-up stats are read from their `data-count-to` attribute**, so the text says
  "389 communities", not the "0" the HTML starts with before JavaScript runs.
- **Name and canonical URL come from `SITE`** (`src/config/site.ts`), the same source
  as the meta tags and JSON-LD. Previews fetch their own pages but link to the
  canonical host.
- **`npm run llms:check`** verifies the live result from outside the stack, including
  the thing robots.txt cannot tell you: whether the edge (Vercel Firewall, Cloudflare)
  is challenging bot user-agents.

## 3. Rolling it out to an existing client site

Prerequisites (true of every AGP Astro site): Astro 5, `~/*` path alias in
`tsconfig.json`, `SITE` exported from `src/config/site.ts` with `name`, `url`,
`defaultDescription`, and `trailingSlash: 'never'` in `astro.config.mjs`. If a site
uses `trailingSlash: 'always'`, flip the trailing-slash rule in `validateRegistry`
(one line) and give the registry paths trailing slashes.

1. **Copy the kit** from the starter (canonical) or from CMGT (reference implementation):
   ```bash
   # from the client repo root; STARTER = path to agp-astro-starter
   for f in src/lib/llms.ts src/pages/llms.txt.ts src/pages/llms-full.txt.ts \
            scripts/llms-draft.mjs scripts/llms-check.mjs LLM-TRAFFIC-GUIDE.md; do
     mkdir -p "$(dirname "$f")" && cp "$STARTER/$f" "$f"
   done
   npm pkg set scripts.llms:draft="node scripts/llms-draft.mjs" scripts.llms:check="node scripts/llms-check.mjs"
   ```
2. **Seed the registry:** `npm run llms:draft`. It writes `src/data/llms.ts` with
   every indexable page grouped mechanically by first URL segment, titles with the
   brand suffix stripped, meta descriptions as placeholders, legal pages under
   `optional`, and `SITE.defaultDescription` as the summary. Noindex pages, API
   routes, dynamic routes and 404 are skipped.
3. **Curate it** (section 5 below). This is the only step that takes thought. Budget
   30–45 minutes for a 50-page site.
4. **robots.txt:** replace the file with the starter's template, set the domain in
   the two comment lines and the `Sitemap:` line. Keep any client-specific
   `Disallow` rules and repeat them in the AI group (groups do not inherit from `*`).
5. **Build:** `npm run build`. Fix every `[llms.txt]` error; clear every warning
   by listing or deliberately dropping the page it names.
6. **Dev check:** `npm run dev` then `npm run llms:check -- http://localhost:4321 --no-bots`.
   Expect 0 errors. The "every page carries noindex" warning is normal off
   production.
7. **PR, deploy to stg, check stg:** `npm run llms:check -- https://<stg-url> --no-bots`
   (preview deployments behind Vercel protection will show 401s; check prod instead).
8. **Deploy to production, then check production with bots on:**
   `npm run llms:check -- https://client.com`. All green or fix it. Save the output
   in the launch tracker.
9. **Edge settings (dashboard, once per project):**
   - Vercel → project → Firewall: *Bot Protection* / *AI Bots* managed rules must be
     **off or Log**, never Deny or Challenge. Attack Challenge Mode must be off.
   - Cloudflare (if the client's DNS proxies through it): *Security → Bots → Block AI
     bots* must be **off**; it defaults **on** for zones created since July 2025.
   - The bot-reachability probe in `llms:check` is the proof either way.
10. **Measurement (GA4, once per property):** section 7.

## 4. New sites

Nothing to do. The starter ships the kit; `kickoff.py` seeds `src/data/llms.ts`
with the homepage and proposal page using the `--description` as the summary, and
writes the domain into robots.txt. As pages are added the build warns; before
launch run `npm run llms:draft`, curate, and run `llms:check` against production as
part of the launch checklist.

## 5. Writing `src/data/llms.ts`

Write it the way you would brief a new hire who has to answer the phone tomorrow.

- **Summary (one paragraph):** who the company is, what it does, for whom, where,
  since when, and the one thing that distinguishes it. No adjectives that cannot be
  verified on the site.
- **Facts (8–10 bullets):** headquarters address and phone, every office with its
  local phone, service area, the services list, credentials, how the service model
  works, values/tagline, how to start (and the response promise), what existing
  customers can do online, community giving. These are the lines an assistant will
  quote verbatim, so they must be true on the site today and stable between deploys.
  Leave out review counts, star ratings, prices, and community counts that change
  (say "nearly 400" only if the site says it).
- **Sections, in this order:** Start here (home, main service, how it works, FAQ,
  testimonials, contact) → Services → Locations → Guides → Laws/reference → For
  existing customers → Company. Six to eight sections.
- **Titles** are short labels ("HOA reserve study guide"), never the SEO `<title>`.
- **Descriptions** say what question the page answers in one line, not the meta
  description's marketing copy. Under 160 characters is ideal; the validator warns
  past 240.
- **Optional** holds privacy, terms, cookies: pages an assistant may skip.
- The file is ~11 KB for a 50-page site. The validator warns past 32 KB; if you hit
  that, you are describing content instead of indexing it.

## 6. The robots.txt policy and why

Everything is allowed, including training crawlers. Reasoning: these are marketing
sites whose only goal is to be found and recommended. Being in training data means
the model already "knows" the brand when a board member asks for HOA management
companies in Baton Rouge; blocking GPTBot or CCBot protects content these clients
*want* copied. The explicit per-bot group exists because a crawler uses the most
specific group that names it and ignores `*`: a future blanket restriction on `*`
can never silently cut the AI crawlers off, and the intent is documented in the file.

Tokens listed (all must be allowed for `/`; `llms:check` evaluates the real rules):
`OAI-SearchBot`, `ChatGPT-User`, `GPTBot` (OpenAI); `ClaudeBot`, `Claude-SearchBot`,
`Claude-User`, `anthropic-ai` (Anthropic); `PerplexityBot`, `Perplexity-User`;
`Google-Extended`, `Googlebot`; `Bingbot` (Copilot grounds on Bing); `Applebot`,
`Applebot-Extended`; `DuckAssistBot`; `Amazonbot`; `meta-externalagent`,
`meta-externalfetcher`; `MistralAI-User`; `cohere-ai`; `YouBot`; `CCBot`; `Bytespider`.

If a client ever insists on blocking training bots, block only `GPTBot`, `CCBot`,
`Bytespider`, `Google-Extended`, `Applebot-Extended`, `meta-externalagent`,
`anthropic-ai` — and keep the search/answer bots (`OAI-SearchBot`, `ChatGPT-User`,
`Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Googlebot`,
`Bingbot`, `Applebot`, `DuckAssistBot`) allowed. Update `AI_AGENTS` in
`scripts/llms-check.mjs` for that site or the check will fail on purpose.

## 7. Measuring LLM traffic

AI assistants send referrals with ordinary referrer headers (when they send one at
all), so GA4 can segment them. Once per property, in GA4 → Admin → Data display →
Channel groups → create a group with a channel **AI assistants** placed first, rule
*Session source matches regex*:

```
chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|anthropic\.com|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|bing\.com/chat|edgeservices\.bing\.com|you\.com|meta\.ai|mistral\.ai|duckduckgo\.com.*ia=chat|poe\.com|grok\.com|x\.ai|phind\.com|kagi\.com|komo\.ai
```

Then read it in Reports → Acquisition → Traffic acquisition with that channel group
selected, or build an exploration on *Session source* with the same regex. Expect
undercounting: Google AI Overviews report as `google / organic`, and many assistant
clicks arrive with no referrer and land in Direct. Trend matters more than level.
Ahrefs (already on every site) tracks AI Overview appearances per keyword under
*Site Explorer → Organic keywords → SERP features*; add it to the monthly report.

Server-side, every AI fetch of `llms.txt`, `llms-full.txt`, or any page shows up in
Vercel's request logs by user-agent. The response header `X-Llms-Pages: 48/48` on
`llms-full.txt` reports how many pages were assembled; anything under the total means
a page was unreachable at generation time.

## 8. `npm run llms:check` — reading the output

```
npm run llms:check -- https://cmgt.org                     # one site, with bot probes
node scripts/llms-check.mjs https://a.com https://b.com    # every client in one run; exit 1 if any site has an error
node scripts/llms-check.mjs http://localhost:4321 --no-bots
flags: --json  --no-bots  --quiet
```

| Line | Meaning / fix |
|---|---|
| `robots.txt blocks X from "/" via …` | A rule in the named group disallows `/` for that token. Fix robots.txt. |
| `"/" as X → HTTP 403/429` or `challenge/interstitial` | The edge is blocking that bot. Vercel Firewall or Cloudflare bot settings (section 3, step 9). |
| `llms.txt link redirects … → …` | Registry path is stale; use the destination path. The build will also fail on the next deploy if the page is gone. |
| `llms.txt link is not 200` | Dead page in the registry. Remove or fix. |
| `listed in llms.txt but not in the sitemap` | The page is probably noindex or excluded; either list it under Optional or drop it. |
| `N sitemap URL(s) not in llms.txt` | Information. Deliberate omissions are fine; otherwise `npm run llms:draft`. |
| `llms-full.txt: N page(s) could not be fetched` | Transient (re-request in 10 minutes) or a page that errors for non-browser user-agents. |
| `every page carries noindex` | Expected off production (`PUBLIC_ENV != production`). Must be absent on production. |
| `"More pages" section` | Pages are sitting in `UNSORTED`. Curate them. |

## 9. Decisions and known limits

- **llms.txt adoption by the big vendors is unconfirmed** as of October 2026. It is
  cheap, harmless, and increasingly fetched by agents and smaller tools; the robots
  policy, server-rendered HTML, schema, and the bot-reachability proof are what make
  AI visibility real today. This kit does all of it, so there is no bet on one file.
- **The .txt files are not `noindex`ed.** Some guides suggest it; it is unclear how
  AI search crawlers treat noindex on the file they are told to read, and the
  downside of a plain-text file appearing in Google is negligible.
- **`llms-full.txt` is server-rendered, not prerendered,** because most AGP pages are
  SSR (live Google ratings, newsletter content) and cannot be rendered to HTML at
  build time. Caching makes it cost one fan-out per day per deployment.
- **The HTML→Markdown converter is regex-based** and tuned for marketing pages:
  headings, paragraphs, lists, links, emphasis, tables, definition lists. It drops
  nav, forms, buttons, scripts, SVG, iframes. Nested same-name tags inside a dropped
  tag are the known blind spot. Output is for machines; it does not need to be pretty.
- **`Optional` pages are not in `llms-full.txt`.** Legal boilerplate is noise there.
- **Dynamic routes** (`[slug]`) satisfy the build-time path check for any value, so a
  typo in a dynamic path is only caught by `llms:check` against the live site.

## 10. Maintenance

- Adding pages: the build warns; run `npm run llms:draft`, move the entry into a
  section, write a real description. Two minutes.
- Removing or renaming pages: the build fails until the registry is fixed.
- Changing offices, phones, services, credentials: edit `facts` in the same PR.
- After any production deploy that touches pages: `npm run llms:check -- https://client.com`.
- Quarterly, across all clients: one `llms-check` run with every domain, saved to
  the ops tracker. Exit code 1 means something to fix.
