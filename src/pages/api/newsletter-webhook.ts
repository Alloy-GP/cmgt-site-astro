// src/pages/api/newsletter-webhook.ts
// Rebuild-on-send. Mailchimp calls this when a campaign is sent; we fire the
// Vercel deploy hook so the /newsletter page (prerendered) regenerates and the
// just-sent issue becomes "current" while the previous one moves into the
// archive automatically — no manual redeploy.
//
// Setup (see CLAUDE.md → "Newsletter landing page"):
//   1. Create a Deploy Hook in Vercel → cmgt-site-astro → Settings → Git →
//      Deploy Hooks (branch: main). Put the URL in env as VERCEL_DEPLOY_HOOK_URL
//      (Production environment).
//   2. Set MAILCHIMP_WEBHOOK_SECRET to a long random string and append
//      ?secret=... to the webhook URL you give Mailchimp, so only Mailchimp can
//      trigger a build.
//   3. In Mailchimp → Audience → Settings → Webhooks, add:
//        https://cmgt.org/api/newsletter-webhook?secret=...
//      and enable ONLY the "Campaign sending" event.
//
// Mailchimp validates the URL with a GET (must return 200) and delivers events
// as application/x-www-form-urlencoded POSTs with a `type` field.
// Ported from the Edison site's newsletter system (Alloy-GP/Edison-Website).

import type { APIRoute } from 'astro';

export const prerender = false;

function authorized(url: URL): boolean {
  const secret = import.meta.env.MAILCHIMP_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured → accept (deploy hook URL is itself unguessable)
  return url.searchParams.get('secret') === secret;
}

// Mailchimp pings the URL with a GET when you save the webhook — just say OK.
export const GET: APIRoute = () => new Response('ok', { status: 200 });

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  if (!authorized(url)) {
    return new Response('forbidden', { status: 403 });
  }

  // Read the event type (form-encoded). We rebuild on campaign sends only.
  let type = '';
  try {
    const form = await request.formData();
    type = (form.get('type') ?? '').toString();
  } catch {
    // ignore malformed bodies — still return 200 so Mailchimp doesn't retry-storm
  }

  const deployHook = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  if (type === 'campaign' && deployHook) {
    try {
      await fetch(deployHook, { method: 'POST' });
      console.log('[newsletter-webhook] campaign sent → triggered Vercel rebuild');
    } catch (err) {
      console.error('[newsletter-webhook] deploy hook call failed:', err);
    }
  } else if (type === 'campaign') {
    console.warn('[newsletter-webhook] campaign sent but VERCEL_DEPLOY_HOOK_URL is not set');
  }

  // Always 200 — Mailchimp disables webhooks that return errors repeatedly.
  return new Response('ok', { status: 200 });
};
