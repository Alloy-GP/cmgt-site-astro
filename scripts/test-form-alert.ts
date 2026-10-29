/**
 * Verifies the form Slack log + failure alerting, with no network and no keys.
 *
 * Run it after wiring a client site, and before trusting that a site has
 * stopped emailing Alloy:  node scripts/test-form-alert.ts   (Node >= 22.6)
 *
 * It stubs global fetch and asserts WHICH destination each path hits, which is
 * the part that actually matters here: a site with a Slack webhook must never
 * send a failure email, and a site without one must never go silent.
 */
import { sendWithAlert, notifySubmission, fieldsFromFormData } from '../src/lib/form-alert.ts';

const SLACK = 'https://hooks.slack.com/services/T/B/xxx';
const ALERT_EMAIL = { apiKey: 're_test', to: 'admin@alloygp.co', from: 'x@y.co' };

let calls: string[] = [];
(globalThis as any).fetch = async (url: string) => {
  calls.push(String(url));
  return { ok: true, status: 200, json: async () => ({}) } as any;
};

const failingSend = async () => { throw new Error('Resend is down'); };
const hosts = () => calls.map((u) => new URL(u).host);
let failures = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}`);
  if (!cond) failures++;
}

// 1. Slack configured → failure alerts Slack ONLY, never the email inbox.
calls = [];
try {
  await sendWithAlert(
    { client: 'Acme', formName: 'Contact form', slackWebhookUrl: SLACK, alertEmail: ALERT_EMAIL },
    failingSend,
  );
} catch { /* expected: re-thrown */ }
check('slack configured → posts to Slack', hosts().includes('hooks.slack.com'));
check('slack configured → does NOT email admin@alloygp.co', !hosts().includes('api.resend.com'));

// 2. No Slack anywhere → the email fallback must still fire, or failures are silent.
delete process.env.FORM_SLACK_WEBHOOK;
delete process.env.FORM_ALERT_SLACK_URL;
calls = [];
try {
  await sendWithAlert(
    { client: 'Acme', formName: 'Contact form', alertEmail: ALERT_EMAIL },
    failingSend,
  );
} catch { /* expected */ }
check('no slack → falls back to email', hosts().includes('api.resend.com'));

// 3. Env-only Slack config also suppresses the email.
process.env.FORM_SLACK_WEBHOOK = SLACK;
calls = [];
try {
  await sendWithAlert({ client: 'Acme', alertEmail: ALERT_EMAIL }, failingSend);
} catch { /* expected */ }
check('slack via env → does NOT email', !hosts().includes('api.resend.com'));
check('slack via env → still POSTS to Slack (no silent gap)', hosts().includes('hooks.slack.com'));
delete process.env.FORM_SLACK_WEBHOOK;

// 4. An error-shaped response (Resend returns {error} without throwing) alerts too.
calls = [];
try {
  await sendWithAlert(
    { client: 'Acme', slackWebhookUrl: SLACK, alertEmail: ALERT_EMAIL },
    async () => ({ error: { message: 'domain not verified', name: 'validation_error' } }),
  );
} catch { /* expected */ }
check('error-shaped response alerts Slack', hosts().includes('hooks.slack.com'));
check('error-shaped response does NOT email', !hosts().includes('api.resend.com'));

// 5. notifySubmission never throws, even with a webhook that rejects.
(globalThis as any).fetch = async () => { throw new Error('network gone'); };
let threw = false;
try {
  await notifySubmission({ client: 'Acme', slackWebhookUrl: SLACK, fields: [['Name', 'A']] });
} catch { threw = true; }
check('notifySubmission swallows a dead webhook', !threw);

// 6. No webhook → no throw, no call.
calls = [];
(globalThis as any).fetch = async (url: string) => { calls.push(String(url)); return { ok: true } as any; };
await notifySubmission({ client: 'Acme', fields: [['Name', 'A']] });
check('notifySubmission with no webhook is a no-op', calls.length === 0);

// 7. Payload shape: delivered vs not.
let bodies: any[] = [];
(globalThis as any).fetch = async (_u: string, o: any) => { bodies.push(JSON.parse(o.body)); return { ok: true } as any; };
await notifySubmission({ client: 'Acme', slackWebhookUrl: SLACK, route: 'Proposal', fields: [['Name', 'A']] });
await notifySubmission({ client: 'Acme', slackWebhookUrl: SLACK, route: 'Proposal', delivered: false, fields: [['Name', 'A']] });
check('delivered post is marked 📬', bodies[0].text.startsWith('📬'));
check('undelivered post is marked ⚠️', bodies[1].text.startsWith('⚠️'));
check('undelivered post says it is the only record',
  JSON.stringify(bodies[1].blocks).includes('only record of the submission'));
check('field values are rendered', JSON.stringify(bodies[0].blocks).includes('*Name:* A'));

// 8. Long values are truncated so Slack can't reject the payload.
bodies = [];
await notifySubmission({ client: 'Acme', slackWebhookUrl: SLACK, fields: [['Message', 'x'.repeat(5000)]] });
check('long values truncated', JSON.stringify(bodies[0].blocks).includes('…'));

// 9. fieldsFromFormData: honeypot + machine fields out, real content in.
const fd = new FormData();
fd.set('name', 'Dana Reyes');
fd.set('firstName', 'Dana');
fd.set('website', 'http://spam.example');        // honeypot
fd.set('company_website', 'http://spam.example'); // honeypot (other convention)
fd.set('fieldsJson', '[{"label":"Units"}]');
fd.set('audience', 'proposal');
fd.set('blank', '   ');
const rows = fieldsFromFormData(fd);
const keys = rows.map(([k]) => k);
check('keeps real fields', keys.includes('Name'));
check('camelCase labelled', keys.includes('First name'));
check('drops both honeypots', !keys.includes('Website') && !keys.includes('Company website'));
check('drops machine fields', !keys.includes('Fieldsjson') && !keys.includes('Audience'));
check('drops whitespace-only values', !keys.includes('Blank'));


// 10. A discarded (honeypot) submission is logged with its own marker and the
//     answers, so a real person caught by autofill is still visible.
bodies = [];
await notifySubmission({ client: 'Acme', slackWebhookUrl: SLACK, route: 'Proposal — discarded', status: 'discarded', note: 'value: "x"', fields: [['Name', 'A'], ['Number of units', '120']] });
check('discarded post is marked 🪤', bodies[0].text.startsWith('🪤'));
check('discarded post explains the honeypot', JSON.stringify(bodies[0].blocks).includes('honeypot'));
check('discarded post carries the answers', JSON.stringify(bodies[0].blocks).includes('*Number of units:* 120'));

// 11. Many long answers are split across sections, never truncated as a whole,
//     and every section stays under Slack's 3000-character limit.
bodies = [];
const many: Array<[string, string]> = Array.from({ length: 30 }, (_, i) => [`Answer ${i}`, 'y'.repeat(200)]);
await notifySubmission({ client: 'Acme', slackWebhookUrl: SLACK, fields: many });
const sections = bodies[0].blocks.filter((b: any) => b.type === 'section');
check('long submissions use several sections', sections.length > 1);
check('every section is under 3000 chars', sections.every((b: any) => b.text.text.length < 3000));
check('no answer is dropped', sections.map((b: any) => b.text.text).join('\n').includes('*Answer 29:*'));

// 12. The honeypot is recognised under every name it has had.
const { honeypotValue } = await import('../src/lib/form-alert.ts');
const hp1 = new FormData(); hp1.set('contact_preference_other', 'http://spam.example');
const hp2 = new FormData(); hp2.set('website', 'http://spam.example');
const hp3 = new FormData(); hp3.set('name', 'Dana'); hp3.set('contact_preference_other', '   ');
check('current honeypot name is detected', honeypotValue(hp1) !== '');
check('legacy honeypot name is detected', honeypotValue(hp2) !== '');
check('whitespace-only honeypot is not a hit', honeypotValue(hp3) === '');
check('current honeypot name is hidden from Slack rows', !fieldsFromFormData(hp1).some(([k]) => /contact preference/i.test(k)));


// 13. Resident detection for partial proposals must not catch "President".
const { isResidentRole } = await import('../src/lib/roles.ts');
check('"Property owner / resident" is a resident', isResidentRole('Property owner / resident'));
check('"Board President" is NOT a resident', !isResidentRole('Board President'));
check('"Vice President" is NOT a resident', !isResidentRole('Vice President'));
check('empty role is NOT a resident', !isResidentRole(''));


// 14. The Resend probe: a real send to Resend's test inbox, reported as the
//     form routes would experience it. No domains lookup (needs a Full-access
//     key; production keys are Sending-access only).
const { probeResendSend, RESEND_TEST_INBOX } = await import('../src/lib/resend-probe.ts');
type Stub = { status: number; body: unknown } | Error;
let probeCalls: { url: string; init: any }[] = [];
function stubResend(...responses: Stub[]) {
  probeCalls = [];
  const queue = [...responses];
  (globalThis as any).fetch = async (url: string, init: any) => {
    probeCalls.push({ url: String(url), init });
    const next = queue.shift() ?? { status: 500, body: {} };
    if (next instanceof Error) throw next;
    return { ok: next.status < 300, status: next.status, json: async () => next.body } as any;
  };
}
const PROBE = { apiKey: 're_test', from: 'CMGT <notifications@mail.cmgt.org>', client: 'CMGT', site: 'https://cmgt.org', retryDelayMs: 0 };

stubResend({ status: 200, body: { id: 're_abc123' } });
let probe = await probeResendSend(PROBE);
const sent = JSON.parse(probeCalls[0].init.body);
check('probe: 200 → ok, names the sender and the Resend id', probe.ok && probe.detail.includes('notifications@mail.cmgt.org') && probe.detail.includes('re_abc123'));
check('probe: POSTs to /emails with the key', probeCalls[0].url === 'https://api.resend.com/emails' && probeCalls[0].init.method === 'POST' && probeCalls[0].init.headers.Authorization === 'Bearer re_test');
check('probe: FROM the notification address, TO the test inbox only', sent.from === PROBE.from && JSON.stringify(sent.to) === JSON.stringify([RESEND_TEST_INBOX]));
check("probe: the test inbox is Resend's simulated-delivery address", /^delivered(\+[\w-]+)?@resend\.dev$/.test(RESEND_TEST_INBOX));
check('probe: subject and body say what it is', /health check/i.test(sent.subject) && sent.subject.includes('CMGT') && /nobody receives/i.test(sent.text));

stubResend({ status: 401, body: { statusCode: 401, name: 'validation_error', message: 'API key is invalid' } });
probe = await probeResendSend(PROBE);
check("probe: bad key → ✗ with Resend's message and status", !probe.ok && probe.detail === 'API key is invalid (401)');

stubResend({ status: 403, body: { statusCode: 403, name: 'validation_error', message: 'The mail.cmgt.org domain is not verified. Please, add and verify your domain on https://resend.com/domains' } });
probe = await probeResendSend(PROBE);
check('probe: unverified domain → ✗ naming the domain', !probe.ok && probe.detail.includes('mail.cmgt.org domain is not verified') && probe.detail.endsWith('(403)'));

stubResend({ status: 429, body: { message: 'Too many requests' } }, { status: 200, body: { id: 're_retry' } });
probe = await probeResendSend(PROBE);
check('probe: one 429 is retried once, not reported', probe.ok && probeCalls.length === 2 && probe.detail.includes('re_retry'));

stubResend({ status: 429, body: { message: 'Too many requests. You can only make 2 requests per second.' } }, { status: 429, body: { message: 'Too many requests. You can only make 2 requests per second.' } });
probe = await probeResendSend(PROBE);
check('probe: two 429s → ✗, no endless retry', !probe.ok && probeCalls.length === 2 && probe.detail.endsWith('(429)'));

stubResend(new Error('fetch failed'));
probe = await probeResendSend(PROBE);
check('probe: network error → ✗ unreachable', !probe.ok && probe.detail === 'unreachable: fetch failed');

stubResend({ status: 200, body: { id: 'never' } });
probe = await probeResendSend({ ...PROBE, apiKey: undefined });
check('probe: no key → ✗ without calling Resend', !probe.ok && probe.detail === 'RESEND_API_KEY is not set' && probeCalls.length === 0);

stubResend({ status: 200, body: {} });
probe = await probeResendSend(PROBE);
check('probe: a 200 with no id is still a pass', probe.ok);

stubResend({ status: 500, body: 'not json' });
probe = await probeResendSend(PROBE);
check('probe: a 5xx with an unreadable body still reports the status', !probe.ok && probe.detail.endsWith('(500)'));

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
