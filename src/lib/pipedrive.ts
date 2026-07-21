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
//   PIPEDRIVE_PIPELINE_ID  — pipeline for new deals (optional; Pipedrive default if unset)
//   PIPEDRIVE_STAGE_ID     — stage for new deals (optional; pipeline's first stage if unset)

interface PipedriveLead {
  email: string;
  name: string;
  phone?: string;
  role?: string;
  org?: string;
  notes?: string;
  source: string;
}

async function upsertOrganization(base: string, qs: string, orgName: string): Promise<number | undefined> {
  try {
    const searchRes = await fetch(
      `${base}/organizations/search?term=${encodeURIComponent(orgName)}&exact_match=true&${qs}`,
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      const existing = data?.data?.items?.[0]?.item?.id;
      if (existing) return existing;
    }
    const createRes = await fetch(`${base}/organizations?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName }),
    });
    const created = await createRes.json();
    return created?.data?.id || undefined;
  } catch {
    return undefined;
  }
}

export async function addToPipedrive(lead: PipedriveLead): Promise<void> {
  const apiToken = import.meta.env.PIPEDRIVE_API_TOKEN;
  const isProduction = import.meta.env.PUBLIC_ENV === 'production';
  // No-op unless activated in production — keeps stg/dev from creating real deals.
  if (!apiToken || !isProduction) return;

  const { email, name, phone, role, org, notes, source } = lead;
  const base = 'https://api.pipedrive.com/v1';
  const qs = `api_token=${apiToken}`;

  const [firstName, ...rest] = (name || '').trim().split(' ');
  const lastName = rest.join(' ');

  try {
    // 0. Upsert Organization so we can attach it to both Person and Deal.
    const orgId = org ? await upsertOrganization(base, qs, org) : undefined;

    // 1. Upsert Person — search by email first, create if not found.
    let personId: number | undefined;
    const searchRes = await fetch(
      `${base}/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&${qs}`,
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      personId = searchData?.data?.items?.[0]?.item?.id;
    }
    if (!personId) {
      const personRes = await fetch(`${base}/persons?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName}${lastName ? ' ' + lastName : ''}`,
          email: [{ value: email, primary: true }],
          ...(phone ? { phone: [{ value: phone, primary: true }] } : {}),
          ...(orgId ? { org_id: orgId } : {}),
        }),
      });
      const personData = await personRes.json();
      personId = personData?.data?.id;
      if (!personRes.ok || !personId) {
        console.error('[pipedrive] create person error:', personData?.error);
        return;
      }
    }

    // 2. Create a Deal linked to the Person + Organization.
    const dealTitle = `${name}${org ? ` — ${org}` : ''} · ${source} (cmgt.org)`;
    const dealRes = await fetch(`${base}/deals?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: dealTitle,
        person_id: personId,
        ...(orgId ? { org_id: orgId } : {}),
        ...(import.meta.env.PIPEDRIVE_PIPELINE_ID
          ? { pipeline_id: Number(import.meta.env.PIPEDRIVE_PIPELINE_ID) }
          : {}),
        ...(import.meta.env.PIPEDRIVE_STAGE_ID
          ? { stage_id: Number(import.meta.env.PIPEDRIVE_STAGE_ID) }
          : {}),
        status: 'open',
        visible_to: 3, // Everyone
      }),
    });
    const dealData = await dealRes.json();
    const dealId = dealData?.data?.id;
    if (!dealRes.ok || !dealId) {
      console.error('[pipedrive] create deal error:', dealData?.error);
      return;
    }

    // 3. Add a note to the Deal with the form context / submitted answers.
    const noteLines = [
      `Source: ${source}`,
      role ? `Role: ${role}` : null,
      notes ? `\n${notes}` : null,
    ].filter(Boolean).join('\n');
    if (noteLines) {
      await fetch(`${base}/notes?${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteLines.replace(/\n/g, '<br>'), deal_id: dealId }),
      });
    }
  } catch (err) {
    console.error('[pipedrive] unexpected error:', err);
  }
}
