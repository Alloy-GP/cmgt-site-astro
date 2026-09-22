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

## Newsletter landing page (`/newsletter`) — Mailchimp-driven

Ported from the Edison site. The page is **prerendered**: at build time it reads the sent campaigns in one Mailchimp campaign folder and renders the newest as the current issue and the rest as the archive. A Mailchimp webhook fires a Vercel deploy hook on every send, so the page rebuilds itself — no manual redeploy per issue.

Files:

```
src/pages/newsletter.astro            ← the page (current issue · subscribe · ask · archive)
src/lib/newsletter.ts                 ← build-time Mailchimp fetch + merge with the seed
src/data/newsletter/current.json      ← MONTHLY EDIT: hero, "in this issue", ask block
src/components/newsletter/AskForm.jsx ← the only hydrated island
src/styles/newsletter.css             ← `nl-` prefixed styles
src/pages/api/newsletter-ask.ts       ← Ask form → Mailchimp upsert + email to info@ + Slack
src/pages/api/newsletter-webhook.ts   ← Mailchimp "campaign sent" → Vercel deploy hook
```

What still needs human hands (one-time):

1. **Mailchimp folder** — Campaigns → create a folder named `CMGT Newsletter`. Every monthly send must live in it (drafts and tests can too; only `status=sent` campaigns are read). Get its id:
   ```bash
   curl -s -u "anystring:$MAILCHIMP_API_KEY" \
     "https://$MAILCHIMP_SERVER_PREFIX.api.mailchimp.com/3.0/campaign-folders?count=100" | jq '.folders[]|{id,name}'
   ```
   Set `MAILCHIMP_NEWSLETTER_FOLDER_ID` on the `cmgt-site-astro` Vercel project for **Production and Preview** so staging previews show real content too. The existing `MAILCHIMP_API_KEY` / `MAILCHIMP_SERVER_PREFIX` are reused. Until the folder id is set, the page renders the seed in `current.json`.
2. **Vercel deploy hook** — `cmgt-site-astro` → Settings → Git → Deploy Hooks → create one for `main`. Set the URL as `VERCEL_DEPLOY_HOOK_URL` (Production only).
3. **Mailchimp webhook** — Audience → Settings → Webhooks → add `https://cmgt.org/api/newsletter-webhook?secret=<MAILCHIMP_WEBHOOK_SECRET>` and tick **only** "Campaign sending". Set the same secret as `MAILCHIMP_WEBHOOK_SECRET` (Production only). Mailchimp pings the URL with a GET on save, so the route has to be live on production first.
4. **Mailchimp campaign settings** — the page uses the campaign's **subject line** as the H1 and its **preview text** as the archive blurb, so write both for readers, not internally. Each campaign's "Ask a question" CTA should link to `https://cmgt.org/newsletter#ask`.
5. **Confirm the ask inbox** — questions currently route to `info@cmgt.org` (`routes.newsletter` in `src/lib/email.config.ts`); the confirmation promises a reply within one business day.

Monthly (per issue): edit `src/data/newsletter/current.json` — `heroImg` / `heroAlt` / `ogImage`, the `inThisIssue` bullets, and the `ask` block (title, prompts, placeholder). Title, date, "read the full issue" link, and the archive come from Mailchimp automatically. Merge to `main` before the send so the rebuild picks the new seed up.

Mailchimp tags written by the site: `newsletter-footer` (footer form), `newsletter-page` (landing-page strip), `newsletter-ask` + `asked-YYYY-MM` (Ask form). Footer and page sign-ups are double opt-in; an asker who unticks the newsletter box is stored as `transactional` and never mailed.
