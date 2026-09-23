# AGP Astro Client Site

This is an Alloy Growth Partners client website project built on the AGP Astro starter template.

## When asked to "kick off" a client

Run `scripts/kickoff.py` in non-interactive mode. Do not ask what deliverable they want — the kickoff script handles everything.

Steps:
1. Check `exports/` for a Screaming Frog CSV (`sf_*.csv`) — auto-detected
2. Check `_client/` for a master brief (`master_brief.*`) — auto-detected
3. If either is missing, ask the user before proceeding
4. Ahrefs API key: `3myKzF_dndiUi6Es5w9gHwukKT1Ygw0pZcpBTWRN`
5. Run the script via bash:

```bash
cd /path/to/repo && python3 scripts/kickoff.py \
  --name "CLIENT NAME" \
  --domain "clientdomain.com" \
  --owner "Skyler" \
  --twitter "@handle" \
  --phone "(XXX) XXX-XXXX" \
  --city "City" \
  --state "ST" \
  --description "Meta description here" \
  --tagline "Short tagline here" \
  --notify "notify@email.com" \
  --ahrefs-api-key "KEY_FROM_MEMORY" \
  --yes
```

Pass `--sf-export` and/or `--brief` flags if those files were found or provided.

## What kickoff.py does

1. Generates `_build/{slug}_seo_tracker.xlsx`
2. Generates `_build/{slug}_launch_readiness.html` (with Ahrefs backlink data)
3. Copies master brief to `_build/` if present
4. Updates `astro.config.mjs`, `src/config/site.ts`, `src/lib/email.config.ts`, `package.json`
5. Configures the Alloy Preview Review widget — generates `src/config/review.ts` from the site's pages (all `review:false`) and sets a unique localStorage prefix (`{slug}_`) in `BaseLayout.astro` so review state never collides between client sites
6. Writes `.env` with integration keys

## Project structure

```
exports/          ← Drop Screaming Frog CSV here before kickoff (gitignored)
_client/          ← Drop master brief here before kickoff
_build/           ← Generated outputs (gitignored)
scripts/
  kickoff.py      ← Main entry point — run this for every new client
  setup.py        ← Called by kickoff.py
  build_launch_checker.py
  build_seo_tracker.py
src/
  config/site.ts    ← All SEO + org defaults
  config/review.ts  ← Alloy Preview Review widget config (pages, Pastel link, ticket)
  lib/email.config.ts
```

## After kickoff — what still needs human hands

- Add logo → `public/assets/logo.svg`
- Add OG image → `public/assets/og.png` (1200×630px)
- Add favicon → `public/assets/favicon.png`
- Set up Resend DNS for the client domain
- Add env vars to Vercel (copy from `.env`, set `PUBLIC_ENV=production` on prod project)
- Review widget — create the Pastel project and paste its share link into `PASTEL_BASE` in `src/config/review.ts` (trailing `#` required); add `REVIEW_SLACK_WEBHOOK` + `ZENDESK_*` to the **stg** Vercel project only (never prod). The widget renders only on stg — it's guarded by `PUBLIC_ENV !== 'production'` — and only shows pages flipped to `review:true`. Full reference: `review-widget-guide.html` in this repo.
- Add `FORM_ALERT_SLACK_URL` to Vercel — the same Slack Incoming Webhook URL the `resend-slack-alerts` project uses, so form send-failure alerts land in the same channel. Leave blank to disable (forms still work). The helper is `src/lib/form-alert.ts`, already wired into all three API routes (contact/lead/subscribe).

## Newsletter landing page (`/newsletter`) — Mailchimp-driven, zero per-issue editing

Ported from the Edison site, then made fully automatic. The page is **prerendered**: at build time it reads the sent campaigns in one Mailchimp campaign folder and renders the newest as the current issue and the rest as the archive. A Mailchimp webhook fires a Vercel deploy hook on every send, so the page rebuilds itself. Nobody edits anything per issue.

What comes from the campaign (see `src/lib/newsletter-content.ts` for the rules, tuned to the "Notes For Boards" template):

| On the page | Source in Mailchimp |
|---|---|
| Headline | subject line (template's biggest headline if missing) |
| Issue label ("October 2026") | the "Month YYYY" block in the template header; else the send month |
| Intro paragraph | first real paragraph after the "In This Issue" list, clipped to whole sentences; else preview text |
| "In this issue" list | the template's own numbered "In This Issue" list; else the large-font section headlines |
| Hero image | first content image ≥ 300px wide; else the fallback photo in `newsletter.json` (the current template is text-led, so the fallback shows) |
| "Read the full issue" | `long_archive_url` |
| Archive rows | past sent campaigns: send month, subject line, preview text, archive link |

Files:

```
src/pages/newsletter.astro            ← the page (current issue · subscribe · ask · archive)
src/lib/newsletter.ts                 ← build-time Mailchimp fetch (campaign list + content)
src/lib/newsletter-content.ts         ← pulls label / sections / intro / hero out of the campaign HTML
src/data/newsletter/newsletter.json   ← EVERGREEN copy only: name, blurbs, Ask block, fallback hero, pre-launch state
src/components/newsletter/AskForm.jsx ← the only hydrated island
src/styles/newsletter.css             ← `nl-` prefixed styles
src/pages/api/newsletter-ask.ts       ← Ask form → Mailchimp upsert + email to info@ + Slack
src/pages/api/newsletter-webhook.ts   ← Mailchimp "campaign sending" → Vercel deploy hook
```

Setup (done for CMGT on 2026-09-22 via the Vercel + Mailchimp APIs; repeat for a new client):

1. **Mailchimp folder** — a campaign folder (CMGT: `CMGT Newsletter`, id `eb19e4ea02`). Only campaigns inside it count; drafts and tests are ignored until sent. Its id goes in `MAILCHIMP_NEWSLETTER_FOLDER_ID` (Production + Preview) on the Vercel project. Find ids with `GET /3.0/campaign-folders`.
2. **Vercel deploy hook** — project → Settings → Git → Deploy Hooks (branch `main`); URL in `VERCEL_DEPLOY_HOOK_URL` (Production). Can also be created with `POST /v1/projects/{name}/deploy-hooks`.
3. **Mailchimp webhook** — Audience → Settings → Webhooks (or `POST /3.0/lists/{list}/webhooks`): `https://<domain>/api/newsletter-webhook?secret=<MAILCHIMP_WEBHOOK_SECRET>`, event **Campaign sending only**. Mailchimp GETs the URL on save, so the route must already be live on production. Secret in `MAILCHIMP_WEBHOOK_SECRET` (Production).

Until the first campaign in the folder is sent, the page renders the "coming soon" state from `newsletter.json` with the subscribe strip and Ask form fully working.

Mailchimp tags written by the site: `newsletter-footer` (footer form), `newsletter-page` (landing-page strip), `newsletter-ask` + `asked-YYYY-MM` (Ask form). Footer and page sign-ups are double opt-in; an asker who unticks the newsletter box is stored as `transactional` and never mailed.
