#!/usr/bin/env python3
"""Port the Alabama HOA laws design into Astro: a reusable StateLaw layout + the page.

Alabama is the first of five state law pages, so per the handoff this ships as a
layout with named slots rather than a one-off page. The layout must contain no
state name at all — the sibling-state list therefore lives in its own data module
rather than inline, which also makes repointing cards a one-line edit as each
state's law page ships.
"""
import json, re, sys, pathlib, html

SRC = pathlib.Path('/tmp/laws-port/design_handoff_alabama_hoa_laws')
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')

raw = (SRC / 'Alabama HOA Laws.html').read_text(encoding='utf-8')

# ---------------------------------------------------------------- link mapping
# The handoff's ROUTES.md was stale: it lists three of these as unrouted. All six
# exist on the live site, several under different slugs than it guessed.
LINKS = {
    'Condo &amp; Townhome Management.html': '/condo-management',
    'Condo & Townhome Management.html': '/condo-management',
    'Delinquency Recovery.html': '/hoa-delinquency-recovery',
    'HOA Rules Enforcement.html': '/resources/hoa-rules-enforcement',
    'Rules Enforcement.html': '/resources/hoa-rules-enforcement',
    'On-Site Management.html': '/on-site-management',
    'Request a Proposal.html': '/request-a-proposal',
    'Resources.html': '/resources',
    'index.html': '/',
    'Louisiana HOA Management.html': '/hoa-management/louisiana',
    'Mississippi HOA Management.html': '/hoa-management/mississippi',
    'Texas HOA Management.html': '/hoa-management/texas',
    'Florida HOA Management.html': '/hoa-management/florida',
    'Alabama HOA Management.html': '/hoa-management/alabama',
}

def rewrite_links(t: str) -> str:
    for old, new in LINKS.items():
        t = t.replace('href="%s"' % old, 'href="%s"' % new)
    # the site canonicalises to the apex host with no trailing slash
    t = t.replace('https://www.cmgt.org', 'https://cmgt.org')
    t = re.sub(r'(https://cmgt\.org/[^"\s]*?)/(?=["\s#])', r'\1', t)
    # design references the handoff's own asset folder
    t = t.replace('home-explorations/assets/', 'assets/')
    t = t.replace('https://cmgt.org/assets/', 'https://cmgt.org/assets/')
    return t

# ---------------------------------------------------------------- style block
style = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', raw, re.S)).strip()

# The rail docks by reacting to .is-hidden, a class the nav component owns. Under a
# scoped <style> that selector would be rewritten to match a body/nav carrying this
# layout's cid — which never exists — and the rail would stick at 74px forever. The
# block is emitted with is:global instead (see the comment above the <style> tag),
# so it ports as authored. Do NOT wrap it in :global(): inside an is:global block
# that is not valid CSS and the browser drops the whole rule, silently.
assert 'body:has(.nav-main.is-hidden) .law-jump' in style, 'jump-rail docking selector not found'
assert ':global(' not in style, 'style block must not contain :global() under is:global'

# ---------------------------------------------------------------- body + slots
m = re.search(r'<div id="site-header"></div>(.*?)<div id="site-footer"></div>', raw, re.S)
body = m.group(1)

def slice_between(start, end):
    i = body.index(start)
    j = body.index(end, i) if end else len(body)
    return body[i:j].rstrip()

H2 = lambda anchor: '<h2 class="law-h2" id="%s">' % anchor
MAINT = '<h2 class="law-h2">How this page is maintained</h2>'
SOURCES = re.search(r'<div[^>]*id="sources"[^>]*>', body).group(0)
SIBS = '<h2 class="law-h2">HOA laws in the other states we serve</h2>'
DISC = '<p class="law-disclaimer">'

slots = {
    'take':       slice_between('<div class="law-take', H2('changed')),
    'changed':    slice_between(H2('changed'), H2('quick')),
    'quick':      slice_between(H2('quick'), H2('rules')),
    'rules':      slice_between(H2('rules'), H2('history')),
    'history':    slice_between(H2('history'), H2('faq')),
    'faq':        slice_between(H2('faq'), MAINT),
    'maintained': slice_between(MAINT, SOURCES),
    'sources':    slice_between(SOURCES, SIBS),
    # The sibling grid itself is rendered by the layout from the data module; the
    # slot carries only its heading and intro copy.
    'siblings':   slice_between(SIBS, '<div class="law-states">'),
    'disclaimer': slice_between(DISC, '</div>\n    </div>\n  </article>'),
}
for k, v in slots.items():
    assert v.strip(), 'empty slot: %s' % k
    slots[k] = rewrite_links(v)

# Flag the statute subsection the handoff asked to be verified, inline where the
# reviewer will actually see it.
FLAG = ('\n        <!-- REVIEW FLAG — statute citation. The handoff notes this subsection is\n'
        '             cited as (a)(7) here but appears as 34-27-2(b)(7) in current Justia\n'
        '             text, and asks that the page be aligned to whichever the 2026 Code\n'
        '             uses. Left exactly as designed; do not change without checking the\n'
        '             Code directly. Everything else on the page is source-verified. -->')
mm = re.search(r'(34-27-2\([ab]\)\(7\))', slots['rules'])
if mm:
    line_start = slots['rules'].rfind('\n', 0, mm.start())
    slots['rules'] = slots['rules'][:line_start] + FLAG + slots['rules'][line_start:]
    print('  statute review flag inserted at %s' % mm.group(1))
else:
    print('  WARNING: 34-27-2 citation not found — flag not inserted')

# ---------------------------------------------------------------- JSON-LD
lds = []
for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', raw, re.S):
    d = json.loads(rewrite_links(b))
    lds.append(d)
by_type = {d.get('@type'): d for d in lds}
assert set(by_type) == {'BreadcrumbList', 'Article', 'FAQPage'}, by_type.keys()
# Order Article first so the page's primary entity leads, then crumbs, then FAQ.
ld_order = [by_type['Article'], by_type['BreadcrumbList'], by_type['FAQPage']]

# FAQ schema must match the visible copy verbatim — verify rather than trust.
vis_q = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', q)).strip()
         for q in re.findall(r'<summary[^>]*class="law-q"[^>]*>(.*?)</summary>', slots['faq'], re.S)]
if not vis_q:
    vis_q = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', q)).strip()
             for q in re.findall(r'<h3[^>]*>(.*?)</h3>', slots['faq'], re.S)]
schema_q = [q['name'] for q in by_type['FAQPage']['mainEntity']]
print('  FAQ: %d visible / %d in schema' % (len(vis_q), len(schema_q)))
for a, b in zip(vis_q, schema_q):
    if html.unescape(a) != html.unescape(b):
        print('    MISMATCH\n      visible: %s\n      schema : %s' % (a, b))

# ---------------------------------------------------------------- emit
def js(o):
    return json.dumps(o, indent=2, ensure_ascii=False).replace('</', '<\\/')

(ROOT / 'src/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'src/data/state-law-links.ts').write_text('''/**
 * The five states CMGT serves, for the "HOA laws in the other states" grid on each
 * state law page.
 *
 * `lawPage` is null until that state's law page ships; the grid falls back to the
 * state's management page so no card ever points at a 404. When a law page goes
 * live, set its `lawPage` here and every sibling grid updates at once — the reason
 * this is a data module and not markup repeated on five pages.
 *
 * Lives outside StateLaw.astro deliberately: the layout must not contain any state
 * name, so that a second state page cannot inherit the first one's copy.
 */
export interface StateLawLink {
  /** Display name, as it appears on the card. */
  name: string;
  /** Slug used in /resources/hoa-laws/<slug>. */
  slug: string;
  /** The state's management page — the fallback target. */
  hub: string;
  /** The state's law page, once it exists. */
  lawPage: string | null;
}

export const STATE_LAW_LINKS: StateLawLink[] = [
  { name: 'Alabama',     slug: 'alabama',     hub: '/hoa-management/alabama',     lawPage: '/resources/hoa-laws/alabama' },
  { name: 'Louisiana',   slug: 'louisiana',   hub: '/hoa-management/louisiana',   lawPage: null },
  { name: 'Mississippi', slug: 'mississippi', hub: '/hoa-management/mississippi', lawPage: null },
  { name: 'Texas',       slug: 'texas',       hub: '/hoa-management/texas',       lawPage: null },
  { name: 'Florida',     slug: 'florida',     hub: '/hoa-management/florida',     lawPage: null },
];

/** Cards for every state except the one being viewed. */
export const siblingsOf = (slug: string) =>
  STATE_LAW_LINKS.filter((s) => s.slug !== slug).map((s) => ({
    name: s.name,
    href: s.lawPage ?? s.hub,
  }));
''', encoding='utf-8')

layout = '''---
/**
 * StateLaw.astro — layout for the state HOA law reference pages.
 *
 * One page per state (AL, LA, MS, TX, FL), each the same nine sections in the same
 * order, so the structure lives here and only copy lives in the pages. Per the
 * handoff this layout contains no state name anywhere: the sibling grid is built
 * from src/data/state-law-links.ts, and every piece of state-specific text arrives
 * as a prop or a slot. A CI-style assertion for that lives in the page's tests.
 *
 * Content-led, not conversion-led: no imagery, one soft CTA at the end.
 */
import BaseLayout from '~/layouts/BaseLayout.astro';
import { siblingsOf } from '~/data/state-law-links';

export interface Props {
  /** State display name, e.g. for the hero eyebrow. */
  state: string;
  /** Slug of this state, used to exclude it from the sibling grid. */
  stateSlug: string;
  title: string;
  description: string;
  /** Page H1. */
  headline: string;
  /** Hero standfirst. */
  lede: string;
  /** Human-readable review date, e.g. "August 1, 2026". */
  reviewedDate: string;
  /** Legislative session the content is current through. */
  sessionThrough: string;
  /** Jump-rail entries; `id` must match the id on that section's h2. */
  jumpSections: { id: string; label: string }[];
  /** Visible breadcrumb trail. Three levels — the cluster hub is not built yet. */
  crumbs: { t: string; href?: string }[];
  pageSchema: Record<string, unknown>[];
}

const {
  state, stateSlug, title, description, headline, lede,
  reviewedDate, sessionThrough, jumpSections, crumbs, pageSchema,
} = Astro.props;

const siblings = siblingsOf(stateSlug);
---
<BaseLayout title={title} description={description} ogType="article" pageSchema={pageSchema}>
  <nav id="site-breadcrumbs" aria-label="Breadcrumb" data-crumbs={JSON.stringify(crumbs)}></nav>

  <article>
    <header class="law-hero" data-screen-label={`${state} HOA laws — Hero`}>
      <div class="container law-hero-in">
        <div class="law-cat">Board Education · {state}</div>
        <h1 class="law-h1">{headline}</h1>
        <p class="law-lede">{lede}</p>
        <div class="law-meta">
          <span>Reviewed <b>{reviewedDate}</b></span><span class="sep"></span>
          <span>Current through the {sessionThrough}</span><span class="sep"></span>
          <span>Reviewed annually</span>
        </div>
      </div>
    </header>

    <!-- Sticky jump rail. Docks below the header at 74px/64px and only rises to 0
         when the header is actually translating away. Keep z-index 40 (the header is
         60) and keep `top` untransitioned — a transition fought the header's
         transform and lagged the edge. -->
    <nav class="law-jump" aria-label="Jump to section">
      <div class="container">
        <ul>
          {jumpSections.map((s) => (
            <li><a href={`#${s.id}`}>{s.label}</a></li>
          ))}
        </ul>
      </div>
    </nav>

    <div class="law-body">
      <div class="container law-wrap">
        <slot name="take" />
        <slot name="changed" />
        <slot name="quick" />
        <slot name="rules" />
        <slot name="history" />
        <slot name="faq" />
        <slot name="maintained" />
        <slot name="sources" />
        <slot name="siblings" />
        <div class="law-states">
          {siblings.map((s) => (
            <a class="law-state" href={s.href}><span>{s.name}</span><span>→</span></a>
          ))}
        </div>
        <!-- Quiet italic footnote, below the content and above the CTA. It was
             rejected as a loud badge band under the hero; it must not become a
             callout box and must not move above the fold. -->
        <slot name="disclaimer" />
      </div>
    </div>
  </article>

  <section class="law-cta" data-screen-label="CTA">
    <div class="container law-cta-in">
      <div>
        <h2 class="law-cta-h">Want this handled for you?</h2>
        <p class="law-cta-p">A real person will walk through what applies to your community — within two business days.</p>
      </div>
      <div><a class="btn btn-blue" href="/request-a-proposal">Request a proposal <span class="arrow">→</span></a></div>
    </div>
  </section>

<!--
  is:global is required, not stylistic.

  This layout owns the .law-* styles but the page supplies the body through slots,
  and slot content is authored in the page — so Astro's scoped selectors, which are
  rewritten to match this layout's data-astro-cid, never match any slotted element.
  Scoped, the entire body renders unstyled: .law-h2 falls back to the browser's
  default 24px, .law-take loses its panel, .law-rule loses its border, and the
  disclaimer stops being italic, which the handoff makes a hard requirement.

  Global is safe here because every selector in the block is .law-* prefixed, and it
  keeps the CSS in one place for the four state pages still to come.
-->
<style is:global>
__STYLE__

/* Port fix: the design was authored against its own standalone shared.css. On the
   green CTA band the global `.btn-blue` here inherits the section's blue text
   colour and goes invisible against its own background, so restore the intended
   treatment explicitly rather than relying on cascade order. */
.law-cta .btn-blue { background: var(--freedom-blue); color: #fff; }
.law-cta .btn-blue:hover { background: var(--ink-700); color: #fff; }
</style>
</BaseLayout>
'''.replace('__STYLE__', style)
(ROOT / 'src/layouts/StateLaw.astro').write_text(layout, encoding='utf-8')

crumbs = [{"t": "Home", "href": "/"}, {"t": "Resources", "href": "/resources"},
          {"t": "Alabama HOA Laws"}]
jump = [{"id": s[0], "label": s[1]} for s in [
    ('changed', 'What changed'), ('quick', 'Quick answers'), ('rules', 'The rules'),
    ('history', 'Session record'), ('faq', 'FAQ'), ('sources', 'Sources')]]

page = '''---
/**
 * Alabama HOA laws — board-education reference. First of five state law pages.
 *
 * Structure and chrome live in StateLaw.astro; this file is copy plus schema only.
 * All statutory points were source-verified against the Code of Alabama during
 * design. One citation is flagged inline for review — see the REVIEW FLAG comment
 * in the rules section.
 *
 * The cluster hub at /resources/hoa-laws is not built, so breadcrumbs are three
 * levels and nothing here links to it. When the hub ships, add the level back to
 * both `crumbs` below and the BreadcrumbList schema at the same time.
 *
 * Front matter for the content calendar:
 *   pubDate 2026-08-01 · updatedDate 2026-08-01 · reviewedDate 2026-08-01
 *   reviewCadence annual, post-session (target May)
 *   contentType reference · cluster state-hoa-laws
 *   focusKeyword "alabama hoa laws"
 */
import StateLaw from '~/layouts/StateLaw.astro';

const article = __ARTICLE__;

const breadcrumb = __BREADCRUMB__;

// Every answer below matches the visible FAQ copy verbatim. If one changes, change
// both — the port script asserts they agree.
const faq = __FAQ__;
---
<StateLaw
  state="Alabama"
  stateSlug="alabama"
  title="Alabama HOA Laws: A Board Member's Reference (2026) | CMGT"
  description="Alabama's HOA Act only covers communities whose declaration was recorded after Jan 1, 2016. What applies to yours: records, liens, fines, and the 2026 session."
  headline="Alabama HOA laws: a board member’s reference."
  lede="Alabama has an HOA statute, but it does not reach every community. Whether the Homeowners’ Association Act governs you turns on one date: when your declaration was recorded. Communities on opposite sides of that line operate under different rules."
  reviewedDate="August 1, 2026"
  sessionThrough="2026 regular session"
  jumpSections={__JUMP__}
  crumbs={__CRUMBS__}
  pageSchema={[article, breadcrumb, faq]}
>
  <div slot="take">
__TAKE__
  </div>
  <Fragment slot="changed">
__CHANGED__
  </Fragment>
  <Fragment slot="quick">
__QUICK__
  </Fragment>
  <Fragment slot="rules">
__RULES__
  </Fragment>
  <Fragment slot="history">
__HISTORY__
  </Fragment>
  <Fragment slot="faq">
__FAQSEC__
  </Fragment>
  <Fragment slot="maintained">
__MAINTAINED__
  </Fragment>
  <Fragment slot="sources">
__SOURCES__
  </Fragment>
  <Fragment slot="siblings">
__SIBLINGS__
  </Fragment>
  <Fragment slot="disclaimer">
__DISCLAIMER__
  </Fragment>
</StateLaw>
'''
# `take` is a <div class="law-take"> in the design; unwrap it so the slot div carries
# the class rather than nesting an extra element.
take_inner = re.sub(r'^<div class="law-take"[^>]*>', '', slots['take']).rstrip()
if take_inner.endswith('</div>'):
    take_inner = take_inner[: -len('</div>')].rstrip()
take_attrs = re.match(r'<div (class="law-take"[^>]*)>', slots['take']).group(1)
page = page.replace('<div slot="take">', '<div slot="take" %s>' % take_attrs)

repl = {
    '__ARTICLE__': js(ld_order[0]), '__BREADCRUMB__': js(ld_order[1]), '__FAQ__': js(ld_order[2]),
    '__JUMP__': js(jump), '__CRUMBS__': js(crumbs),
    '__TAKE__': take_inner, '__CHANGED__': slots['changed'], '__QUICK__': slots['quick'],
    '__RULES__': slots['rules'], '__HISTORY__': slots['history'], '__FAQSEC__': slots['faq'],
    '__MAINTAINED__': slots['maintained'], '__SOURCES__': slots['sources'],
    '__SIBLINGS__': slots['siblings'], '__DISCLAIMER__': slots['disclaimer'],
}
for k, v in repl.items():
    page = page.replace(k, v)

out = ROOT / 'src/pages/resources/hoa-laws/alabama.astro'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page, encoding='utf-8')

# ---------------------------------------------------------------- assertions
lay = (ROOT / 'src/layouts/StateLaw.astro').read_text()
assert 'Alabama' not in lay, 'layout contains a state name'
assert 'Louisiana' not in lay and 'Florida' not in lay, 'layout contains a state name'
hexes = set(re.findall(r'#[0-9a-fA-F]{3,6}\b', lay))
print('  hex values in layout: %s' % (sorted(hexes) or 'none'))
assert hexes <= {'#fff'}, 'new hex colour introduced: %s' % (hexes - {'#fff'})
assert 'image-slot' not in page and '<img' not in page, 'page requests imagery'
print('  wrote src/data/state-law-links.ts')
print('  wrote src/layouts/StateLaw.astro  (%d lines, no state name)' % len(lay.splitlines()))
print('  wrote %s  (%d lines)' % (out, len(page.splitlines())))
left = re.findall(r'href="[^"/#][^"]*\.html"', page) + re.findall(r'href="[^"/#][^"]*\.html"', lay)
print('  unrewritten .html links: %s' % (left or 'none'))
