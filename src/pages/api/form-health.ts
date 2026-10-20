// src/pages/api/form-health.ts
// Daily heartbeat for the form pipeline (Vercel cron — see vercel.json), so "is
// the form working?" is answered in Slack every morning instead of wondered
// about. It checks the things that break a form silently: the Resend key and
// sending domain, the Slack webhook, the Mailchimp and Pipedrive credentials, and
// that production is actually configured as production. One line is posted to
// the forms channel — ✅ when everything passes, 🚨 with the failures when not.
// No line on a morning means the cron itself did not run.
//
// Auth: Vercel sends `Authorization: Bearer $CRON_SECRET` with every cron request
// once CRON_SECRET is set on the project (any long random string). The same
// header works for a manual check:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://cmgt.org/api/form-health
// Without CRON_SECRET the route only answers Vercel's cron user-agent, so the
// heartbeat still runs on day one; set the secret so nobody else can trigger it.

import type { APIRoute } from 'astro';
import { EMAIL_CONFIG } from '~/lib/email.config';

export const prerender = false;

interface Check { name: string; ok: boolean; detail: string }

const SLACK_WEBHOOK =
  import.meta.env.FORM_SLACK_WEBHOOK || import.meta.env.FORM_ALERT_SLACK_URL;
const IS_PROD = import.meta.env.PUBLIC_ENV === 'production';

function authorized(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  if (secret) return request.headers.get('authorization') === `Bearer ${secret}`;
  return (request.headers.get('user-agent') ?? '').startsWith('vercel-cron/');
}

const withTimeout = (ms: number) => AbortSignal.timeout(ms);

async function checkResend(): Promise<Check> {
  const name = 'Resend';
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) return { name, ok: false, detail: 'RESEND_API_KEY is not set' };
  const sender = EMAIL_CONFIG.from.notifications.match(/@([^>\s]+)/)?.[1] ?? '';
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` }, signal: withTimeout(8000),
    });
    const body = await res.json().catch(() => ({}));
    // Resend answers a bad key with 400/401 and a message ("API key is invalid").
    if (!res.ok) return { name, ok: false, detail: body?.message ? `${body.message} (${res.status})` : `domains endpoint responded ${res.status}` };
    const domains = (body?.data ?? []) as { name: string; status: string }[];
    const domain = domains.find((d) => d.name === sender);
    if (!domain) return { name, ok: false, detail: `sending domain ${sender} is not in this Resend account` };
    if (domain.status !== 'verified') return { name, ok: false, detail: `${sender} is "${domain.status}", not verified` };
    return { name, ok: true, detail: `${sender} verified` };
  } catch (err) {
    return { name, ok: false, detail: `unreachable: ${(err as Error).message}` };
  }
}

function checkSlack(): Check {
  return SLACK_WEBHOOK
    ? { name: 'Slack', ok: true, detail: 'webhook set (this message proves it posts)' }
    : { name: 'Slack', ok: false, detail: 'no FORM_SLACK_WEBHOOK / FORM_ALERT_SLACK_URL — submissions are not being logged' };
}

async function checkMailchimp(): Promise<Check> {
  const name = 'Mailchimp';
  if (!EMAIL_CONFIG.mailchimp.enabled) return { name, ok: true, detail: 'skipped (non-production)' };
  const key = import.meta.env.MAILCHIMP_API_KEY;
  const server = import.meta.env.MAILCHIMP_SERVER_PREFIX;
  const list = import.meta.env.MAILCHIMP_AUDIENCE_ID ?? import.meta.env.MAILCHIMP_LIST_ID;
  if (!key || !server || !list) return { name, ok: false, detail: 'MAILCHIMP_API_KEY / SERVER_PREFIX / AUDIENCE_ID not all set' };
  try {
    const auth = { Authorization: `Basic ${Buffer.from(`anystring:${key}`).toString('base64')}` };
    const res = await fetch(`https://${server}.api.mailchimp.com/3.0/lists/${list}?fields=id,name`, {
      headers: auth, signal: withTimeout(8000),
    });
    if (res.status === 401) return { name, ok: false, detail: 'API key rejected (401)' };
    if (res.status === 404) return { name, ok: false, detail: `audience ${list} not found` };
    if (!res.ok) return { name, ok: false, detail: `responded ${res.status}` };
    const body = await res.json();
    return { name, ok: true, detail: `audience "${body?.name ?? list}" reachable` };
  } catch (err) {
    return { name, ok: false, detail: `unreachable: ${(err as Error).message}` };
  }
}

async function checkPipedrive(): Promise<Check> {
  const name = 'Pipedrive';
  const token = import.meta.env.PIPEDRIVE_API_TOKEN;
  if (!IS_PROD) return { name, ok: true, detail: 'skipped (non-production)' };
  if (!token) return { name, ok: false, detail: 'PIPEDRIVE_API_TOKEN not set — proposals are not reaching the CRM' };
  try {
    const res = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${token}`, { signal: withTimeout(8000) });
    if (res.status === 401) return { name, ok: false, detail: 'API token rejected (401)' };
    if (!res.ok) return { name, ok: false, detail: `responded ${res.status}` };
    const body = await res.json();
    return { name, ok: true, detail: `token ok (${body?.data?.name ?? 'user'})` };
  } catch (err) {
    return { name, ok: false, detail: `unreachable: ${(err as Error).message}` };
  }
}

function checkRouting(): Check {
  const to = EMAIL_CONFIG.routes.proposal ?? EMAIL_CONFIG.notify;
  const env = import.meta.env.PUBLIC_ENV || 'unset';
  if (!to.length) return { name: 'Routing', ok: false, detail: 'proposal route is empty — nothing would be emailed' };
  return {
    name: 'Routing',
    ok: true,
    detail: `${env === 'production' ? 'production' : `PUBLIC_ENV=${env} (test inbox)`} → proposals to ${to.join(', ')}`,
  };
}

async function postHeartbeat(ok: boolean, checks: Check[]): Promise<void> {
  if (!SLACK_WEBHOOK) return;
  const client = EMAIL_CONFIG.brand.name;
  const line = checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`).join('\n');
  const text = ok
    ? `✅ Forms healthy — ${client} · ${checks.map((c) => c.name).join(' · ')} all ok`
    : `🚨 Form pipeline problem — ${client}: ${checks.filter((c) => !c.ok).map((c) => `${c.name} (${c.detail})`).join('; ')}`;
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: ok ? `✅ Forms healthy — ${client}` : `🚨 Form pipeline problem — ${client}` } },
          { type: 'section', text: { type: 'mrkdwn', text: line } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Daily form health check · ${new Date().toISOString()}` }] },
        ],
      }),
      signal: withTimeout(8000),
    });
  } catch (err) {
    console.error('[form-health] could not post to Slack:', err);
  }
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const checks: Check[] = [
    checkRouting(),
    await checkResend(),
    checkSlack(),
    await checkMailchimp(),
    await checkPipedrive(),
  ];
  const ok = checks.every((c) => c.ok);
  await postHeartbeat(ok, checks);
  if (!ok) console.error('[form-health] failing checks:', checks.filter((c) => !c.ok));
  return new Response(JSON.stringify({ ok, checks, checkedAt: new Date().toISOString() }, null, 2), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
