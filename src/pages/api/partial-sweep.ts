// src/pages/api/partial-sweep.ts
// Every 5 minutes (Vercel cron — see vercel.json): send the started-but-unfinished
// proposals whose hold has ended to customer support, then forget them. The hold
// itself, and why, is in src/lib/partials.ts. A form finished inside the hold
// never gets here — /api/lead released it when the complete submission arrived.
//
// Auth is the same as /api/form-health: Vercel's cron sends
// `Authorization: Bearer $CRON_SECRET`; the same header works by hand:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://cmgt.org/api/partial-sweep

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '~/lib/email.config';
import { sendWithAlert, notifySubmission } from '~/lib/form-alert';
import { upsertMailchimpContact } from '~/lib/mailchimp';
import { takeDue, renderPartialEmail, partialSlackRows, MAX_AGE_HOURS } from '~/lib/partials';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const SLACK_WEBHOOK =
  import.meta.env.FORM_SLACK_WEBHOOK || import.meta.env.FORM_ALERT_SLACK_URL;

function authorized(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  if (secret) return request.headers.get('authorization') === `Bearer ${secret}`;
  return (request.headers.get('user-agent') ?? '').startsWith('vercel-cron/');
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const sweep = await takeDue(new Date());
  const results: Array<{ ref: string; status: 'sent' | 'retry' | 'dropped'; to?: string[]; error?: string }> = [];

  for (const d of sweep.due) {
    const p = d.partial;
    const intentCfg = EMAIL_CONFIG.intents[p.intent] ?? EMAIL_CONFIG.intents.default;
    const to = EMAIL_CONFIG.partialRoutes[p.intent] ?? EMAIL_CONFIG.routes[p.intent] ?? EMAIL_CONFIG.notify;
    const cc = EMAIL_CONFIG.partialCcByIntent[p.intent] ?? [];
    const route = `${intentCfg.label} started, not finished${p.role ? ` · ${p.role}` : ''}`;
    const formName = `${p.intent || 'lead'} form → ${to.join(', ')}`;

    // Nothing to send it to: drop it rather than hold it forever.
    if (!to.length || d.expired) {
      await sweep.done(d.key);
      await notifySubmission({
        client: EMAIL_CONFIG.brand.name, slackWebhookUrl: SLACK_WEBHOOK, route, formName,
        status: 'warning', fields: partialSlackRows(p),
        note: !to.length
          ? 'no partial route configured — dropped without an email'
          : `the email to support kept failing for ${MAX_AGE_HOURS} hours — dropped; this post is the only copy`,
      });
      results.push({ ref: p.ref, status: 'dropped' });
      continue;
    }

    const { subject, html } = renderPartialEmail(p, {
      held: true, heldMinutes: d.heldMinutes, label: intentCfg.label,
      completeTo: EMAIL_CONFIG.routes[p.intent] ?? EMAIL_CONFIG.notify,
    });
    try {
      await sendWithAlert(
        {
          client: EMAIL_CONFIG.brand.name,
          formName: `${intentCfg.label} (${p.intent}) — partial, after hold`,
          slackWebhookUrl: SLACK_WEBHOOK,
          alertEmail: { apiKey: import.meta.env.RESEND_API_KEY, to: EMAIL_CONFIG.alertsTo, from: EMAIL_CONFIG.from.notifications },
        },
        () => resend.emails.send({
          from: EMAIL_CONFIG.from.notifications,
          replyTo: EMAIL_CONFIG.replyTo,
          to,
          ...(cc.length ? { cc } : {}),
          subject, html,
        })
      );
    } catch (err) {
      // sendWithAlert has already posted the 🚨 to Slack. Keep the blob; the
      // next sweep tries again, until MAX_AGE_HOURS.
      results.push({ ref: p.ref, status: 'retry', error: (err as Error).message });
      continue;
    }

    // Only a genuinely abandoned proposal is tagged — the contact step alone
    // used to tag everyone, residents on the wrong form included.
    if (p.intent === 'proposal') {
      await upsertMailchimpContact({
        email: p.email,
        firstName: p.name.split(' ')[0],
        lastName: p.name.split(' ').slice(1).join(' '),
        company: p.company,
        tags: [...EMAIL_CONFIG.mailchimp.defaultTags, 'proposal-incomplete'],
      });
    }

    await notifySubmission({
      client: EMAIL_CONFIG.brand.name, slackWebhookUrl: SLACK_WEBHOOK, route, formName,
      status: 'delivered', fields: partialSlackRows(p),
      note: `held ${d.heldMinutes} min with no complete form, then emailed to support`,
    });
    await sweep.done(d.key);
    results.push({ ref: p.ref, status: 'sent', to });
  }

  const body = {
    ok: true,
    sent: results.filter((r) => r.status === 'sent').length,
    retry: results.filter((r) => r.status === 'retry').length,
    dropped: results.filter((r) => r.status === 'dropped').length + sweep.dropped.length,
    pending: sweep.pending,
    results,
    checkedAt: new Date().toISOString(),
  };
  if (body.retry || body.dropped) console.error('[partial-sweep]', body);
  return new Response(JSON.stringify(body, null, 2), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
