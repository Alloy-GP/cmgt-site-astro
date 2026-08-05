// src/pages/api/review-complete.ts
// Fired when a client submits the preview review checklist.
// Sends: Slack (#pastel-review) + email (team@alloygp.co) + Zendesk ticket comment.
//
// Client-independent: the client name comes from SITE.name (src/config/site.ts),
// so this file never needs per-client edits.
//
// Required env vars (set in Vercel → stg environment):
//   REVIEW_SLACK_WEBHOOK     -  Slack incoming webhook URL
//   RESEND_API_KEY           -  already used by other API routes
//   ZENDESK_SUBDOMAIN        -  e.g. "alloygp"
//   ZENDESK_EMAIL            -  admin email for API auth
//   ZENDESK_API_TOKEN        -  Zendesk API token
// The ticket ID travels with the submission (baked into review.ts at deploy time).

export const prerender = false; // API routes must run on-demand (hybrid prerenders them by default)

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { SITE } from '../../config/site.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { reviewer, notes, checkedCount, total, items, ticketId } = await request.json();
    const resendKey = import.meta.env.RESEND_API_KEY;
    const resend = resendKey ? new Resend(resendKey) : null;
    const client = SITE.name;

    const unchecked = (items ?? []).filter((i: any) => !i.checked);
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short',
    });

    const summaryLines = (items ?? [])
      .map((i: any) => `${i.checked ? '✓' : '○'} ${i.label}`)
      .join('\n');

    // ── 1. Slack ──────────────────────────────────────────────────────────────
    const slackWebhook = import.meta.env.REVIEW_SLACK_WEBHOOK;
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: `✅ ${client} preview review submitted`, emoji: true },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Reviewer*\n${reviewer}` },
                  { type: 'mrkdwn', text: `*Progress*\n${checkedCount} / ${total} pages reviewed` },
                  { type: 'mrkdwn', text: `*Submitted*\n${timestamp}` },
                ],
              },
              ...(notes ? [{
                type: 'section',
                text: { type: 'mrkdwn', text: `*Notes*\n${notes}` },
              }] : []),
              ...(unchecked.length > 0 ? [{
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Pages not yet reviewed*\n${unchecked.map((i: any) => `• ${i.label}`).join('\n')}`,
                },
              }] : []),
              { type: 'divider' },
              {
                type: 'context',
                elements: [{
                  type: 'mrkdwn',
                  text: `${client} · <${SITE.url}|View site>`,
                }],
              },
            ],
          }),
        });
      } catch (err) {
        console.error('Slack webhook error:', err);
      }
    }

    // ── 2. Email → Zendesk ticket (team@alloygp.co) ───────────────────────────
    if (!resend) console.warn('RESEND_API_KEY not set  -  skipping email');
    try { if (!resend) throw new Error('no key');
      await resend.emails.send({
        from: `${client} Preview <noreply@alloygp.co>`,
        to: 'team@alloygp.co',
        subject: `[${client}] Preview review submitted by ${reviewer}`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 4px;color:#1a1a2e">Preview review submitted</h2>
            <p style="color:#666;margin:0 0 24px;font-size:13px">${timestamp}</p>

            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr>
                <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px">Reviewer</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee">${reviewer}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Progress</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee">${checkedCount} of ${total} pages reviewed</td>
              </tr>
              ${notes ? `
              <tr>
                <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;vertical-align:top">Notes</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee">${notes.replace(/\n/g, '<br>')}</td>
              </tr>` : ''}
            </table>

            <h3 style="font-size:13px;margin:0 0 8px;color:#1a1a2e">Page checklist</h3>
            <pre style="font-family:monospace;font-size:12px;background:#f9f9f9;padding:12px;border-radius:6px;color:#333">${summaryLines}</pre>
          </div>
        `,
      });
    } catch (err) {
      console.error('Resend email error:', err);
    }

    // ── 3. Zendesk ticket comment ─────────────────────────────────────────────
    const zdSubdomain = import.meta.env.ZENDESK_SUBDOMAIN;
    const zdEmail     = import.meta.env.ZENDESK_EMAIL;
    const zdToken     = import.meta.env.ZENDESK_API_TOKEN;
    // ticketId comes from review.ts (baked in at deploy time)  -  no env var needed
    const zdTicket    = ticketId;

    if (zdSubdomain && zdEmail && zdToken && zdTicket) {
      try {
        const auth = btoa(`${zdEmail}/token:${zdToken}`);
        await fetch(
          `https://${zdSubdomain}.zendesk.com/api/v2/tickets/${zdTicket}.json`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticket: {
                status: 'open',
                comment: {
                  public: false,
                  body: [
                    `Preview review submitted  -  ${timestamp}`,
                    `Reviewer: ${reviewer}`,
                    `Progress: ${checkedCount} / ${total} pages reviewed`,
                    notes ? `\nNotes:\n${notes}` : '',
                    `\nChecklist:\n${summaryLines}`,
                  ].filter(Boolean).join('\n'),
                },
              },
            }),
          }
        );
      } catch (err) {
        console.error('Zendesk API error:', err);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('review-complete error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong.' }), { status: 500 });
  }
};
