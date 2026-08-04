/* ============================================================
   Per-location Google review data for the GBP-matched city pages.

   Each city page is the matched landing destination for one verified Google
   Business Profile, so ratings, counts and review text are per-location — a
   Shreveport page showing Baton Rouge reviews defeats the point of the page.

   How this is used:
   - The committed `rating`/`count` below are the SSR/build-time fallback, so a
     page always renders a real number and never a zero or an empty rating.
   - /api/reviews?city=<id> refreshes rating, count and review text from the
     Google Places API (edge-cached daily). The client script on each city page
     swaps the displayed values in place and renders the review cards.
   - LocalBusiness aggregateRating in each page is generated from these same
     values, so the schema and the visible rating can't disagree.

   Update the fallback numbers here only as a manual backstop; the live pull is
   what keeps the displayed values current.

   PLACE IDS: leave blank to resolve by text query (works, one extra API call).
   Setting the Place ID is preferred — it's exact and cheaper. Either set it
   here once known, or per-city via env: GOOGLE_PLACE_ID_BATON_ROUGE, etc.
   ============================================================ */

export interface LocationReviews {
  /** City page id — matches the page slug. */
  id: string;
  /** Name of the matched Google Business Profile (for reference + text lookup). */
  gbpName: string;
  /** Google Place ID. Empty = resolve by textQuery below. */
  placeId: string;
  /** Text query used only when placeId is empty. */
  textQuery: string;
  /** Committed fallback rating (last known good). */
  rating: number;
  /** Committed fallback review count (last known good). */
  count: number;
  /** ISO date the fallback numbers were verified. */
  updatedAt: string;
}

export const LOCATION_REVIEWS: Record<string, LocationReviews> = {
  'baton-rouge': {
    id: 'baton-rouge',
    gbpName: 'CMGT - Association, Condo, and Rental Management',
    placeId: 'ChIJNcLCkoG8JoYR4ECncPYIcKI',
    textQuery: 'CMGT Association Condo and Rental Management, 140 Aspen Square, Denham Springs, LA',
    rating: 4.2,
    count: 535,
    updatedAt: '2026-08-04',
  },
  shreveport: {
    id: 'shreveport',
    gbpName: 'CMGT- North Louisiana',
    placeId: 'ChIJF0aljwrNNoYR-IAl06KcDkU',
    textQuery: 'CMGT North Louisiana, Crockett Street, Shreveport, LA',
    rating: 4.5,
    count: 14,
    updatedAt: '2026-08-04',
  },
  lafayette: {
    id: 'lafayette',
    gbpName: 'CMGT- Southwest Louisiana',
    placeId: 'ChIJ1wgFszubJIYRzFHm5mWnVB4',
    textQuery: 'CMGT Southwest Louisiana, NW Evangeline Thruway, Carencro, LA',
    rating: 4.1,
    count: 18,
    updatedAt: '2026-08-04',
  },
  daphne: {
    id: 'daphne',
    gbpName: 'CMGT- Alabama Gulf Coast',
    placeId: 'ChIJbZ-eHQlPmogRZXIcLFkoCcE',
    textQuery: 'CMGT Alabama Gulf Coast, 26241 Equity Dr, Daphne, AL',
    // Pulled from the profile itself (places:searchText → Place Details), not guessed.
    // Note this is the weakest of the five — worth a look before it's promoted anywhere.
    rating: 3.4,
    count: 16,
    updatedAt: '2026-08-04',
  },
  biloxi: {
    id: 'biloxi',
    gbpName: 'CMGT- Mississippi Gulf Coast',
    placeId: 'ChIJtdwiyKURnIgR9_gMwu5E4tc',
    textQuery: 'CMGT Mississippi Gulf Coast, 770 Water St, Biloxi, MS',
    // Pulled from the profile itself, same as the others.
    rating: 4.6,
    count: 19,
    updatedAt: '2026-08-04',
  },
};

/** Google "see all reviews" deep link for a Place ID. */
export const reviewsLink = (placeId: string) =>
  `https://search.google.com/local/reviews?placeid=${placeId}`;

/** Opens the listing by name when no Place ID is known yet. */
export const searchFallback = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
