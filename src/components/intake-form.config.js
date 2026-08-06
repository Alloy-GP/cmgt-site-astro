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

import { orderDocsUrl } from '../lib/order-docs';

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
  blurb:   'For HOA & condo boards choosing a new management company.',
  forWho:  'Boards & volunteer leaders — not for residents',
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
  roles: ['Board President', 'Vice President', 'Treasurer', 'Secretary', 'Board Member', 'Property owner / resident', 'Other'],
  // Roles that mean "I'm not a board decision-maker." When step 1's role is one
  // of these, the wizard shows a soft off-ramp to the resident intent (proposals
  // are for boards). Optional + config-gated: sites without this key never show
  // the nudge, so the canonical wizard stays inert unless a site opts in.
  residentRoles: ['Property owner / resident'],
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
    id: 'rental', label: 'Have us manage your rental', icon: 'home', tone: 'ocean',
    hidden: true, // Baton Rouge-only — reachable via /request-a-proposal?intent=rental (rentals page), hidden from the general intent picker
    blurb: 'I want CMGT to manage my rental property.', forWho: 'Rental owners & landlords',
    routeTo: 'our rental management team', fields: [
      { key: 'address', label: 'Property address', type: 'text', required: true, placeholder: 'e.g. 123 Oak St, Baton Rouge', col: 2 },
      { key: 'propertyType', label: 'Property type', type: 'select', required: true, options: ['Single-family home', 'Condo / townhome', 'Duplex', 'Small multi-family (2–4 units)', 'Other'] },
      { key: 'units', label: 'Number of units', type: 'select', required: true, options: ['1', '2–4', '5–10', '10+'] },
      { key: 'occupancy', label: 'Current status', type: 'radio', required: true, options: ['Occupied', 'Vacant', 'Not yet purchased'], col: 2 },
    ],
  },
  {
    id: 'resident', label: 'I’m a resident / homeowner', icon: 'home', tone: 'sage',
    blurb: 'Dues, documents, my account, or a maintenance issue.', forWho: 'Homeowners & residents',
    routeTo: 'the team for your community',
    // Self-service shortcuts shown above the message box — most residents get
    // what they need here without waiting on a reply.
    selfHelp: [
      { label: 'Pay dues', desc: 'Make a payment online', href: 'https://portal.cmgt.org/public', ext: true },
      { label: 'Order documents', desc: 'Resale & closing docs', href: orderDocsUrl(), ext: true },
      { label: 'Log in to the portal', desc: 'Account, requests & documents', href: '/homeowner-hub' },
    ],
    fields: [],
  },
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
    id: 'general', label: 'General question', icon: 'chat', tone: 'gold',
    blurb: 'Something else — just reaching out.', forWho: 'Anyone',
    routeTo: 'our front desk', fields: [],
  },
];
