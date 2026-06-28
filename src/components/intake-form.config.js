// Intake form configuration — all brand/client content lives here.
// Edit this file per project; the IntakeForm component stays generic.
//
// ⚠️  THE PROPOSAL FORM IS CANONICAL ACROSS ALL AGP SITES.
// Its field SET (which fields, their labels, order, types, and the
// floating-label UX) is fixed inside IntakeForm.jsx and must stay identical
// on every site. Per site you customize ONLY:
//   • PROPOSAL_OPTIONS — the dropdown/segmented choices (these vary)
//   • PROPOSAL_COPY    — the proposal intent's brand voice
//   • the --if-* theme vars in src/styles/intake-form.theme.css (brand colors/fonts)
//   • EXTRA_INTENTS    — any non-proposal request types
// Do NOT add/remove/rename proposal fields. See "Syncing the proposal form
// from the starter" in CLAUDE.md.

// Company identity. Used in the submit-error fallback message.
export const BRAND = { name: 'CMGT', phone: '(225) 503-2648' };

// Call-tracking integration (e.g. WhatConverts). Any intent id listed in
// `intents` renders the tracked form id (`formId`); all others use 'intake-form'.
export const TRACKING = { formId: 'lead-form', intents: ['proposal'] };

// ── Proposal options (VARY per site) ─────────────────────────────────────
// The proposal field SET is canonical; only these choice lists change.
export const PROPOSAL_OPTIONS = {
  propertyType: ['Single-family HOA', 'Condominium', 'Townhome', 'Master-planned', 'Developer-controlled', 'Commercial / mixed-use'],
  situation:    ['Self-managed today', 'Unhappy with current manager', 'Contract ending soon', 'Just exploring'],
  timeline:     ['ASAP', '1–3 months', 'Just researching'],
};

// ── Proposal intent copy (brand voice — NOT the field set) ───────────────
export const PROPOSAL_COPY = {
  blurb:   'We’re a board exploring new management.',
  forWho:  'Boards & volunteer leaders',
  routeTo: 'the team for your region',
};

// ── Proposal form VERSION ────────────────────────────────────────────────
// 1 = the classic single-step proposal (canonical field set in IntakeForm.jsx).
// 2 = the guided 3-step proposal wizard (You → Your community → What you need),
//     with partial-lead capture on step 1. The 3-step STRUCTURE is canonical;
//     only the option lists + copy below vary per site. Other request types
//     (vendor/service/general) are unaffected by this flag.
export const PROPOSAL_FORM_VERSION = 2;

// ── Proposal v2 option lists (VARY per site) ─────────────────────────────
// The v2 field SET + step order are canonical (locked in IntakeForm.jsx).
// Only these choice lists + multi-select chips change per site.
export const PROPOSAL_V2 = {
  roles: ['Board President', 'Vice President', 'Treasurer', 'Secretary', 'Board Member', 'Property Owner', 'Other'],
  communityType: ['Single-family', 'Townhomes', 'Condos', 'Mixed — townhomes & single-family', 'Master / mixed-use'],
  managementStatus: ['Self-managed by board', 'Looking to switch from current provider', 'New construction / developer-controlled', 'Other'],
  amenities: ['Community pool', 'Clubhouse', 'Walking trails', 'Pier & boat slips', 'Tot lot', 'Tennis / pickleball', 'Gated entry', 'Marina', 'Beach access', 'Common landscaping'],
  services: ['Full financial management', 'Vendor coordination', 'Compliance & insurance', 'Board meeting support', 'Resident communication', 'Collections / delinquency', 'Reserve planning', 'After-hours emergency', 'Maintenance coordination'],
  painPoints: [
    'Slow communication — missed calls, no follow-through',
    'Delinquency creeping up — collections aren’t working',
    'Manager turnover — constant relationship rebuilding',
    'Financial opacity — we don’t see our own books',
    'Reactive maintenance — problems only addressed after escalation',
    'Switching providers — worried about disruption',
    'Volunteer burden — board is burning out',
    'Compliance pressure — fair housing, fiduciary, state law',
    'Tech is dated — no real portal or app',
    'Homeowner apathy — no one sees the HOA’s value',
    'Vendor management headaches',
    'Need someone who knows Gulf South realities',
    'Developer-controlled community needing professional setup',
  ],
  budget: ['Open — looking for the right fit, not the cheapest', 'Cost-sensitive — need a lean option', 'Tight budget — financial only', 'Premium — full service expected'],
  timeline: ['Immediately', 'Within 60 days', 'Engage by Q3 2026', 'Engage by Q4 2026', 'Just exploring'],
};

// ── Extra intents (FULLY customizable per site) ──────────────────────────
// Everything beyond the canonical proposal. Add / remove / edit freely.
// Field shape: { key, label, type:'text'|'select'|'radio', required,
//   options?, placeholder?, inputMode?, maxLength?, col? }  (col:2 = full width)
export const EXTRA_INTENTS = [
  {
    id: 'vendor', label: 'Submit a bid', icon: 'hardhat', tone: 'ocean',
    blurb: 'I’m a vendor who wants to work with you.', forWho: 'Contractors & service vendors',
    routeTo: 'our procurement team', fields: [
      { key: 'company', label: 'Company name', type: 'text', required: true, placeholder: 'e.g. Bayou Landscaping', col: 2 },
      { key: 'trade', label: 'Trade / service', type: 'select', required: true, options: ['Landscaping', 'Roofing', 'Paving & concrete', 'Pool service', 'Janitorial', 'Plumbing', 'Electrical', 'Other'] },
      { key: 'serviceArea', label: 'Service area', type: 'text', required: true, placeholder: 'e.g. Greater Baton Rouge' },
      { key: 'insured', label: 'Licensed & insured?', type: 'radio', required: true, options: ['Yes', 'In progress'], col: 2 },
    ],
  },
  {
    id: 'service', label: 'Service request', icon: 'wrench', tone: 'sage',
    blurb: 'I’m a homeowner and need something handled.', forWho: 'Homeowners',
    routeTo: 'your community’s manager', fields: [
      { key: 'association', label: 'Community name', type: 'text', required: true, placeholder: 'e.g. Lakeshore', col: 2 },
      { key: 'unit', label: 'Unit / address', type: 'text', required: true, placeholder: 'e.g. 204B' },
      { key: 'category', label: 'What’s the issue?', type: 'select', required: true, options: ['Common area', 'Landscaping', 'Plumbing / water', 'Gate / access', 'Billing / account', 'Other'] },
      { key: 'urgency', label: 'Urgency', type: 'radio', required: true, options: ['Routine', 'Urgent', 'Emergency'], col: 2 },
    ],
  },
  {
    id: 'general', label: 'General question', icon: 'chat', tone: 'gold',
    blurb: 'Something else — just reaching out.', forWho: 'Anyone',
    routeTo: 'our front desk', fields: [],
  },
];
