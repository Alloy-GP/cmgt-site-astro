// src/pages/api/newsletter-ask.ts
// Handles the /newsletter "Ask CMGT" form.
// Three jobs, in order:
//   1. Upsert the asker into Mailchimp (never fatal — the helper logs and
//      swallows Mailchimp errors). Ticking "also send me the newsletter" makes
//      a NEW contact 'pending' (double opt-in, same spam gate as the footer);
//      leaving it unticked stores them as 'transactional' so we have a record
//      but they never receive a campaign. Existing members keep their status.
//   2. Email the actual question to CMGT (fatal — a human seeing it is the
//      whole point, so we only return 200 when this send succeeds).
//   3. Confirmation to the asker, best-effort.
//
// DO NOT edit routing/copy here per client — update src/lib/email.config.ts.
// Ported from the Edison site's newsletter system (Alloy-GP/Edison-Website).

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { EMAIL_CONFIG } from '~/lib/email.config';
import { sendWithAlert, notifySubmission } from '~/lib/form-alert';
import { upsertMailchimpContact } from '~/lib/mailchimp';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
// Slack destination. FORM_SLACK_WEBHOOK is this client's own channel and takes
// precedence for BOTH submissions and failures; FORM_ALERT_SLACK_URL is the
// shared fallback for clients without a channel of their own.
const SLACK_WEBHOOK =
  import.meta.env.FORM_SLACK_WEBHOOK || import.meta.env.FORM_ALERT_SLACK_URL;

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot — bots fill hidden fields, humans don't.
    if (body.website) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const FNAME      = (body.FNAME ?? '').toString().trim();
    const LNAME      = (body.LNAME ?? '').toString().trim();
    const email      = (body.EMAIL ?? '').toString().trim().toLowerCase();
    const COMMUNITY  = (body.COMMUNITY ?? '').toString().trim();
    const ROLE       = (body.ROLE ?? '').toString().trim();
    const QUESTION   = (body.QUESTION ?? '').toString().trim();
    const issueSlug  = (body.issueSlug ?? '').toString().trim();
    const issueLabel = (body.issueLabel ?? '').toString().trim();
    const subscribe  = body.subscribe === true || body.subscribe === 'on';

    if (!FNAME || !email.includes('@') || !QUESTION) {
      return new Response(
        JSON.stringify({ error: 'Name, a valid email, and a question are required.' }),
        { status: 400 }
      );
    }

    // ── 1. Mailchimp upsert (never throws). Tagged per issue so the client can
    //       see which send prompted which questions. ──
    await upsertMailchimpContact({
      email,
      firstName: FNAME,
      lastName: LNAME,
      company: COMMUNITY,
      tags: [
        ...EMAIL_CONFIG.mailchimp.askTags,
        ...(issueSlug ? [`asked-${issueSlug}`] : []),
      ],
      doubleOptIn: subscribe,
      transactional: !subscribe,
    });

    // ── 2. Email the question to CMGT (fatal). ──
    const who = `${FNAME} ${LNAME}`.trim() || email;
    const to  = EMAIL_CONFIG.routes.newsletter ?? EMAIL_CONFIG.notify;
    const cc  = EMAIL_CONFIG.notifyCcByIntent.newsletter ?? EMAIL_CONFIG.notifyCc;
    const notifyHtml =
      `<h2 style="color:#1E1E77;margin:0 0 12px">New newsletter question — ${esc(issueLabel || 'Ask CMGT')}</h2>` +
      `<p style="font-size:16px;line-height:1.6"><strong>Question:</strong><br>${esc(QUESTION).replace(/\n/g, '<br>')}</p>` +
      `<hr style="border:none;border-top:1px solid #E5E7EB;margin:18px 0">` +
      `<p><strong>Name:</strong> ${esc(who)}</p>` +
      `<p><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>` +
      (COMMUNITY ? `<p><strong>Community/association:</strong> ${esc(COMMUNITY)}</p>` : '') +
      (ROLE ? `<p><strong>Role:</strong> ${esc(ROLE)}</p>` : '') +
      `<p><strong>Issue:</strong> ${esc(issueLabel)}${issueSlug ? ` (${esc(issueSlug)})` : ''}</p>` +
      `<p style="color:#6B7280;font-size:13px">Subscribed to newsletter: ${subscribe ? 'yes (pending their double opt-in)' : 'no'}</p>` +
      `<p style="color:#6B7280;font-size:13px">Reply to this email to answer them directly.</p>`;

    // The error is held rather than thrown so the Slack log below still runs;
    // it is re-thrown straight after, so the form still gets its 502.
    let notifyError: unknown = null;
    try {
      await sendWithAlert(
        {
          client: EMAIL_CONFIG.brand.name,
          formName: 'Newsletter Ask form',
          slackWebhookUrl: SLACK_WEBHOOK,
          alertEmail: {
            apiKey: import.meta.env.RESEND_API_KEY,
            to: EMAIL_CONFIG.alertsTo,
            from: EMAIL_CONFIG.from.notifications,
          },
        },
        () =>
          resend.emails.send({
            from: EMAIL_CONFIG.from.notifications,
            to,
            ...(cc.length ? { cc } : {}),
            replyTo: email, // reply goes straight to the person who asked
            subject: EMAIL_CONFIG.copy.newsletterAsk.notifySubject(who),
            html: notifyHtml,
          })
      );
    } catch (err) {
      notifyError = err;
    }

    // Log the question to the client's Slack channel. It posts even when the
    // email failed — that message is then the only record of the question.
    await notifySubmission({
      client: EMAIL_CONFIG.brand.name,
      slackWebhookUrl: SLACK_WEBHOOK,
      route: 'Newsletter question',
      formName: `Newsletter ask → ${[to].flat().join(', ')}`,
      delivered: !notifyError,
      fields: [
        ['Name', who],
        ['Email', email],
        ['Community', COMMUNITY],
        ['Role', ROLE],
        ['Issue', issueLabel],
        ['Question', QUESTION],
        ['Newsletter opt-in', subscribe ? 'yes' : 'no'],
      ],
    });

    if (notifyError) throw notifyError;

    // ── 3. Confirmation to the asker (best-effort). ──
    try {
      await resend.emails.send({
        from: EMAIL_CONFIG.from.confirmations,
        to: email,
        replyTo: EMAIL_CONFIG.replyTo,
        ...(EMAIL_CONFIG.bcc.length ? { bcc: EMAIL_CONFIG.bcc } : {}),
        subject: EMAIL_CONFIG.copy.newsletterAsk.confirmSubject,
        html: EMAIL_CONFIG.copy.newsletterAsk.confirmBody(FNAME),
      });
    } catch (err) {
      console.error('[newsletter-ask] asker confirmation failed:', err);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('[newsletter-ask] error:', err);
    return new Response(JSON.stringify({ error: "That didn't go through. Please try again." }), {
      status: 502,
    });
  }
};
