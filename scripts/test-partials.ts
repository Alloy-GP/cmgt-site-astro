/**
 * Verifies the hold on started-but-unfinished proposals, with no network and no
 * keys:  npm run test:partials   (Node >= 22.6)
 *
 * An in-memory store stands in for Vercel Blob. The checks are about WHAT the
 * store ends up holding and what the sweep hands back: a started form is held,
 * a finished form (same email in any case, or the same ref) releases it, the
 * sweep returns only partials past the hold, a store problem means "send now",
 * and the support email says what it is.
 */
export {};

process.env.PARTIAL_HOLD_MINUTES = '10';
delete process.env.BLOB_READ_WRITE_TOKEN;

const P = await import('../src/lib/partials.ts');
const { holdPartial, releaseHeldFor, takeDue, renderPartialEmail, partialSlackRows, partialKey, emailKey, refOfKey, formatCentral, HOLD_MINUTES, PREFIX } = P;

let failures = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${!cond && detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  if (!cond) failures++;
}

// In-memory PartialStore with a controllable clock and fault switches.
function memStore(clock: { now: Date }) {
  const blobs = new Map<string, { body: string; uploadedAt: Date }>();
  const calls: string[] = [];
  const s = {
    blobs, calls, failPut: false, vanishOnGet: new Set<string>(),
    async put(key: string, body: string) { calls.push(`put ${key}`); if (s.failPut) throw new Error('blob store down'); blobs.set(key, { body, uploadedAt: new Date(clock.now) }); },
    async list(prefix: string) { calls.push(`list ${prefix}`); return [...blobs.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, uploadedAt: v.uploadedAt })); },
    async get(key: string) { calls.push(`get ${key}`); if (s.vanishOnGet.has(key)) return null; return blobs.get(key)?.body ?? null; },
    async del(keys: string[]) { calls.push(`del ${keys.join(',')}`); for (const k of keys) blobs.delete(k); },
  };
  return s;
}

const T0 = new Date('2026-10-30T14:00:00.000Z');
const min = (n: number) => new Date(T0.getTime() + n * 60_000);
const partial = (over: Partial<import('../src/lib/partials.ts').HeldPartial> = {}) => ({
  ref: 'REQ-261030-1234', name: 'Dana Board', email: 'Dana@Example.com', phone: '555-0100', company: '',
  role: 'Board President', source: '/request-a-proposal', intent: 'proposal', createdAt: T0.toISOString(), ...over,
});

// 1. Hold: one private blob, keyed by email hash + ref, release time = created + HOLD.
let clock = { now: T0 };
let store = memStore(clock);
let hold = await holdPartial(partial(), store);
check('hold → held, releaseAt = created + HOLD_MINUTES', hold.held && hold.releaseAt.getTime() === min(HOLD_MINUTES).getTime(), hold);
check('hold → exactly one blob under the prefix', store.blobs.size === 1 && [...store.blobs.keys()][0].startsWith(PREFIX));
check('key = prefix + 16-hex email hash + ref', [...store.blobs.keys()][0] === `${PREFIX}${emailKey('dana@example.com')}-REQ-261030-1234.json`);
check('email hash is case/space-insensitive', emailKey(' DANA@example.COM ') === emailKey('dana@example.com'));
check('refOfKey round-trips', refOfKey(partialKey('dana@example.com', 'REQ-261030-1234')) === 'REQ-261030-1234');
check('the blob holds the partial as JSON', JSON.parse([...store.blobs.values()][0].body).email === 'Dana@Example.com');

// 2. Release by email (different case, different ref) — the finished form wins.
let released = await releaseHeldFor('dana@example.com', 'REQ-OTHER-9999', store);
check('finished form (same email, other ref) releases the held partial', released.length === 1 && released[0] === 'REQ-261030-1234' && store.blobs.size === 0, released);

// 3. Release by ref (email corrected on the last step).
await holdPartial(partial(), store);
released = await releaseHeldFor('dana.board@newmail.com', 'REQ-261030-1234', store);
check('finished form (same ref, corrected email) releases it too', released.length === 1 && store.blobs.size === 0, released);

// 4. Unrelated completion releases nothing.
await holdPartial(partial(), store);
released = await releaseHeldFor('someone@else.com', 'REQ-999999-0000', store);
check('unrelated finished form releases nothing', released.length === 0 && store.blobs.size === 1);

// 5. Two partials from the same person (restarted the form) → both released by one completion.
await holdPartial(partial({ ref: 'REQ-261030-5678' }), store);
check('a restarted form is a second held blob', store.blobs.size === 2);
released = await releaseHeldFor('DANA@EXAMPLE.COM', '', store);
check('one completion releases every held partial for that email', released.length === 2 && store.blobs.size === 0, released);

// 6. Sweep timing: nothing due inside the hold, due at the hold, heldMinutes reported.
store = memStore(clock);
await holdPartial(partial(), store);
let sweep = await takeDue(min(5), store);
check('sweep at +5 min → nothing due, 1 pending', sweep.due.length === 0 && sweep.pending === 1);
sweep = await takeDue(min(10), store);
check('sweep at +10 min → 1 due, heldMinutes 10, not expired', sweep.due.length === 1 && sweep.due[0].heldMinutes === 10 && !sweep.due[0].expired, sweep.due);
check('due partial is the one that was held', sweep.due[0]?.partial.email === 'Dana@Example.com' && sweep.due[0]?.partial.role === 'Board President');
await sweep.done(sweep.due[0].key);
check('done() removes the blob', store.blobs.size === 0);

// 7. Oldest first; expired after MAX_AGE_HOURS.
clock.now = T0; await holdPartial(partial({ ref: 'REQ-OLD', email: 'old@example.com' }), store);
clock.now = min(30); await holdPartial(partial({ ref: 'REQ-NEW', email: 'new@example.com' }), store);
sweep = await takeDue(new Date(T0.getTime() + 25 * 3_600_000), store);
check('two due, oldest first', sweep.due.length === 2 && sweep.due[0].partial.ref === 'REQ-OLD' && sweep.due[1].partial.ref === 'REQ-NEW');
check('a 25-hour-old partial is expired; a 24.5-hour one too', sweep.due[0].expired && sweep.due[1].expired);
sweep = await takeDue(min(45), store);
check('at +45 min neither is expired', sweep.due.length === 2 && sweep.due.every((d) => !d.expired));

// 8. Unreadable blob → dropped and deleted; a blob released between list and get → skipped.
store = memStore({ now: T0 });
store.blobs.set(`${PREFIX}deadbeefdeadbeef-REQ-BAD.json`, { body: 'not json', uploadedAt: T0 });
await holdPartial(partial({ ref: 'REQ-GONE', email: 'gone@example.com' }), store);
store.vanishOnGet.add(partialKey('gone@example.com', 'REQ-GONE'));
sweep = await takeDue(min(20), store);
check('corrupt blob is dropped (and deleted), vanished blob is skipped, nothing due', sweep.dropped.length === 1 && sweep.due.length === 0 && !store.blobs.has(`${PREFIX}deadbeefdeadbeef-REQ-BAD.json`), sweep);

// 9. Store failures never throw: hold reports "not held", release reports nothing.
store = memStore({ now: T0 }); store.failPut = true;
hold = await holdPartial(partial(), store);
check('store down → { held: false, reason }', !hold.held && /down/.test(hold.reason), hold);
hold = await holdPartial(partial(), null);
check('no store (no BLOB_READ_WRITE_TOKEN) → { held: false } naming the token', !hold.held && /BLOB_READ_WRITE_TOKEN/.test(hold.reason), hold);
check('no store → release is a no-op', (await releaseHeldFor('x@y.z', 'r', null)).length === 0);
check('no store → sweep is empty', (await takeDue(T0, null)).due.length === 0);
hold = await holdPartial(partial({ email: '' }), memStore({ now: T0 }));
check('no email → not held', !hold.held);

// 10. The support email.
const mail = renderPartialEmail(partial(), { held: true, heldMinutes: 12, label: 'Proposal Request', completeTo: ['newdevelopment@cmgt.org', 'savannahestes@cmgt.org'] });
check('subject keeps the "Started (incomplete)" shape', mail.subject === 'Started (incomplete): Proposal Request — Dana Board', mail.subject);
check('body names the person, role, email, phone', ['Dana Board', 'Board President', 'Dana@Example.com', '555-0100'].every((t) => mail.html.includes(t)));
check('body says how long it was held and when it started', mail.html.includes('12 minutes later') && mail.html.includes('9:00 AM CT'), mail.html.match(/at [^<]+ and had not/)?.[0]);
check('body tells support what this usually is and what to do', /homeowners who picked the wrong form/.test(mail.html) && /reply from info@/.test(mail.html));
check('body says sales hears separately if the form is finished', mail.html.includes('newdevelopment@cmgt.org and savannahestes@cmgt.org receive the complete request'));
check('html-escapes answers', renderPartialEmail(partial({ name: '<b>x</b>' }), { held: true, label: 'L', completeTo: [] }).html.includes('&lt;b&gt;x&lt;/b&gt;'));
const now = renderPartialEmail(partial(), { held: false, label: 'Proposal Request', completeTo: [] });
check('unheld (fallback) email says the hold was unavailable', /hold was unavailable/.test(now.html) && !/minutes later/.test(now.html));

// 11. Slack rows and the Central-time formatter.
const rows = partialSlackRows(partial());
check('slack rows carry name/email/phone/role/ref/stage', ['Name', 'Email', 'Phone', 'Role', 'Ref', 'Stage'].every((k) => rows.some(([a]) => a === k)) && rows.find(([k]) => k === 'Stage')?.[1] === 'partial');
check('formatCentral → h:mm AM/PM CT', /^\d{1,2}:\d{2} (AM|PM) CT$/.test(formatCentral(T0)) && formatCentral(T0) === '9:00 AM CT', formatCentral(T0));
check('formatCentral with date', formatCentral(T0, { date: true }) === 'Oct 30, 9:00 AM CT', formatCentral(T0, { date: true }));

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
