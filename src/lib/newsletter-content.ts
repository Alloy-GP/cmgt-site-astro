// src/lib/newsletter-content.ts
// Pulls the landing-page facts out of a Mailchimp campaign's HTML so nothing
// has to be hand-edited per issue. Pure functions, no DOM, no dependencies —
// Mailchimp email HTML is table soup, so this works on "leaf" blocks (a td, p,
// h1–h6, li or div with no block-level children) rather than on a parsed tree.
//
// Tuned against CMGT's "Notes For Boards" template, with generic fallbacks:
//   issueLabel — a standalone "Month YYYY" block (the header date)
//   sections   — the template's own "In This Issue" numbered list; else the
//                large-font (>= 20px) / h1–h3 headlines in order
//   headline   — the largest-font block (fallback when there's no subject line)
//   dek        — first real paragraph (80–400 chars, not boilerplate, not the
//                preheader); else the campaign's preview text
//   hero       — first content image declared >= 300px wide; logos, headshots,
//                icons and tracking pixels are skipped. Absent in text-led issues.

export interface ExtractedIssue {
  issueLabel?: string;
  headline?: string;
  dek?: string;
  sections: string[];
  hero?: { src: string; alt: string };
}

interface Leaf {
  pos: number;
  tag: string;
  attrs: string;
  text: string;
  fontSize: number; // px from the element's own style, 0 if none
}

const MONTHS =
  '(January|February|March|April|May|June|July|August|September|October|November|December)';
const MONTH_LABEL_RE = new RegExp(`^${MONTHS}\\s+(20\\d{2})$`, 'i');

const BOILERPLATE_RE =
  /(view (this|the) (email|newsletter|message)|in your browser|unsubscribe|update (your )?preferences|why did i get this|all rights reserved|©|copyright|mailing address|add us to your address book|forward to a friend|sent (to|by)\b)/i;

// Mailchimp merge tags survive in the content endpoint's HTML. Resolve the
// conditionals to their ELSE branch (the "no first name" reading) and drop
// everything else (*|ARCHIVE|*, *|FNAME|*, *|MC:SUBJECT|* …).
function stripMergeTags(s: string): string {
  return s
    .replace(/\*\|IF(?:NOT)?:[^|]*\|\*([\s\S]*?)(?:\*\|ELSE(?:IF)?:[^|]*\|\*([\s\S]*?))?\*\|END:IF\|\*/gi, (_m, _a, b) => b ?? '')
    .replace(/\*\|[^|]{1,60}\|\*/g, '');
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', copy: '©', reg: '®',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** Tags → text. Drops zero-width / preheader-padding characters too. */
export function textOf(fragment: string): string {
  return decodeEntities(
    stripMergeTags(fragment)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[͏​‌‍⁠﻿­]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const norm = (s: string) => textOf(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const LEAF_TAGS = ['td', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'div'];
const BLOCK_RE = /<(table|tr|td|div|p|h[1-6]|ul|ol|li|blockquote|section|article|header|footer)\b/i;

function fontSizeOf(attrs: string): number {
  const m = /font-size\s*:\s*([0-9.]+)\s*px/i.exec(attrs);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Every td, p, h1–h6, li or div whose content has no block-level children, in document
 * order. Opening tags are scanned independently, so a table cell that wraps
 * another table is simply skipped and its inner cells are found on their own.
 */
export function leaves(html: string): Leaf[] {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/^[\s\S]*?<body\b[^>]*>/i, '');

  const out: Leaf[] = [];
  const open = new RegExp(`<(${LEAF_TAGS.join('|')})\\b([^>]*)>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = open.exec(body))) {
    const tag = m[1].toLowerCase();
    const close = body.indexOf(`</${tag}`, m.index + m[0].length);
    if (close < 0) continue;
    const inner = body.slice(m.index + m[0].length, close);
    if (BLOCK_RE.test(inner)) continue;
    const text = textOf(inner);
    if (!text) continue;
    out.push({ pos: m.index, tag, attrs: m[2], text, fontSize: fontSizeOf(m[2]) });
  }
  return out;
}

const isNumber = (t: string) => /^\d{1,2}$/.test(t);
const isHeadline = (l: Leaf) =>
  l.fontSize >= 20 || /^h[1-3]$/.test(l.tag) || /\bclass\s*=\s*["'][^"']*\b(h1|h2|headline|title)\b/i.test(l.attrs);

/** The template's own numbered "In This Issue" list, if it has one. */
function sectionsFromList(ls: Leaf[]): string[] {
  const i = ls.findIndex((l) => /^in this issue\b/i.test(l.text));
  if (i < 0) return [];
  const items: string[] = [];
  let expectNumber = true;
  let next = 1; // numbering must run 1, 2, 3… — the first section's own big "01" marker ends the list
  for (const l of ls.slice(i + 1)) {
    if (expectNumber) {
      if (isNumber(l.text) && parseInt(l.text, 10) === next) { expectNumber = false; continue; }
      break;
    }
    if (isNumber(l.text) || l.text.length > 140) break;
    items.push(l.text.replace(/[.:]$/, ''));
    expectNumber = true;
    next += 1;
    if (items.length >= 8) break;
  }
  return items;
}

/** Fallback: large-font / h1–h3 headlines in reading order. */
function sectionsFromHeadlines(ls: Leaf[], skip: Set<string>): string[] {
  const out: string[] = [];
  for (const l of ls) {
    if (!isHeadline(l)) continue;
    if (isNumber(l.text) || l.text.length > 140) continue;
    const key = norm(l.text);
    if (!key || skip.has(key) || out.some((o) => norm(o) === key)) continue;
    if (MONTH_LABEL_RE.test(l.text) || BOILERPLATE_RE.test(l.text)) continue;
    out.push(l.text.replace(/[.:]$/, ''));
    if (out.length >= 6) break;
  }
  return out;
}

function pickHero(html: string): { src: string; alt: string } | undefined {
  const attr = (tag: string, n: string) => {
    const m =
      new RegExp(`\\b${n}\\s*=\\s*"([^"]*)"`, 'i').exec(tag) ||
      new RegExp(`\\b${n}\\s*=\\s*'([^']*)'`, 'i').exec(tag);
    return m ? m[1] : '';
  };
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = attr(tag, 'src');
    if (!/^https?:\/\//i.test(src)) continue;
    if (/(cdn-images\.mailchimp\.com|\/icons\/|social-block|open\.php|\.gif(\?|$))/i.test(src)) continue;
    const w = parseInt(attr(tag, 'width'), 10);
    const h = parseInt(attr(tag, 'height'), 10);
    const sw = /width\s*:\s*([0-9.]+)px/i.exec(attr(tag, 'style'));
    const width = Number.isFinite(w) ? w : sw ? parseFloat(sw[1]) : NaN;
    if (Number.isFinite(width) && width < 300) continue;      // logo, headshot, icon
    if (Number.isFinite(h) && h < 120) continue;              // banner strips, dividers
    return { src, alt: textOf(attr(tag, 'alt')) };
  }
  return undefined;
}

/** Whole sentences only, up to roughly `max` chars (always at least the first sentence). */
export function clipSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]?\s*|[^.!?]+$/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).trim().length > max) break;
    out += s;
  }
  return out.trim();
}

export function extractIssue(html: string, opts: { previewText?: string; newsletterName?: string } = {}): ExtractedIssue {
  const ls = leaves(html);
  const skip = new Set<string>();
  if (opts.newsletterName) skip.add(norm(opts.newsletterName));

  const label = ls.find((l) => MONTH_LABEL_RE.test(l.text));
  const issueLabel = label
    ? label.text.replace(/\s+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    : undefined;
  if (issueLabel) skip.add(norm(issueLabel));

  const biggest = ls.filter((l) => l.fontSize >= 26 && !isNumber(l.text)).sort((a, b) => b.fontSize - a.fontSize)[0];
  const headline = biggest?.text ?? ls.find((l) => l.tag === 'h1')?.text;

  let sections = sectionsFromList(ls);
  if (sections.length < 2) sections = sectionsFromHeadlines(ls, skip);

  const preview = opts.previewText ? norm(opts.previewText) : '';
  const listEnd = (() => {
    const i = ls.findIndex((l) => /^in this issue\b/i.test(l.text));
    return i < 0 ? 0 : ls[i].pos;
  })();
  const para = ls.find(
    (l) =>
      l.pos > listEnd &&
      !isHeadline(l) &&
      l.text.length >= 80 &&
      l.text.length <= 900 &&
      !BOILERPLATE_RE.test(l.text) &&
      !/^[“"']/.test(l.text) &&
      (!preview || norm(l.text) !== preview)
  );
  const dek = para ? clipSentences(para.text, 320) : opts.previewText ? textOf(opts.previewText) : undefined;

  const hero = pickHero(html);

  return {
    ...(issueLabel ? { issueLabel } : {}),
    ...(headline ? { headline } : {}),
    ...(dek ? { dek } : {}),
    sections,
    ...(hero ? { hero } : {}),
  };
}
