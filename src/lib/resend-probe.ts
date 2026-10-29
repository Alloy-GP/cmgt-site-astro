// src/lib/resend-probe.ts
//
// "Can this site send email right now?" — answered by sending one.
//
// Used by the daily health check (src/pages/api/form-health.ts). The check
// used to list the account's domains and look for the sending domain, but
// that needs a Full-access Resend key. Production keys are, correctly,
// Sending-access only, so the check failed every morning with "This API key
// is restricted to only send emails" while real sends worked. It was also a
// proxy: it proved the key and the DNS record, not that a send from this
// address is accepted.
//
// This sends a real email from the site's notification address to Resend's
// test inbox (delivered@resend.dev — resend.com/docs/dashboard/emails/send-test-emails).
// Same key, same from address, same endpoint the form routes use. Resend
// accepts it like any other email and then simulates delivery: nothing lands
// in a person's mailbox and no bounce or complaint is raised, so the
// Resend→Slack relay (resend-slack-alerts) stays quiet — it ignores sent and
// delivered events. A 200 proves key, verified domain and send path in one
// go; the failures a form would hit come back exactly as the form would see
// them — 401 "API key is invalid", 403 "domain is not verified". Costs one
// email a day against the sending quota. The +label and the tag make the
// probe easy to spot (and filter) in the Resend dashboard.
//
// No Astro and no import.meta.env here: the caller passes the key in, and
// scripts/test-form-alert.ts drives every branch with a stubbed fetch.

export const RESEND_TEST_INBOX = 'delivered+form-health@resend.dev';

export interface ProbeResult {
  ok: boolean;
  detail: string; // one human-readable line for the Slack heartbeat
}

export interface ProbeOptions {
  apiKey: string | undefined; // RESEND_API_KEY — a Sending-access key is enough
  from: string;               // EMAIL_CONFIG.from.notifications, e.g. 'CMGT <notifications@mail.cmgt.org>'
  client: string;             // brand name, for the subject line
  site?: string;              // brand URL, named in the body so the email explains itself
  timeoutMs?: number;         // per attempt
  retryDelayMs?: number;      // wait before the single 429 retry (tests pass 0)
}

/** The bare address inside a display-name From header. */
const bareAddress = (from: string) => from.match(/[^\s<>"]+@[^\s<>"]+/)?.[0] ?? from;

export async function probeResendSend(opts: ProbeOptions): Promise<ProbeResult> {
  const { apiKey, from, client, site, timeoutMs = 8000, retryDelayMs = 1200 } = opts;
  if (!apiKey) return { ok: false, detail: 'RESEND_API_KEY is not set' };

  const sender = bareAddress(from);
  const domain = sender.split('@')[1] ?? sender;
  const day = new Date().toISOString().slice(0, 10);
  const body = JSON.stringify({
    from,
    to: [RESEND_TEST_INBOX],
    subject: `Form health check — ${client} · ${day}`,
    text:
      `Daily probe from ${site ? `${site}/api/form-health` : `${client}'s /api/form-health route`}. ` +
      `It proves the Resend key and the ${domain} sending domain still accept mail. ` +
      `It was sent to Resend's simulated-delivery inbox; nobody receives it.`,
    tags: [{ name: 'purpose', value: 'form_health' }],
  });

  const send = () =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

  try {
    let res = await send();
    // Resend allows 2 requests a second. A form submitted the instant the cron
    // fires is the one way this probe sees a 429 — try once more, a beat later,
    // rather than wake anyone for it.
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
      res = await send();
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (res.ok) {
      return { ok: true, detail: `test email sent from ${sender}${data.id ? ` (Resend id ${data.id})` : ''}` };
    }
    // Error bodies are { statusCode, name, message }; the message is the useful
    // part: "API key is invalid", "The x domain is not verified. …".
    const message = data.message ?? `responded ${res.status} with no message`;
    return { ok: false, detail: `${message} (${res.status})` };
  } catch (err) {
    return { ok: false, detail: `unreachable: ${(err as Error).message}` };
  }
}
