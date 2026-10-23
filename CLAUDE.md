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
- Add `CRON_SECRET` to Vercel (any long random string) so the daily form health check can run — see "Forms — knowing they work" below.

## Forms — knowing they work

Nobody should have to wonder whether the proposal form is working. Four things make it visible:

1. **Slack is the ledger.** Every submission posts to the forms channel (`FORM_SLACK_WEBHOOK`, falling back
   to `FORM_ALERT_SLACK_URL`) with *every* answer, split across sections when long:
   📬 delivered · ⚠️ not delivered (Resend refused the email — the post is the only copy) ·
   🪤 discarded (the honeypot was filled: a bot, or a browser/password-manager autofill — the answers are
   included so a real person can be followed up by hand) · 🚨 the Resend send itself failed.
2. **Daily heartbeat.** `/api/form-health` runs from a Vercel cron at 13:00 UTC (8am Central) and posts one
   ✅/🚨 line: Resend key + sending-domain verification, Slack webhook, Mailchimp audience, Pipedrive token,
   and that `PUBLIC_ENV` is production. No line in the morning = the cron is not running. Vercel sends
   `CRON_SECRET` as a bearer token; the same header works by hand:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://cmgt.org/api/form-health`
3. **GA4 funnel events** from the intake form — the list is in `src/lib/track.ts`. Mark `generate_lead` as a
   key event. Step drop-off = `proposal_step_viewed` by step; validation friction = `proposal_step_blocked`;
   failed POSTs = `form_submit_failed` (reason `network` or `http_<status>`). On stg/dev the events print to
   the browser console instead.
4. **Four ledgers must agree** for any date range: Slack 📬 posts, the newdevelopment@ inbox (every
   proposal, complete or "Started (incomplete)", goes to newdevelopment@ AND savannahestes@, nobody cc'd —
   Jeff is on nothing, by his request on 2026-10-23; see `routes` / `partialRoutes` in `email.config.ts`),
   Pipedrive deals in Savannah's pipeline, Mailchimp contacts tagged `website-lead`. If Slack shows more than the inbox, mail is being filtered: cmgt.org mail goes through
   AppRiver (arsmtp.com MX), which quarantines "our own domain from an outside server" by default. Have the
   client allowlist `notifications@mail.cmgt.org`, `hello@mail.cmgt.org`, and the envelope domain
   `send.mail.cmgt.org` (Amazon SES), then check the quarantine for past notifications.

Honeypot: the field is `contact_preference_other` (`src/lib/honeypot.ts`), rendered by `<Honeypot>` in
`IntakeForm.jsx` as read-only until focused, so autofill cannot fill it (it used to be `website`, which
Safari's contact AutoFill treats as the URL field). The server accepts the old name too. Rename it in
`honeypot.ts` only — never in one place.

Proposal CTAs link to `/request-a-proposal?intent=proposal`: the page reads the query string server-side and
renders the wizard directly (no picker, no flash). Generic "contact" links use the bare URL and land on the
picker. A client-side retry covers a dropped connection: a POST that got no response at all is sent once
more before the visitor sees an error; HTTP errors are not retried (Slack already has the alert).

## Pipedrive — proposal leads → Organization + Person + Deal

Every `proposal` submission — partial AND complete (never vendor/general/rental/resident) — is
pushed to Pipedrive by `src/lib/pipedrive.ts`. It is a no-op unless `PIPEDRIVE_API_TOKEN` is set
AND `PUBLIC_ENV=production`, and it never throws. Every answer is written into the deal's note.

**Partial → full handoff.** The wizard's contact step creates a Person and a deal titled
`Started, not submitted — Name` (owned by Savannah, in her pipeline), so an abandoned form is still
a deal she can chase. A partial from someone who picked the resident role is skipped (homeowner,
not a prospect). When the full form comes in, the full deal is created FIRST, then the partial deal
is deleted (Pipedrive keeps it recoverable for 30 days) — so a failure never leaves the lead with
nothing. If the full deal cannot be created, the partial stays and Slack shows ⚠️. The handoff does
not depend on Pipedrive's search index: the partial's Person + Deal ids are returned to the browser
and echoed back with the full submission (`partial_person_id` / `partial_deal_id`), so the same
Person is reused even if the index lags or the visitor corrected their email on the last step. A
deal id from the browser is only ever deleted if it is an open deal with the partial title prefix.
If a partial cannot be deleted, the Slack post says so (⚠️ "could not be removed — delete it by
hand"). Offline test of every path: `npm run test:pipedrive`.

**Where deals land, and whose.** Pipeline 12 "Sav - Warm & Closing", first stage ("WIP"), owned
by Savannah (user 26876223) — `DEAL_PIPELINE_ID` / `DEAL_STAGE_ID` / `DEAL_OWNER_ID` in
`src/lib/pipedrive.ts`; `PIPEDRIVE_PIPELINE_ID` / `PIPEDRIVE_STAGE_ID` / `PIPEDRIVE_OWNER_ID` on
Vercel override them (production is set to pipeline 12 and Savannah too). If Pipedrive rejects the routing
or a custom field, the deal is retried without them and the fallback is logged, so a lead is
never dropped from the CRM.

**Form answers → Pipedrive fields.** `FIELD_MAP` in `src/lib/pipedrive.ts` also writes chosen
answers into real Pipedrive fields (so they show in the deal summary and can be reported on).
The field is found by its NAME in Pipedrive (Settings → Data fields) at runtime and cached;
values are coerced to the field's type (numeric → number, option → option id, text → as typed).

| Form answer (fieldsJson label) | Pipedrive field | Where |
|---|---|---|
| Number of units | Number of Homes — a Numerical field in CMGT's account (also matches "# of Homes", "Homes", "Number of Units") | Deal |
| Location | Community Address — an Address field; Pipedrive geocodes the text. The form only collects city + state (Places suggestions are cities-only), so that is what lands here | Deal (and the Organization's standard address) |

- **Field renamed in Pipedrive?** Add the new name to the mapping's `pipedrive` list, or set
  `PIPEDRIVE_DEAL_FIELD_HOMES` / `PIPEDRIVE_DEAL_FIELD_ADDRESS` to the field's API key.
- **Mapping another answer?** Add a `FIELD_MAP` entry. `form` must equal the label the form
  sends (IntakeForm.jsx `buildFields`). Nothing else changes.
- **Unresolved?** The deal is still created; the value stays in the note and the function logs
  `[pipedrive] no deal field named …` — check Vercel logs for the production project.
- Only `PUBLIC_*` env vars are inlined at build time. Secrets such as the Pipedrive token are
  read from the environment at runtime (the compiled function uses `process.env`), so adding or
  rotating one on Vercel takes effect on the next invocation without a rebuild.

## LLM traffic — `/llms.txt`, `/llms-full.txt`, AI crawler policy

Every AI assistant gets a curated site guide, the whole site's text in one file, and an
explicit welcome in robots.txt. Full reference: `LLM-TRAFFIC-GUIDE.md` (rollout to other
clients, curation rules, robots policy, GA4 measurement, troubleshooting).

```
src/data/llms.ts            ← THE per-client file: summary, facts, sections, optional. Curated by hand.
src/pages/llms.txt.ts       ← prerendered; validates the registry at build (fails on bad paths, warns on unlisted pages)
src/pages/llms-full.txt.ts  ← SSR, CDN-cached a day; fetches the canonical site's pages → Markdown
src/lib/llms.ts             ← shared logic (render, validate, route table, HTML→Markdown). Never edit per client.
scripts/llms-draft.mjs      ← `npm run llms:draft` — seeds the registry / appends new pages to UNSORTED
scripts/llms-check.mjs      ← `npm run llms:check -- https://cmgt.org` — verifies a LIVE site, incl. bot reachability
public/robots.txt           ← allows every AI crawler by name; points at llms.txt
```

Rules of thumb:
- **Added a page?** The build warns `page not listed: /x`. Run `npm run llms:draft`, move the
  entry out of `UNSORTED` into the right section, and write a one-line "what question this
  page answers" description. Titles are short labels, not the SEO `<title>`.
- **Renamed or deleted a page?** The build fails until `src/data/llms.ts` is fixed. Intentional.
- **Changed an office, phone, service, or credential?** Update `facts` in the same PR.
- **After every production deploy that touches pages:** `npm run llms:check -- https://cmgt.org`
  and expect 0 errors. The "every page carries noindex" warning is normal on stg/dev only.
- Do not add `noindex` to the .txt files, and do not block any AI crawler without reading the
  policy section of the guide first.

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

1. **Mailchimp folder** — a campaign folder (CMGT: `CMGT Newsletter`, id `eb19e4ea02`). Only campaigns inside it count; drafts and tests are ignored until sent. Regular sends and A/B tests (Mailchimp type `variate`) both count — the October 2026 issue went out as an A/B subject-line test and the page originally filtered on `type=regular`, so it rebuilt to the pre-launch state. On an A/B test the headline is the winning subject line once Mailchimp picks one, else variant A. Its id goes in `MAILCHIMP_NEWSLETTER_FOLDER_ID` (Production + Preview) on the Vercel project. Find ids with `GET /3.0/campaign-folders`.
2. **Vercel deploy hook** — project → Settings → Git → Deploy Hooks (branch `main`); URL in `VERCEL_DEPLOY_HOOK_URL` (Production). Can also be created with `POST /v1/projects/{name}/deploy-hooks`.
3. **Mailchimp webhook** — Audience → Settings → Webhooks (or `POST /3.0/lists/{list}/webhooks`): `https://<domain>/api/newsletter-webhook?secret=<MAILCHIMP_WEBHOOK_SECRET>`, event **Campaign sending only**. Mailchimp GETs the URL on save, so the route must already be live on production. Secret in `MAILCHIMP_WEBHOOK_SECRET` (Production).

Until the first campaign in the folder is sent, the page renders the "coming soon" state from `newsletter.json` with the subscribe strip and Ask form fully working.

Mailchimp tags written by the site: `newsletter-footer` (footer form), `newsletter-page` (landing-page strip), `newsletter-ask` + `asked-YYYY-MM` (Ask form). Footer and page sign-ups are double opt-in; an asker who unticks the newsletter box is stored as `transactional` and never mailed.
