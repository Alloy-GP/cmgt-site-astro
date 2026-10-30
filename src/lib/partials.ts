// src/lib/partials.ts
//
// Started-but-unfinished proposals ("partials") are HELD, not sent.
//
// The wizard's contact step used to email new business and create a Pipedrive
// deal the moment it was completed. CMGT's own count (2026-10-30): every started
// form that was never finished was a current homeowner who had picked the wrong
// form, and every real prospect who paused for a minute produced two emails and
// two deals. So:
//
//   1. /api/lead (stage=partial) calls holdPartial(). The contact-step answers
//      are written to a PRIVATE Vercel Blob under partials/<email-hash>-<ref>.
//      Nothing is emailed, nothing reaches Pipedrive or Mailchimp. Slack gets a
//      ⏳ line saying when the hold ends and where the email goes if it does.
//   2. /api/lead (stage=complete) calls releaseHeldFor(email, ref) once the staff
//      email has gone: every held partial with the same email (any case) or the
//      same ref is deleted. The complete submission IS the notification.
//   3. /api/partial-sweep (Vercel cron, every 5 minutes) calls takeDue(). A
//      partial older than HOLD_MINUTES is emailed to partialRoutes — customer
//      support at info@, not sales — posted to Slack 📬, tagged in Mailchimp,
//      then deleted. A send that fails stays for the next sweep; after
//      MAX_AGE_HOURS it is dropped with a warning so nothing loops forever.
//
// Store: Vercel Blob (store "cmgt-form-partials", connected to the Vercel
// project, which sets BLOB_READ_WRITE_TOKEN). Blobs are private — readable only
// with the token — and hold name/email/phone/role, nothing else. No token (local
// dev, a site that has not connected a store) → holdPartial() reports
// { held: false } and /api/lead sends the partial at once, still to info@ and
// still without Pipedrive: the hold is a progressive enhancement, never a
// precondition for a lead being recorded.
//
// The store is injectable so scripts/test-partials.ts drives every path with an
// in-memory one and no network. HOLD_MINUTES can be overridden per environment
// with PARTIAL_HOLD_MINUTES (e.g. 1 on a preview, to test the sweep quickly).

import { createHash } from 'node:crypto';

export interface HeldPartial {
  ref: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  source: string;
  intent: string;
  createdAt: string; // ISO 8601, set by /api/lead when the hold begins
}

export interface StoredBlob { key: string; uploadedAt: Date }

export interface PartialStore {
  put(key: string, body: string): Promise<void>;
  list(prefix: string): Promise<StoredBlob[]>;
  /** The blob's text, or null when it no longer exists (released between list and get). */
  get(key: string): Promise<string | null>;
  del(keys: string[]): Promise<void>;
}

const holdEnv = import.meta.env.PARTIAL_HOLD_MINUTES ?? process.env.PARTIAL_HOLD_MINUTES;
/** How long a started form waits before support hears about it. */
export const HOLD_MINUTES = Math.max(1, Number(holdEnv) || 10);
/** A partial whose email keeps failing is dropped (with a Slack warning) after this long. */
export const MAX_AGE_HOURS = 24;
export const PREFIX = 'partials/';

/** Stable, non-reversible handle for an email address: the first 16 hex of its SHA-256. */
export function emailKey(email: string): string {
  return createHash('sha256').update((email || '').trim().toLowerCase()).digest('hex').slice(0, 16);
}
const safeRef = (ref: string) => (ref || 'noref').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
export function partialKey(email: string, ref: string): string {
  return `${PREFIX}${emailKey(email)}-${safeRef(ref)}.json`;
}
/** `partials/<16 hex>-<ref>.json` → `<ref>` as stored. */
export const refOfKey = (key: string) => key.slice(PREFIX.length + 17, -'.json'.length);

// ── Default store: Vercel Blob ───────────────────────────────────────────
function blobStore(): PartialStore | null {
  const token = import.meta.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const sdk = () => import('@vercel/blob');
  return {
    async put(key, body) {
      const { put } = await sdk();
      await put(key, body, {
        access: 'private', addRandomSuffix: false, allowOverwrite: true,
        contentType: 'application/json', cacheControlMaxAge: 60, token,
      });
    },
    async list(prefix) {
      const { list } = await sdk();
      const out: StoredBlob[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, token, limit: 1000, ...(cursor ? { cursor } : {}) });
        for (const b of page.blobs) out.push({ key: b.pathname, uploadedAt: new Date(b.uploadedAt) });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
    async get(key) {
      const { get } = await sdk();
      const res = await get(key, { access: 'private', useCache: false, token });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      return await new Response(res.stream).text();
    },
    async del(keys) {
      if (!keys.length) return;
      const { del } = await sdk();
      await del(keys, { token });
    },
  };
}

export type HoldResult = { held: true; releaseAt: Date } | { held: false; reason: string };

/** Hold a started form. Never throws: a store problem means "send it now" to the caller. */
export async function holdPartial(p: HeldPartial, store: PartialStore | null = blobStore()): Promise<HoldResult> {
  if (!store) return { held: false, reason: 'no BLOB_READ_WRITE_TOKEN — no store to hold it in' };
  if (!p.email) return { held: false, reason: 'no email' };
  try {
    await store.put(partialKey(p.email, p.ref), JSON.stringify(p));
    return { held: true, releaseAt: new Date(Date.parse(p.createdAt) + HOLD_MINUTES * 60_000) };
  } catch (err) {
    console.error('[partials] hold failed:', err);
    return { held: false, reason: (err as Error).message || 'store error' };
  }
}

/**
 * The full form is in: drop every held partial for this person — same email in
 * any case (they may have typed it differently) or the same ref (they corrected
 * the email on the last step). Returns the refs released. Never throws.
 */
export async function releaseHeldFor(email: string, ref: string, store: PartialStore | null = blobStore()): Promise<string[]> {
  if (!store) return [];
  try {
    const byEmail = email ? await store.list(`${PREFIX}${emailKey(email)}-`) : [];
    const suffix = ref ? `-${safeRef(ref)}.json` : null;
    const byRef = suffix ? (await store.list(PREFIX)).filter((b) => b.key.endsWith(suffix)) : [];
    const keys = [...new Set([...byEmail, ...byRef].map((b) => b.key))];
    if (keys.length) await store.del(keys);
    return keys.map(refOfKey);
  } catch (err) {
    console.error('[partials] release failed:', err);
    return [];
  }
}

export interface DuePartial { key: string; partial: HeldPartial; heldMinutes: number; expired: boolean }
export interface Sweep {
  due: DuePartial[];
  /** Held partials still inside the hold window. */
  pending: number;
  /** Keys that held unreadable JSON and were deleted. */
  dropped: string[];
  /** Delete a due partial once it has been sent. */
  done(key: string): Promise<void>;
}

/** Everything whose hold has ended, oldest first. The caller sends and then calls done(). */
export async function takeDue(now: Date = new Date(), store: PartialStore | null = blobStore()): Promise<Sweep> {
  if (!store) return { due: [], pending: 0, dropped: [], done: async () => {} };
  const blobs = (await store.list(PREFIX)).sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
  const due: DuePartial[] = [];
  const dropped: string[] = [];
  let pending = 0;
  for (const b of blobs) {
    const ageMin = (now.getTime() - b.uploadedAt.getTime()) / 60_000;
    if (ageMin < HOLD_MINUTES) { pending++; continue; }
    const body = await store.get(b.key);
    if (body == null) continue; // released between list and get
    let partial: HeldPartial | null = null;
    try {
      const j = JSON.parse(body);
      if (j && typeof j.email === 'string' && typeof j.name === 'string') partial = j as HeldPartial;
    } catch { /* unreadable — dropped below */ }
    if (!partial) {
      dropped.push(b.key);
      await store.del([b.key]).catch(() => {});
      continue;
    }
    due.push({ key: b.key, partial, heldMinutes: Math.round(ageMin), expired: ageMin >= MAX_AGE_HOURS * 60 });
  }
  return { due, pending, dropped, done: (key) => store.del([key]) };
}

// ── Rendering ────────────────────────────────────────────────────────────
/** "9:41 AM CT", or "Oct 30, 9:41 AM CT" with { date: true }. CMGT is Central. */
export function formatCentral(d: Date, opts: { date?: boolean } = {}): string {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit',
    ...(opts.date ? { month: 'short', day: 'numeric' } : {}),
  });
  return `${f.format(d)} CT`;
}

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The email customer support receives about a started, unfinished form. It
 * says plainly what this usually is (a homeowner on the wrong form), what to
 * do (reply from info@), and that sales hears separately if the form is ever
 * finished — so nobody forwards it to new business by hand.
 */
export function renderPartialEmail(
  p: HeldPartial,
  o: { held: boolean; heldMinutes?: number; label: string; completeTo: string[] }
): { subject: string; html: string } {
  const started = formatCentral(new Date(p.createdAt), { date: true });
  const subject = `Started (incomplete): ${o.label} — ${p.company || p.name}`;
  const opening = o.held
    ? `<strong>⚠️ Started but not finished.</strong> ${esc(p.name)} opened the proposal form at ${started} and had not finished it ${o.heldMinutes ?? HOLD_MINUTES} minutes later.`
    : `<strong>⚠️ Started but not finished.</strong> ${esc(p.name)} completed the contact step of the proposal form at ${started}. The usual ${HOLD_MINUTES}-minute hold was unavailable, so this went out at once — a complete request may still follow.`;
  const sales = o.completeTo.length ? o.completeTo.map(esc).join(' and ') : 'new business';
  const rows: Array<[string, string]> = [
    ['Role', p.role], ['Name', p.name], ['Email', p.email], ['Phone', p.phone], ['Company', p.company],
  ];
  const html = `
    <p style="background:#FFF4E5;border-left:3px solid #E0902F;padding:10px 14px;margin:0 0 14px;font-size:14px;color:#7a5310;line-height:1.5">
      ${opening} Most of these are current homeowners who picked the wrong form — a short reply from info@ pointing them to the right place is usually all that is needed.
      If they do finish the form later, ${sales} receive the complete request separately; nothing more is needed from you.
    </p>
    <h2>${esc(o.label)} (incomplete)</h2>
    <table style="border-collapse:collapse;margin:14px 0;font-size:14px">
      ${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#888;white-space:nowrap;vertical-align:top"><strong>${esc(k)}</strong></td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('')}
    </table>
    <hr><p style="color:#888;font-size:12px">${p.ref ? `Ref ${esc(p.ref)} · ` : ''}Form: ${esc(p.intent || 'lead')} · stage: partial${o.held ? ` · held ${o.heldMinutes ?? HOLD_MINUTES} min` : ''}${p.source ? ` · Source ${esc(p.source)}` : ''}</p>
  `;
  return { subject, html };
}

/** The Slack rows for a partial, in the same order as the email. */
export function partialSlackRows(p: HeldPartial): Array<[string, string]> {
  return [
    ['Name', p.name], ['Email', p.email], ['Phone', p.phone], ['Company', p.company], ['Role', p.role],
    ['Ref', p.ref], ['Intent', p.intent], ['Stage', 'partial'], ['Source', p.source],
  ];
}
