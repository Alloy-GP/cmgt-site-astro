/**
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
  { name: 'Louisiana',   slug: 'louisiana',   hub: '/hoa-management/louisiana',   lawPage: '/resources/hoa-laws/louisiana' },
  { name: 'Mississippi', slug: 'mississippi', hub: '/hoa-management/mississippi', lawPage: '/resources/hoa-laws/mississippi' },
  { name: 'Texas',       slug: 'texas',       hub: '/hoa-management/texas',       lawPage: '/resources/hoa-laws/texas' },
  { name: 'Florida',     slug: 'florida',     hub: '/hoa-management/florida',     lawPage: '/resources/hoa-laws/florida' },
];

/** Cards for every state except the one being viewed. */
export const siblingsOf = (slug: string) =>
  STATE_LAW_LINKS.filter((s) => s.slug !== slug).map((s) => ({
    name: s.name,
    href: s.lawPage ?? s.hub,
  }));
