/**
 * Verifies the Pipedrive partial → full proposal handoff, with no network and
 * no keys:  npm run test:pipedrive   (Node >= 22.6)
 *
 * It stubs global fetch with an in-memory Pipedrive and asserts WHAT ends up
 * in the CRM: one Person, one Deal owned by Savannah in her pipeline, the
 * partial deal gone only after the full deal exists, and never a deleted
 * record that was not an open partial-capture deal.
 */
export {}; // a module, so top-level await works and `openDeals` below is not window.open

process.env.PUBLIC_ENV = 'production';
process.env.PIPEDRIVE_API_TOKEN = 'test-token';
delete process.env.PIPEDRIVE_OWNER_ID;
delete process.env.PIPEDRIVE_PIPELINE_ID;
delete process.env.PIPEDRIVE_STAGE_ID;
delete process.env.PIPEDRIVE_DEAL_FIELD_HOMES;
delete process.env.PIPEDRIVE_DEAL_FIELD_ADDRESS;

const { addToPipedrive, PARTIAL_DEAL_PREFIX } = await import('../src/lib/pipedrive.ts');

const SAVANNAH = 26876223;
const PIPELINE = 12;

type Email = { value: string; primary: boolean };
type Person = { id: number; name: string; email: Email[]; phone: Email[]; org_id?: number; owner_id?: number };
type Deal = { id: number; title: string; person_id: number; status: string; [k: string]: unknown };
const pd = {
  persons: [] as Person[], orgs: [] as { id: number; name: string }[], deals: [] as Deal[], notes: [] as any[],
  nextId: 100, indexFresh: true, failDealCreate: false, failDelete: false, calls: [] as string[],
};
function reset() {
  Object.assign(pd, { persons: [], orgs: [], deals: [], notes: [], nextId: 100, indexFresh: true, failDealCreate: false, failDelete: false, calls: [] });
}

(globalThis as any).fetch = async (input: string, init?: { method?: string; body?: string }) => {
  const url = new URL(String(input));
  const method = (init?.method || 'GET').toUpperCase();
  const path = url.pathname.replace(/^\/v1/, '');
  pd.calls.push(`${method} ${path}`);
  const body = init?.body ? JSON.parse(init.body) : {};
  const reply = (data: unknown, status = 200) =>
    ({ ok: status < 300, status, json: async () => ({ success: status < 300, data, error: status < 300 ? undefined : 'nope' }) });
  let m: RegExpMatchArray | null;

  if (method === 'GET' && path === '/dealFields')
    return reply([{ key: 'homes_key', name: 'Number of Homes', field_type: 'double' }, { key: 'addr_key', name: 'Community Address', field_type: 'address' }]);
  if (method === 'GET' && path === '/organizationFields') return reply([]);
  if (method === 'GET' && path === '/organizations/search') {
    const o = pd.orgs.find((o) => o.name === url.searchParams.get('term'));
    return reply({ items: o ? [{ item: { id: o.id } }] : [] });
  }
  if (method === 'POST' && path === '/organizations') { const o = { id: pd.nextId++, ...body }; pd.orgs.push(o); return reply(o); }
  if (method === 'GET' && path === '/persons/search') {
    const term = (url.searchParams.get('term') || '').toLowerCase();
    const p = pd.indexFresh ? pd.persons.find((p) => p.email.some((e) => e.value.toLowerCase() === term)) : undefined;
    return reply({ items: p ? [{ item: { id: p.id, emails: p.email.map((e) => e.value), phones: p.phone.map((e) => e.value), organization: p.org_id ? { id: p.org_id } : null } }] : [] });
  }
  if ((m = path.match(/^\/persons\/(\d+)\/deals$/))) return reply(pd.deals.filter((d) => d.person_id === +m![1] && d.status === 'open'));
  if ((m = path.match(/^\/persons\/(\d+)$/)) && method === 'GET') {
    const p = pd.persons.find((p) => p.id === +m![1]);
    return p ? reply({ ...p, org_id: p.org_id ? { value: p.org_id } : null }) : reply(null, 404);
  }
  if ((m = path.match(/^\/persons\/(\d+)$/)) && method === 'PUT') {
    const p = pd.persons.find((p) => p.id === +m![1]); if (!p) return reply(null, 404);
    Object.assign(p, body); return reply(p);
  }
  if (method === 'POST' && path === '/persons') { const p = { id: pd.nextId++, phone: [], ...body }; pd.persons.push(p); return reply(p); }
  if ((m = path.match(/^\/deals\/(\d+)$/)) && method === 'GET') { const d = pd.deals.find((d) => d.id === +m![1]); return d ? reply(d) : reply(null, 404); }
  if ((m = path.match(/^\/deals\/(\d+)$/)) && method === 'DELETE') {
    if (pd.failDelete) return reply(null, 500);
    const d = pd.deals.find((d) => d.id === +m![1]); if (!d) return reply(null, 404);
    d.status = 'deleted'; return reply({ id: d.id });
  }
  if (method === 'POST' && path === '/deals') {
    if (pd.failDealCreate) return reply(null, 400);
    const d = { id: pd.nextId++, ...body }; pd.deals.push(d); return reply(d);
  }
  if (method === 'POST' && path === '/notes') { pd.notes.push(body); return reply({ id: pd.nextId++ }); }
  throw new Error(`unhandled ${method} ${path}`);
};

let failures = 0;
function check(label: string, cond: boolean, extra = '') {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${cond || !extra ? '' : `  (${extra})`}`);
  if (!cond) failures++;
}
const openDeals = () => pd.deals.filter((d) => d.status === 'open');
const partials = () => pd.deals.filter((d) => d.title.startsWith(PARTIAL_DEAL_PREFIX));
const idx = (call: string) => pd.calls.findIndex((c) => c === call);
const PARTIAL = { email: 'jane@oakhoa.org', name: 'Jane Doe', phone: '555-0100', role: 'Board President', source: 'Proposal Request (started, not submitted) · R1', stage: 'partial' as const };
const FULL = {
  email: 'jane@oakhoa.org', name: 'Jane Doe', phone: '555-0100', role: 'Board President', org: 'Oak HOA',
  address: 'Baton Rouge, LA', notes: 'Number of units: 120', source: 'Proposal Request · R1', stage: 'complete' as const,
  fields: [{ label: 'Number of units', value: '120 units' }, { label: 'Location', value: 'Baton Rouge, LA' }],
};

// 0. Not production → nothing touches Pipedrive.
reset(); process.env.PUBLIC_ENV = 'staging';
let out = await addToPipedrive(PARTIAL);
check('non-production → skipped, no API calls', out.status === 'skipped' && pd.calls.length === 0);
process.env.PUBLIC_ENV = 'production';

// 1. Partial capture → Person + "Started, not submitted" deal, Savannah's, in her pipeline.
reset();
out = await addToPipedrive(PARTIAL);
const partialDeal = pd.deals[0];
check('partial → status created', out.status === 'created', out.detail);
check('partial → one Person, owned by Savannah', pd.persons.length === 1 && pd.persons[0].owner_id === SAVANNAH);
check('partial → one deal with the partial title', pd.deals.length === 1 && partialDeal.title === `${PARTIAL_DEAL_PREFIX} Jane Doe`);
check('partial → deal owned by Savannah, in pipeline 12', partialDeal.user_id === SAVANNAH && partialDeal.pipeline_id === PIPELINE);
check('partial → note with source + role', pd.notes.length === 1 && /Board President/.test(pd.notes[0].content));
check('partial → returns personId + dealId for the form', out.personId === pd.persons[0].id && out.dealId === partialDeal.id);
const hint = { personId: out.personId!, dealId: out.dealId! };

// 2. Same visitor restarts step 1 → no second partial; the existing ids come back.
pd.calls = [];
out = await addToPipedrive(PARTIAL);
check('repeat partial → skipped, no new deal', out.status === 'skipped' && pd.deals.length === 1);
check('repeat partial → still hands back the open partial ids', out.personId === hint.personId && out.dealId === hint.dealId);

// 3. Full submission, search index fresh → one Person, one real deal, partial gone AFTER it.
pd.calls = [];
out = await addToPipedrive({ ...FULL, partial: hint });
const fullDeal = pd.deals.find((d) => d.title === 'Oak HOA');
check('full → status created', out.status === 'created', out.detail);
check('full → still one Person (no duplicate)', pd.persons.length === 1);
check('full → Person now linked to the Organization', pd.persons[0].org_id === pd.orgs[0]?.id);
check('full → real deal: org title, org linked, Savannah, pipeline 12', !!fullDeal && fullDeal.org_id === pd.orgs[0].id && fullDeal.user_id === SAVANNAH && fullDeal.pipeline_id === PIPELINE);
check('full → "Number of units" lands in Number of Homes as 120', fullDeal?.homes_key === 120);
check('full → "Location" lands in Community Address', fullDeal?.addr_key === 'Baton Rouge, LA');
check('full → partial deal deleted', partialDeal.status === 'deleted');
check('full → exactly one open deal remains', openDeals().length === 1 && openDeals()[0].id === fullDeal?.id);
check('full → partial deleted only AFTER the full deal was created', idx('POST /deals') !== -1 && idx('POST /deals') < idx(`DELETE /deals/${partialDeal.id}`));
check('full → detail names the replaced partial', out.detail.includes(`replaced partial ${partialDeal.id}`), out.detail);
check('full → no warning', !out.warning);

// 4. Full submission while the search index has NOT caught up → the echoed ids save it.
reset();
out = await addToPipedrive(PARTIAL); const h4 = { personId: out.personId!, dealId: out.dealId! };
pd.indexFresh = false; pd.calls = [];
out = await addToPipedrive({ ...FULL, partial: h4 });
check('stale index + ids → no second Person created', pd.persons.length === 1 && !pd.calls.includes('POST /persons'));
check('stale index + ids → partial deleted, one open deal', partials()[0].status === 'deleted' && openDeals().length === 1 && openDeals()[0].title === 'Oak HOA');

// 5. Visitor corrected a typo in their email on the last step.
reset();
out = await addToPipedrive({ ...PARTIAL, email: 'jane@oakhoa.og' }); const h5 = { personId: out.personId!, dealId: out.dealId! };
pd.calls = [];
out = await addToPipedrive({ ...FULL, partial: h5 });
check('corrected email → same Person reused (no duplicate)', pd.persons.length === 1 && !pd.calls.includes('POST /persons'));
check('corrected email → new address is primary, typo kept', pd.persons[0].email[0].value === 'jane@oakhoa.org' && pd.persons[0].email[0].primary && pd.persons[0].email.some((e) => e.value === 'jane@oakhoa.og'));
check('corrected email → partial deleted, one open deal', partials()[0].status === 'deleted' && openDeals().length === 1);

// 6. New email matches an OLDER record; the partial sits on the person the capture made.
reset();
pd.persons.push({ id: 1, name: 'Jane Doe', email: [{ value: 'jane@oakhoa.org', primary: true }], phone: [], owner_id: SAVANNAH });
out = await addToPipedrive({ ...PARTIAL, email: 'jane@oakhoa.og' }); const h6 = { personId: out.personId!, dealId: out.dealId! };
pd.calls = [];
out = await addToPipedrive({ ...FULL, partial: h6 });
check('older record wins search → deal goes on it', openDeals().length === 1 && openDeals()[0].person_id === 1);
check('older record wins search → the orphaned partial is still deleted', partials()[0].status === 'deleted');

// 7. Bogus ids from the browser: a real deal must never be deleted, a stranger never adopted.
reset();
pd.persons.push({ id: 7, name: 'Someone Else', email: [{ value: 'other@x.org', primary: true }], phone: [], owner_id: SAVANNAH });
pd.deals.push({ id: 8, title: 'Real Deal', person_id: 7, status: 'open' });
pd.calls = [];
out = await addToPipedrive({ ...FULL, partial: { personId: 7, dealId: 8 } });
check('bogus ids → a non-partial deal is NOT deleted', pd.deals.find((d) => d.id === 8)!.status === 'open');
check('bogus ids → a stranger is NOT adopted; the lead gets its own Person', pd.persons.length === 2 && openDeals().find((d) => d.title === 'Oak HOA')?.person_id !== 7);
check('bogus ids → clean outcome', out.status === 'created' && !out.warning, out.detail);

// 8. Full deal cannot be created → the partial stays (it is the only CRM record).
reset();
out = await addToPipedrive(PARTIAL); const h8 = { personId: out.personId!, dealId: out.dealId! };
pd.failDealCreate = true; pd.calls = [];
out = await addToPipedrive({ ...FULL, partial: h8 });
check('deal create fails → status failed', out.status === 'failed', out.detail);
check('deal create fails → partial NOT deleted', partials()[0].status === 'open' && !pd.calls.some((c) => c.startsWith('DELETE')));

// 9. Partial cannot be deleted → the full deal exists and the post warns.
reset();
out = await addToPipedrive(PARTIAL); const h9 = { personId: out.personId!, dealId: out.dealId! };
pd.failDelete = true;
out = await addToPipedrive({ ...FULL, partial: h9 });
check('delete fails → full deal still created', out.status === 'created' && openDeals().some((d) => d.title === 'Oak HOA'));
check('delete fails → warning names the stuck partial', !!out.warning && out.warning.includes(String(h9.dealId)), out.warning);

// 10. Full submission with no partial at all (direct submit) → one Person, one deal, nothing deleted.
reset(); pd.calls = [];
out = await addToPipedrive(FULL);
check('no partial → one Person, one deal, no DELETE', pd.persons.length === 1 && pd.deals.length === 1 && !pd.calls.some((c) => c.startsWith('DELETE')));
check('no partial → detail is just the deal', out.status === 'created' && /^deal \d+$/.test(out.detail), out.detail);

// 11. A resident partial is the caller's decision (lead.ts skips it); a resident FULL is still a deal.
reset();
out = await addToPipedrive({ ...FULL, role: 'Property owner / resident' });
check('resident full submission → still creates the deal', out.status === 'created' && pd.deals.length === 1);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
