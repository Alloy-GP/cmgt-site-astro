// src/data/guides.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the /resources guide library.
//
// Every card, pill label, pill count and disabled state on /resources derives
// from this file. Adding a guide is a one-object edit — never hardcode a count
// in the template.
//
// Content here is the live site's own: slugs are the canonical nested routes
// (the flat /hoa-reserve-study style paths 301 and must not be linked), card
// titles come from the hub's existing cards, deks are condensed from each
// page's own meta description, and thumb/alt come from each page's own hero.
//
// Card titles are deliberately shorter than the target page's <h1>. That is not
// drift — don't sync them.
// ─────────────────────────────────────────────────────────────────────────────

export type TopicId = 'finances' | 'governance' | 'covenants'
                   | 'insurance' | 'vendors' | 'manager';

/** The six topic areas, in the order the retired "Browse by topic" grid used. */
export const TOPICS: { id: TopicId; label: string }[] = [
  { id: 'finances',   label: 'Finances & Reserves' },
  { id: 'governance', label: 'Governance & Meetings' },
  { id: 'covenants',  label: 'Covenants & Enforcement' },
  { id: 'insurance',  label: 'Insurance & Risk' },
  { id: 'vendors',    label: 'Vendors & Maintenance' },
  { id: 'manager',    label: 'Choosing a Manager' },
];

export interface Guide {
  slug: string;        // canonical route — must resolve 200, never via a 301
  topic: TopicId;
  title: string;       // card title (shorter than the page's own h1, on purpose)
  dek: string;         // one line, ~85-110 chars
  thumb: string;       // /photos/resources/*.webp — 16:10
  alt: string;
  /**
   * Present on exactly one guide: the hero panel above the grid. That guide is
   * deliberately shown twice — featured panel and first card — which is standard
   * for a library index and keeps its topic filter honest.
   *
   * It lives here so the two can't drift: move this block to another guide and
   * the panel follows. The panel gets its own longer dek and a full-bleed photo
   * rather than the 16:10 thumb, so those are carried here too.
   */
  featured?: { dek: string; image: string; alt: string };
}

// Newest first, by each page's own visible "Updated" line. Hurricane prep is
// seasonal — move that object up during storm season rather than editing copy.
export const GUIDES: Guide[] = [
  {
    slug: '/resources/hoa-financial-statements',
    topic: 'finances',
    title: 'HOA financial statements explained in plain English',
    dek: 'The four core reports — balance sheet, income statement, cash flow, and budget comparison.',
    thumb: '/photos/resources/hoa-financial-statements.webp',
    alt: 'A homeowner reviewing HOA financial statements on a laptop at her kitchen table',
    featured: {
      dek: 'The four core HOA financial statements every board and homeowner should know — what each shows, what to question, and how to get copies.',
      image: '/photos/hoa-financial-statements.webp',
      alt: 'A homeowner reviewing HOA financial statements on a laptop at her kitchen table',
    },
  },
  {
    slug: '/resources/hoa-special-assessments',
    topic: 'finances',
    title: 'Special assessments, and how boards avoid them',
    dek: "What a special assessment is, when a board can levy one, and the planning that keeps them rare.",
    thumb: '/photos/resources/special-assessments.webp',
    alt: 'Roof replacement underway on an HOA clubhouse',
  },
  {
    slug: '/resources/hoa-rules-enforcement',
    topic: 'covenants',
    title: "HOA rules enforcement & violations: what's fair for both sides",
    dek: 'How violations really work — the notice and hearing process, and your right to dispute a fine.',
    thumb: '/photos/resources/rules-enforcement.webp',
    // Not the alt from the guide page itself — that one describes a manager and a
    // homeowner talking on a porch, and the photo is an overgrown lawn. The page's
    // own alt is wrong and wants fixing separately.
    alt: 'An overgrown front lawn on an otherwise tidy residential street',
  },
  {
    slug: '/resources/hoa-budget-template',
    topic: 'finances',
    title: "HOA budget templates & best practices: a board's guide",
    dek: 'The structure, the line items, and sample budgets by community size to model against.',
    thumb: '/photos/resources/budget-template.webp',
    alt: 'Three HOA board members reviewing a budget spreadsheet on a laptop at a kitchen table',
  },
  {
    slug: '/resources/hoa-reserve-study',
    topic: 'finances',
    title: 'HOA reserve studies: the complete board guide',
    dek: 'What a reserve study is, what it costs, and how to turn the findings into a funding plan.',
    thumb: '/photos/resources/reserve-study.webp',
    alt: 'A well-maintained HOA common area kept in good repair by a funded reserve plan',
  },
  {
    slug: '/resources/hurricane-preparedness-for-hoas',
    topic: 'insurance',
    title: 'Hurricane preparedness for Gulf South HOAs',
    dek: "Pre-season prep, storm communication, and insurance — from a manager who's lived it.",
    thumb: '/photos/resources/hurricane-prep.webp',
    alt: 'A Gulf South community standing intact under a storm-darkened sky',
  },
];

export const countFor = (id: TopicId) => GUIDES.filter((g) => g.topic === id).length;

/**
 * Active topics first, empty ones last. Empty topics are never removed — they
 * render disabled with "soon" where the count goes, which is what signals a
 * library still being written.
 */
export const PILLS = [...TOPICS]
  .map((t) => ({ ...t, n: countFor(t.id) }))
  .sort((a, b) => (a.n === 0 ? 1 : 0) - (b.n === 0 ? 1 : 0));
