/**
 * Verifies the /meet landing-page intent end to end through the REAL lead route
 * (src/pages/api/lead.ts), with no network and no keys:
 *   npm run test:meet   (Node >= 22.6)
 *
 * Global fetch is stubbed with an in-memory Resend + Slack + Pipedrive, and the
 * Mailchimp SDK's two list calls are stubbed on its client instance. The checks
 * are about WHERE a postcard lead ends up — newdevelopment@ + Savannah with
 * nobody cc'd, a confirmation to the submitter, one 📬 Slack line that also
 * reports the CRM push, the website-lead + meet-cmgt-landing tags, and a deal
 * in Savannah's pipeline — and that a honeypot hit and a non-sales intent go
 * nowhere near the CRM.
 */
export {};

process.env.PUBLIC_ENV = 'production';
process.env.RESEND_API_KEY = 're_test';
process.env.FORM_SLACK_WEBHOOK = 'https://hooks.slack.com/services/T/B/meet';
process.env.PIPEDRIVE_API_TOKEN = 'test-token';
process.env.MAILCHIMP_API_KEY = 'key-us1';
process.env.MAILCHIMP_SERVER_PREFIX = 'us1';
process.env.MAILCHIMP_AUDIENCE_ID = 'list-1';
for (const k of ['BLOB_READ_WRITE_TOKEN', 'PIPEDRIVE_OWNER_ID', 'PIPEDRIVE_PIPELINE_ID', 'PIPEDRIVE_STAGE_ID', 'FORM_ALERT_SLACK_URL']) delete process.env[k];

const SAVANNAH = 26876223;
const PIPELINE = 12;

type Call = { method: string; host: string; path: string; body: any };
let calls: Call[] = [];
let nextId = 500;
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

(globalThis as any).fetch = async (input: string | URL, init?: { method?: string; body?: string }) => {
  const url = new URL(String(input));
  const method = (init?.method || 'GET').toUpperCase();
  let body: any;
  try { body = init?.body ? JSON.parse(init.body) : undefined; } catch { body = init?.body; }
  const path = url.pathname.replace(/^\/v1/, '');
  calls.push({ method, host: url.host, path, body });

  if (url.host === 'api.resend.com') return json({ id: `email_${nextId++}` });
  if (url.host === 'hooks.slack.com') return new Response('ok', { status: 200 });
  if (url.host === 'api.pipedrive.com') {
    if (method === 'GET' && /Fields$/.test(path)) return json({ success: true, data: [] });
    if (method === 'GET' && path.endsWith('/search')) return json({ success: true, data: { items: [] } });
    if (method === 'GET' && /\/deals$/.test(path)) return json({ success: true, data: [] });
    if (method === 'POST') return json({ success: true, data: { id: nextId++, ...body } });
    return json({ success: true, data: null });
  }
  throw new Error(`unexpected fetch: ${method} ${url}`);
};

// The Mailchimp SDK talks HTTP through superagent, not fetch — stub its two calls.
// @ts-ignore — the SDK ships no type declarations (src/lib/mailchimp.ts gets the same `any`).
const mailchimp = (await import('@mailchimp/mailchimp_marketing')).default as any;
let mc: { kind: string; list: string; body: any }[] = [];
mailchimp.lists.setListMember = async (list: string, _hash: string, body: any) => { mc.push({ kind: 'member', list, body }); return {}; };
mailchimp.lists.updateListMemberTags = async (list: string, _hash: string, body: any) => { mc.push({ kind: 'tags', list, body }); return {}; };

const { POST } = await import('../src/pages/api/lead.ts');

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${!cond && detail !== undefined ? `  → ${JSON.stringify(detail)?.slice(0, 300)}` : ''}`);
  if (!cond) failures++;
}

// What src/components/MeetForm.jsx sends.
function meetForm(over: Record<string, string> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: 'Jane Boudreaux', email: 'Jane@Example.com', phone: '(225) 555-0100', company: 'Lakeshore HOA',
    intent: 'meet', intentLabel: 'Meet CMGT', ref: 'MEET-261102-4321', stage: 'complete', source: '/meet',
    contact_preference_other: '',
    fieldsJson: JSON.stringify([{ label: 'Role', value: 'Board President' }]),
    message: 'About 180 homes, self-managed, pool and clubhouse.',
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}
async function submit(fd: FormData) {
  calls = []; mc = [];
  const res = await POST({ request: new Request('http://localhost/api/lead', { method: 'POST', body: fd }) } as any);
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
const emails = () => calls.filter((c) => c.host === 'api.resend.com' && c.method === 'POST').map((c) => c.body);
const slack  = () => calls.filter((c) => c.host === 'hooks.slack.com').map((c) => JSON.stringify(c.body));
const pd     = (method: string, path: string) => calls.filter((c) => c.host === 'api.pipedrive.com' && c.method === method && c.path === path);

// ── 1. A complete /meet submission ───────────────────────────────────────────
let r = await submit(meetForm());
check('meet → 200 success', r.status === 200 && r.json.success === true, r);

const staff = emails().find((e) => /Meet CMGT lead/.test(e.subject));
check('staff email exists, subject "Meet CMGT lead — <community>"', !!staff && staff.subject === 'Meet CMGT lead — Lakeshore HOA', staff?.subject);
check('staff email → newdevelopment@ + Savannah', !!staff && [staff.to].flat().sort().join() === 'newdevelopment@cmgt.org,savannahestes@cmgt.org', staff?.to);
check('staff email → nobody cc\'d', !staff?.cc || [staff.cc].flat().length === 0, staff?.cc);
check('staff email from notifications@mail.cmgt.org, reply-to info@', staff?.from === 'CMGT <notifications@mail.cmgt.org>' && staff?.reply_to === 'info@cmgt.org', [staff?.from, staff?.reply_to]);
check('staff email carries the role, the community, the phone and the message',
  !!staff && /Board President/.test(staff.html) && /Lakeshore HOA/.test(staff.html) && /555-0100/.test(staff.html) && /self-managed, pool/.test(staff.html));
check('staff email footer names the ref and the form', !!staff && /MEET-261102-4321/.test(staff.html) && /Form: meet/.test(staff.html) && /Source \/meet/.test(staff.html));

const confirm = emails().find((e) => [e.to].flat().includes('Jane@Example.com'));
check('confirmation → the submitter, from hello@mail.cmgt.org', !!confirm && confirm.from === 'CMGT <hello@mail.cmgt.org>', confirm?.from);
check('confirmation subject "Thanks — talk soon." and greets by first name', confirm?.subject === 'Thanks — talk soon.' && /Hi Jane,/.test(confirm?.html ?? ''), confirm?.subject);
check('confirmation recaps what they shared', /What you shared with us/.test(confirm?.html ?? '') && /Board President/.test(confirm?.html ?? ''));
check('exactly two emails (staff + confirmation), none to Alloy', emails().length === 2 && !emails().some((e) => JSON.stringify([e.to, e.cc, e.bcc]).includes('alloygp')), emails().map((e) => e.to));

check('one Slack post: 📬 "Meet CMGT lead" → newdevelopment@ + Savannah', slack().length === 1 && /📬/.test(slack()[0]) && /Meet CMGT lead/.test(slack()[0]) && /newdevelopment@cmgt.org, savannahestes@cmgt.org/.test(slack()[0]), slack());
check('the Slack post lists the answers and reports the Pipedrive deal', /Board President/.test(slack()[0]) && /Lakeshore HOA/.test(slack()[0]) && /Pipedrive: deal/.test(slack()[0]), slack()[0]);

const member = mc.find((m) => m.kind === 'member');
const tags   = mc.find((m) => m.kind === 'tags');
check('Mailchimp: upserted as subscribed with name + company', member?.body?.status_if_new === 'subscribed' && member?.body?.merge_fields?.FNAME === 'Jane' && member?.body?.merge_fields?.COMPANY === 'Lakeshore HOA', member?.body);
check('Mailchimp: tagged website-lead + meet-cmgt-landing', !!tags && tags.body.tags.filter((t: any) => t.status === 'active').map((t: any) => t.name).sort().join() === 'meet-cmgt-landing,website-lead', tags?.body);

const person = pd('POST', '/persons')[0]?.body;
const org    = pd('POST', '/organizations')[0]?.body;
const deal   = pd('POST', '/deals')[0]?.body;
const note   = pd('POST', '/notes')[0]?.body;
check('Pipedrive: Organization = the community, owned by Savannah', org?.name === 'Lakeshore HOA' && org?.owner_id === SAVANNAH, org);
check('Pipedrive: Person with email + phone, owned by Savannah', person?.email?.[0]?.value === 'Jane@Example.com' && person?.phone?.[0]?.value === '(225) 555-0100' && person?.owner_id === SAVANNAH, person);
check('Pipedrive: Deal titled after the community, in pipeline 12, owned by Savannah', deal?.title === 'Lakeshore HOA' && deal?.pipeline_id === PIPELINE && deal?.user_id === SAVANNAH && deal?.status === 'open', deal);
check('Pipedrive: the note carries the source, the role and the message', /Meet CMGT lead · MEET-261102-4321/.test(note?.content ?? '') && /Role: Board President/.test(note?.content ?? '') && /self-managed, pool/.test(note?.content ?? ''), note?.content);
check('no partial-deal cleanup attempted (meet is single-step)', pd('DELETE', '/deals').length === 0 && !calls.some((c) => c.host === 'api.pipedrive.com' && c.method === 'DELETE'));

// ── 2. Honeypot filled → discarded: nothing sent, one Slack line, still 200 ──
r = await submit(meetForm({ contact_preference_other: 'http://spam.example' }));
check('honeypot → 200 (the bot must not learn it was caught)', r.status === 200 && r.json.success === true, r);
check('honeypot → no email, no Mailchimp, no Pipedrive', emails().length === 0 && mc.length === 0 && !calls.some((c) => c.host === 'api.pipedrive.com'));
check('honeypot → one Slack "discarded" post with the answers', slack().length === 1 && /discarded/.test(slack()[0]) && /Lakeshore HOA/.test(slack()[0]), slack());

// ── 3. A non-sales intent still gets email + Slack but never the CRM ─────────
r = await submit(meetForm({ intent: 'general', intentLabel: 'General question', fieldsJson: '[]', ref: 'REQ-261102-0001' }));
check('general → 200', r.status === 200 && r.json.success === true, r);
const general = emails().find((e) => /general inquiry/i.test(e.subject));
check('general → info@cmgt.org', !!general && [general.to].flat().join() === 'info@cmgt.org', general?.to);
check('general → no Mailchimp, no Pipedrive', mc.length === 0 && !calls.some((c) => c.host === 'api.pipedrive.com'));
check('general → one Slack post, no Pipedrive line', slack().length === 1 && !/Pipedrive/.test(slack()[0]), slack());

// ── 4. Missing name/email → 400, nothing sent ────────────────────────────────
r = await submit(meetForm({ email: '' }));
check('no email → 400, nothing sent anywhere', r.status === 400 && emails().length === 0 && slack().length === 0, r);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
