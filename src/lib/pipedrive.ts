// src/lib/pipedrive.ts
// Pushes a website lead into Pipedrive as Organization → Person → Deal (+ a note),
// ported from the meet-cmgt landing (api/send-meet-form.js).
//
// Fire-and-forget: this NEVER throws — it logs on failure so a Pipedrive hiccup
// can't break a form submission. It's a NO-OP unless BOTH are true:
//   • PIPEDRIVE_API_TOKEN is set, and
//   • PUBLIC_ENV === 'production'  (so stg/dev test leads never create real deals)
//
// Env vars (set on the Vercel PRODUCTION env):
//   PIPEDRIVE_API_TOKEN    — Pipedrive personal API token (required to activate)
//   PIPEDRIVE_PIPELINE_ID  — pipeline for new deals (optional; DEAL_PIPELINE_ID below if unset)
//   PIPEDRIVE_STAGE_ID     — stage for new deals (optional; the pipeline's first stage if unset)
//   PIPEDRIVE_OWNER_ID     — Pipedrive user id to own new Org/Person/Deal (optional;
//                            DEAL_OWNER_ID below if unset).
//   PIPEDRIVE_DEAL_FIELD_HOMES, PIPEDRIVE_DEAL_FIELD_ADDRESS — optional. API keys of the
//                            Deal's "Number of Homes" / "Community Address" custom fields.
//                            Only needed if a field is ever renamed in Pipedrive — by
//                            default they're found by name (see FIELD_MAP).

interface PipedriveLead {
  email: string;
  name: string;
  phone?: string;
  role?: string;
  org?: string;
  address?: string; // property/community address — set on the Organization so it shows on the Deal card
  notes?: string;
  source: string;
  /** The form's labeled answers (fieldsJson). Everything is already in `notes`;
   *  the entries matched by FIELD_MAP are ALSO written to real Pipedrive fields. */
  fields?: FormAnswer[];
  /** 'partial' = the proposal wizard's contact step was completed but the form
   *  wasn't submitted; 'complete' (default) = full submission. */
  stage?: 'partial' | 'complete';
  /** On a complete submission: the ids the partial capture returned to the
   *  browser (PipedriveOutcome.personId / dealId), echoed back by the form.
   *  They let the full submission find its Person and partial deal directly,
   *  without depending on Pipedrive's search index — which can lag behind a
   *  record created minutes earlier — and even if the visitor corrected their
   *  email on the way to the last step. Never trusted blindly (see below). */
  partial?: { personId?: number | undefined; dealId?: number | undefined } | undefined;
}

// Deals created from partial (started, not submitted) proposals get this title
// prefix. It's how the full submission finds and removes them later — keep the
// prefix stable or old partials won't be cleaned up.
export const PARTIAL_DEAL_PREFIX = 'Started, not submitted —';

interface FormAnswer { label: string; value: string }

// ── Where new deals land ──────────────────────────────────────────────────────
// Every proposal goes to Savannah's pipeline, in its first stage ("WIP") unless
// DEAL_STAGE_ID names one. Ids come from GET /v1/pipelines and /v1/stages; the env
// vars PIPEDRIVE_PIPELINE_ID / PIPEDRIVE_STAGE_ID override them per deployment.
// If Pipedrive rejects the routing (pipeline or stage deleted), the deal is
// created again without it — Pipedrive's default pipeline — rather than lost,
// and the failure is logged.
const DEAL_PIPELINE_ID = 12;                         // "Sav - Warm & Closing"
const DEAL_STAGE_ID: number | undefined = undefined; // e.g. 87 = "Needs Proposal"
// Owner of every new Organization / Person / Deal (Pipedrive user id, from
// GET /v1/users). PIPEDRIVE_OWNER_ID overrides. Without either, Pipedrive would
// assign whoever the API token belongs to.
const DEAL_OWNER_ID = 26876223;                      // Savannah

// ── Form answers → Pipedrive custom fields ────────────────────────────────────
// Every proposal answer lands in the deal's note. The mappings below ALSO write
// chosen answers into Pipedrive's own fields, so they show in the deal summary
// and can be filtered / reported on.
//
// A mapping is matched by the field's NAME in Pipedrive (Settings → Data fields),
// resolved to its API key (a 40-char hash) at runtime and cached, so nothing here
// changes if the field is recreated. Names compare case- and punctuation-
// insensitively ("No. of homes" matches "no of homes"). If the field is named
// something else in Pipedrive, add the name to `pipedrive` or put its API key
// in the `keyEnv` env var.
//
// To map another answer: add an entry. `form` is the label the form sends in
// fieldsJson (IntakeForm.jsx → buildFields / the proposal INTENT fields).
// Values are coerced to the Pipedrive field's type: numeric fields get a number
// (first number found in the answer: "1,200 units" → 1200), single/multi-option
// fields get the option whose label matches, text fields get the text as typed.
//
// Mappings can target the Organization too (entity: 'organization'); those apply
// only when this lead creates the org — an EXISTING organization is left
// untouched because staff may have curated it.

type PdEntity = 'deal' | 'organization';

interface FieldMapping {
  form: string;           // form label to read (from fieldsJson)
  entity: PdEntity;       // record the value is written to
  pipedrive: string[];    // accepted Pipedrive field names, in order of preference
  keyEnv: string;         // env var that may hold the field's API key instead
  key?: string;           // that env var's value (read statically so Astro inlines it)
  as?: 'number';          // force numeric parsing even when the field is text
}

const FIELD_MAP: FieldMapping[] = [
  // "Number of units" on the proposal form → "Number of Homes" on the Deal
  // (CMGT's Pipedrive: a Numerical custom field, key ad8d8653…; it's found by
  // name so the key isn't hardcoded).
  {
    form: 'Number of units',
    entity: 'deal',
    pipedrive: ['Number of Homes', '# of Homes', 'No. of Homes', 'Homes', 'Number of Units', '# of Units', 'Units'],
    keyEnv: 'PIPEDRIVE_DEAL_FIELD_HOMES',
    key: import.meta.env.PIPEDRIVE_DEAL_FIELD_HOMES || undefined,
    as: 'number',
  },
  // "Location" → "Community Address" on the Deal (an Address field; Pipedrive
  // geocodes the text into its city/state/ZIP sub-fields). The form only
  // collects city + state ("Baton Rouge, LA") — Places suggestions are
  // restricted to cities — so that's what lands here until a street-address
  // field exists. The same value goes on the Organization's standard address.
  {
    form: 'Location',
    entity: 'deal',
    pipedrive: ['Community Address', 'Property Address', 'Address'],
    keyEnv: 'PIPEDRIVE_DEAL_FIELD_ADDRESS',
    key: import.meta.env.PIPEDRIVE_DEAL_FIELD_ADDRESS || undefined,
  },
];

interface PdField {
  key: string;
  name: string;
  field_type: string;
  options?: { id: number; label: string }[];
}

const NUMERIC_TYPES = new Set(['double', 'monetary', 'int']);
const FIELDS_TTL_MS = 10 * 60 * 1000;
// Field list per entity, cached for the life of the (warm) function instance.
const fieldsCache: Partial<Record<PdEntity, { at: number; fields: PdField[] }>> = {};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

async function listFields(base: string, qs: string, entity: PdEntity): Promise<PdField[]> {
  const hit = fieldsCache[entity];
  if (hit && Date.now() - hit.at < FIELDS_TTL_MS) return hit.fields;
  const path = entity === 'deal' ? 'dealFields' : 'organizationFields';
  const fields: PdField[] = [];
  let start = 0;
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`${base}/${path}?start=${start}&limit=500&${qs}`);
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    const data = await res.json();
    fields.push(...((data?.data ?? []) as PdField[]));
    const pg = data?.additional_data?.pagination;
    if (!pg?.more_items_in_collection) break;
    start = pg.next_start;
  }
  fieldsCache[entity] = { at: Date.now(), fields };
  return fields;
}

// Coerce a form answer to what the Pipedrive field type expects; undefined = skip.
function coerce(raw: string, field: PdField, as?: 'number'): string | number | undefined {
  const numeric = NUMERIC_TYPES.has(field.field_type);
  if (numeric || as === 'number') {
    const found = raw.replace(/,/g, '').match(/\d+(\.\d+)?/)?.[0];
    if (!found) return undefined;
    return numeric ? Number(found) : found;
  }
  if (field.field_type === 'enum') {
    return field.options?.find((o) => norm(o.label) === norm(raw))?.id;
  }
  if (field.field_type === 'set') {
    const ids = raw.split(',')
      .map((part) => field.options?.find((o) => norm(o.label) === norm(part))?.id)
      .filter((id): id is number => typeof id === 'number');
    return ids.length ? ids.join(',') : undefined;
  }
  return raw;
}

/** `{ [fieldKey]: value }` for every FIELD_MAP entry on `entity` that has both a
 *  form answer and a resolvable Pipedrive field. Never throws; logs and returns
 *  what it could resolve. */
async function customFields(base: string, qs: string, entity: PdEntity, answers?: FormAnswer[]): Promise<Record<string, string | number>> {
  const out: Record<string, string | number> = {};
  const wanted = FIELD_MAP.filter((m) => m.entity === entity);
  if (!wanted.length || !answers?.length) return out;
  let fields: PdField[] | undefined;
  for (const m of wanted) {
    const raw = answers.find((a) => norm(a.label) === norm(m.form))?.value?.trim();
    if (!raw) continue;
    try {
      fields ??= await listFields(base, qs, entity);
    } catch (err) {
      console.error(`[pipedrive] could not list ${entity} fields:`, err);
      return out;
    }
    const field = m.key
      ? fields.find((f) => f.key === m.key)
      : m.pipedrive.map(norm).map((n) => fields!.find((f) => norm(f.name) === n)).find(Boolean);
    if (!field) {
      // Loud on the deal (that's the one people asked for); the org field is optional.
      const log = entity === 'deal' ? console.warn : console.info;
      log(
        m.key
          ? `[pipedrive] ${m.keyEnv}=${m.key} is not a ${entity} field key — "${m.form}" stays in the note only.`
          : `[pipedrive] no ${entity} field named "${m.pipedrive[0]}" — "${m.form}" stays in the note only. Rename the field in Pipedrive or set ${m.keyEnv} to its API key.`,
      );
      continue;
    }
    const value = coerce(raw, field, m.as);
    if (value === undefined) {
      console.warn(`[pipedrive] "${m.form}" = ${JSON.stringify(raw)} can't be stored in ${entity} field "${field.name}" (${field.field_type}) — skipped.`);
      continue;
    }
    out[field.key] = value;
  }
  return out;
}

async function upsertOrganization(
  base: string, qs: string, orgName: string, ownerId?: number, address?: string,
  custom: Record<string, string | number> = {},
): Promise<number | undefined> {
  try {
    const searchRes = await fetch(
      `${base}/organizations/search?term=${encodeURIComponent(orgName)}&exact_match=true&${qs}`,
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      const existing = data?.data?.items?.[0]?.item?.id;
      // Existing org — leave it as-is (staff can edit); don't overwrite a curated address.
      if (existing) return existing;
    }
    const createRes = await fetch(`${base}/organizations?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orgName,
        ...(address ? { address } : {}),
        ...(ownerId ? { owner_id: ownerId } : {}),
        ...custom,
      }),
    });
    const created = await createRes.json();
    return created?.data?.id || undefined;
  } catch {
    return undefined;
  }
}

// ── Person lookup ─────────────────────────────────────────────────────────────
interface PdPerson { id: number; emails: string[]; phones: string[]; orgId?: number }
const lower = (v: string) => v.trim().toLowerCase();
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// /persons/search items and GET /persons/{id} records have different shapes;
// both are reduced to the few fields the partial → full handoff needs.
function personFromSearchItem(item: any): PdPerson | undefined {
  if (!item?.id) return undefined;
  return {
    id: item.id,
    emails: ((item.emails ?? []) as string[]).filter(Boolean).map(lower),
    phones: ((item.phones ?? []) as string[]).filter(Boolean),
    orgId: item.organization?.id || undefined,
  };
}
function personFromRecord(rec: any): PdPerson | undefined {
  if (!rec?.id) return undefined;
  const org = rec.org_id;
  return {
    id: rec.id,
    emails: ((rec.email ?? []) as { value?: string }[]).map((e) => lower(e?.value ?? '')).filter(Boolean),
    phones: ((rec.phone ?? []) as { value?: string }[]).map((e) => e?.value ?? '').filter(Boolean),
    orgId: (typeof org === 'object' && org ? org.value : org) || undefined,
  };
}

async function findPersonByEmail(base: string, qs: string, email: string): Promise<PdPerson | undefined> {
  const res = await fetch(
    `${base}/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&${qs}`,
  );
  if (!res.ok) return undefined;
  const data = await res.json();
  return personFromSearchItem(data?.data?.items?.[0]?.item);
}

async function getPerson(base: string, qs: string, id: number): Promise<PdPerson | undefined> {
  try {
    const res = await fetch(`${base}/persons/${id}?${qs}`);
    if (!res.ok) return undefined;
    return personFromRecord((await res.json())?.data);
  } catch {
    return undefined;
  }
}

// Open partial-capture deals on a person (by title prefix). Reads the person's
// deals directly — not the search index — so a deal created seconds ago counts.
async function openPartialDeals(base: string, qs: string, personId: number): Promise<number[]> {
  try {
    const res = await fetch(`${base}/persons/${personId}/deals?status=open&limit=100&${qs}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? [])
      .filter((d: { title?: string }) => (d.title ?? '').startsWith(PARTIAL_DEAL_PREFIX))
      .map((d: { id: number }) => d.id);
  } catch {
    return [];
  }
}

// The deal, if it is an OPEN PARTIAL-CAPTURE deal — the only kind a full
// submission may remove. The id comes from the browser, so it is checked
// against the record before anything is done with it.
async function openPartialDeal(base: string, qs: string, id: number): Promise<number | undefined> {
  try {
    const res = await fetch(`${base}/deals/${id}?${qs}`);
    if (!res.ok) return undefined;
    const d = (await res.json())?.data;
    const isPartial = d?.id && d.status === 'open' && String(d.title ?? '').startsWith(PARTIAL_DEAL_PREFIX);
    return isPartial ? d.id : undefined;
  } catch {
    return undefined;
  }
}

/** What happened in Pipedrive, so the caller can log a failure where people
 *  will see it (Slack) instead of only in the function log. Never thrown. */
export interface PipedriveOutcome {
  status: 'created' | 'skipped' | 'failed';
  detail: string;
  /** Something the deal was created despite — e.g. a partial deal that could
   *  not be removed. Shown as ⚠️ in Slack so it is cleaned up by hand. */
  warning?: string | undefined;
  /** Set when an open partial deal exists for this lead (created now, or found
   *  already open): the form sends these back with the full submission. */
  personId?: number | undefined;
  dealId?: number | undefined;
}

export async function addToPipedrive(lead: PipedriveLead): Promise<PipedriveOutcome> {
  const apiToken = import.meta.env.PIPEDRIVE_API_TOKEN;
  const isProduction = import.meta.env.PUBLIC_ENV === 'production';
  // No-op unless activated in production — keeps stg/dev from creating real deals.
  if (!apiToken || !isProduction) {
    return { status: 'skipped', detail: !apiToken ? 'PIPEDRIVE_API_TOKEN not set' : 'non-production' };
  }

  const { email, name, phone, role, org, address, notes, source, fields: answers } = lead;
  const isPartial = lead.stage === 'partial';
  const hint = isPartial ? undefined : lead.partial;
  const base = 'https://api.pipedrive.com/v1';
  const qs = `api_token=${apiToken}`;

  // Owner (Pipedrive user id) for the Org / Person / Deal — see DEAL_OWNER_ID.
  const ownerId = Number(import.meta.env.PIPEDRIVE_OWNER_ID) || DEAL_OWNER_ID;

  const [firstName, ...rest] = (name || '').trim().split(' ');
  const lastName = rest.join(' ');

  try {
    // Custom-field values from the form answers (FIELD_MAP), resolved up front so
    // a lookup hiccup can't leave a half-created lead behind. Each is {} when
    // nothing resolves — the answers are still in the note either way.
    const orgCustom  = org && !isPartial ? await customFields(base, qs, 'organization', answers) : {};
    const dealCustom = isPartial ? {} : await customFields(base, qs, 'deal', answers);

    // 0. Upsert Organization so we can attach it to both Person and Deal.
    //    Address is stored here (Pipedrive's standard address lives on the Org),
    //    so it surfaces on the Deal card via the linked organization.
    // Partials only have contact info — no org until the full form comes in.
    const orgId = org && !isPartial ? await upsertOrganization(base, qs, org, ownerId, address, orgCustom) : undefined;

    // 1. Find the Person — by email first. On a complete submission, if the
    //    search index has not caught up with the person the partial capture
    //    created minutes ago, or the visitor corrected their email on the last
    //    step, fall back to the id the form echoed back. A hinted person is
    //    adopted only if it is demonstrably ours: it carries the submitted
    //    email, or the hinted partial deal is open on it.
    let person = await findPersonByEmail(base, qs, email);
    if (!person && hint?.personId) {
      const hinted = await getPerson(base, qs, hint.personId);
      if (hinted) {
        const ours = hinted.emails.includes(lower(email))
          || (!!hint.dealId && (await openPartialDeals(base, qs, hinted.id)).includes(hint.dealId));
        if (ours) person = hinted;
      }
    }

    let personId = person?.id;
    if (person) {
      // Fill in what the earlier record lacks: the partial capture had no org;
      // a corrected email becomes primary, the old one is kept; a phone is added
      // only if there is none. Nothing already on the record is overwritten.
      const patch: Record<string, unknown> = {};
      if (!person.emails.includes(lower(email))) {
        patch.email = [{ value: email, primary: true }, ...person.emails.map((value) => ({ value, primary: false }))];
      }
      if (phone && !person.phones.length) patch.phone = [{ value: phone, primary: true }];
      if (orgId && !person.orgId) patch.org_id = orgId;
      if (Object.keys(patch).length) {
        const upd = await fetch(`${base}/persons/${person.id}?${qs}`, {
          method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(patch),
        });
        if (!upd.ok) console.error(`[pipedrive] could not update person ${person.id}:`, upd.status);
      }
    } else {
      const personRes = await fetch(`${base}/persons?${qs}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          name: `${firstName}${lastName ? ' ' + lastName : ''}`,
          email: [{ value: email, primary: true }],
          ...(phone ? { phone: [{ value: phone, primary: true }] } : {}),
          ...(orgId ? { org_id: orgId } : {}),
          ...(ownerId ? { owner_id: ownerId } : {}),
        }),
      });
      const personData = await personRes.json();
      personId = personData?.data?.id;
      if (!personRes.ok || !personId) {
        console.error('[pipedrive] create person error:', personData?.error);
        return { status: 'failed', detail: `create person: ${personRes.status} ${JSON.stringify(personData?.error ?? personData?.error_info ?? '')}` };
      }
    }

    // 2. The partial deal(s) this submission supersedes.
    const openPartials = await openPartialDeals(base, qs, personId!);
    // A restarted form shouldn't stack a second partial on the same person.
    if (isPartial && openPartials.length) {
      return { status: 'skipped', detail: `open partial deal ${openPartials[0]} already exists`, personId, dealId: openPartials[0] };
    }
    // The partial deal the browser named, when it is not on this person (the
    // email changed and an older record won the search): removed too, but only
    // if the record really is an open partial-capture deal.
    let superseded = openPartials;
    if (hint?.dealId && !openPartials.includes(hint.dealId)) {
      const extra = await openPartialDeal(base, qs, hint.dealId);
      if (extra) superseded = [...openPartials, extra];
    }

    // 3. Create the Deal linked to the Person + Organization.
    //    Title is just the organization / HOA name (per Ken). Falls back to the
    //    submitter's name only when no org was provided.
    const dealTitle = isPartial
      ? `${PARTIAL_DEAL_PREFIX} ${name}`
      : (org && org.trim()) ? org.trim() : name;
    const dealBase = {
      title: dealTitle,
      person_id: personId,
      ...(orgId ? { org_id: orgId } : {}),
      ...(ownerId ? { user_id: ownerId } : {}), // deal owner (Pipedrive uses user_id here)
      status: 'open',
      visible_to: 3, // Everyone
    };
    // Pipeline / stage. A stage implies its pipeline, so only one is sent
    // (Pipedrive ignores pipeline_id when stage_id is present).
    const pipelineId = Number(import.meta.env.PIPEDRIVE_PIPELINE_ID) || DEAL_PIPELINE_ID;
    const stageId    = Number(import.meta.env.PIPEDRIVE_STAGE_ID) || DEAL_STAGE_ID;
    const routing: Record<string, number> = stageId ? { stage_id: stageId } : pipelineId ? { pipeline_id: pipelineId } : {};
    // Try the full deal first; if Pipedrive rejects it, drop the routing, then
    // the custom fields, so a lead ends up in the CRM even when a stage was
    // deleted or a field changed shape. Each step down is logged.
    const attempts: Record<string, unknown>[] = [
      { ...dealBase, ...dealCustom, ...routing }, // e.g. "Number of Homes" ← "Number of units"
      ...(Object.keys(routing).length ? [{ ...dealBase, ...dealCustom }] : []),
      ...(Object.keys(dealCustom).length ? [dealBase] : []),
    ];
    let dealId: number | undefined;
    let lastDealError = '';
    for (const [i, body] of attempts.entries()) {
      const dealRes = await fetch(`${base}/deals?${qs}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      const dealData = await dealRes.json();
      dealId = dealData?.data?.id;
      if (dealRes.ok && dealId) {
        if (i > 0) console.error(`[pipedrive] deal ${dealId} created only on attempt ${i + 1} — check the pipeline/stage ids and FIELD_MAP.`);
        break;
      }
      console.error(`[pipedrive] create deal error (attempt ${i + 1}/${attempts.length}):`, dealData?.error, dealData?.error_info ?? '');
      lastDealError = `${dealRes.status} ${dealData?.error ?? ''} ${dealData?.error_info ?? ''}`.trim();
    }
    if (!dealId) {
      // The partial deal (if any) is left in place: it is still the lead's only
      // record in the CRM.
      return { status: 'failed', detail: `create deal: ${lastDealError}` };
    }

    // 4. The full proposal is in — remove this person's partial deal(s) so sales
    //    sees one record, not two. Done only AFTER the full deal exists, so a
    //    failure never leaves the lead with nothing. Pipedrive keeps deleted
    //    deals recoverable for 30 days. A partial that will not delete is
    //    reported (⚠️ in Slack) rather than silently left behind.
    const removed: number[] = [];
    const stuck: number[] = [];
    if (!isPartial) {
      for (const partialId of superseded) {
        let ok = false;
        try {
          ok = (await fetch(`${base}/deals/${partialId}?${qs}`, { method: 'DELETE' })).ok;
        } catch { /* reported below */ }
        (ok ? removed : stuck).push(partialId);
        if (!ok) console.error(`[pipedrive] could not delete partial deal ${partialId}`);
      }
    }

    // 5. Add a note to the Deal with the form context / submitted answers.
    const noteLines = [
      `Source: ${source}`,
      role ? `Role: ${role}` : null,
      notes ? `\n${notes}` : null,
    ].filter(Boolean).join('\n');
    if (noteLines) {
      await fetch(`${base}/notes?${qs}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ content: noteLines.replace(/\n/g, '<br>'), deal_id: dealId }),
      });
    }

    const detail = isPartial
      ? `deal ${dealId} (partial)`
      : `deal ${dealId}${removed.length ? ` (replaced partial ${removed.join(', ')})` : ''}`;
    return {
      status: 'created',
      detail,
      ...(isPartial ? { personId, dealId } : {}),
      ...(stuck.length ? { warning: `partial deal ${stuck.join(', ')} could not be removed — delete it by hand` } : {}),
    };
  } catch (err) {
    console.error('[pipedrive] unexpected error:', err);
    return { status: 'failed', detail: `unexpected: ${err instanceof Error ? err.message : String(err)}` };
  }
}
