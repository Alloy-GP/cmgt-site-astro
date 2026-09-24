/* ============================================================
   Per-location Google review data for the GBP-matched city pages.

   Each city page is the matched landing destination for one verified Google
   Business Profile, so ratings, counts and review text are per-location — a
   Shreveport page showing Baton Rouge reviews defeats the point of the page.

   How this is used:
   - src/lib/google-reviews.ts pulls each location's live rating, count and
     review text from the Google Places API. Every city page awaits it
     server-side, so the hero rail, the NAP "Reviews" row, the proof-band counter
     and the LocalBusiness aggregateRating all render from one current number.
   - /api/reviews?city=<id> serves the same data to the inline script on each
     page, which re-syncs those numbers and renders the review cards
     (edge-cached daily, warmed by the crons in vercel.json).
   - The committed `rating`/`count` below are the fallback for when the Places
     key is missing or Google is slow or down, so a page always renders a real
     number and never a zero or an empty rating.

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
    updatedAt: '2026-09-24',
  },
  shreveport: {
    id: 'shreveport',
    gbpName: 'CMGT- North Louisiana',
    placeId: 'ChIJF0aljwrNNoYR-IAl06KcDkU',
    textQuery: 'CMGT North Louisiana, Crockett Street, Shreveport, LA',
    rating: 4.5,
    count: 14,
    updatedAt: '2026-09-24',
  },
  lafayette: {
    id: 'lafayette',
    gbpName: 'CMGT- Southwest Louisiana',
    placeId: 'ChIJ1wgFszubJIYRzFHm5mWnVB4',
    textQuery: 'CMGT Southwest Louisiana, NW Evangeline Thruway, Carencro, LA',
    rating: 4.1,
    count: 18,
    updatedAt: '2026-09-24',
  },
  daphne: {
    id: 'daphne',
    gbpName: 'CMGT- Alabama Gulf Coast',
    placeId: 'ChIJbZ-eHQlPmogRZXIcLFkoCcE',
    textQuery: 'CMGT Alabama Gulf Coast, 26241 Equity Dr, Daphne, AL',
    // Pulled from the profile itself (places:searchText → Place Details), not guessed.
    // Note this is the weakest of the five — worth a look before it's promoted anywhere.
    // 2026-09-24: was 3.4 from 16; a review was removed and the average moved.
    rating: 3.5,
    count: 15,
    updatedAt: '2026-09-24',
  },
  biloxi: {
    id: 'biloxi',
    gbpName: 'CMGT- Mississippi Gulf Coast',
    placeId: 'ChIJtdwiyKURnIgR9_gMwu5E4tc',
    textQuery: 'CMGT Mississippi Gulf Coast, 770 Water St, Biloxi, MS',
    // Pulled from the profile itself, same as the others.
    rating: 4.6,
    count: 19,
    updatedAt: '2026-09-24',
  },
};

/** Google "see all reviews" deep link for a Place ID. */
export const reviewsLink = (placeId: string) =>
  `https://search.google.com/local/reviews?placeid=${placeId}`;

/** Opens the listing by name when no Place ID is known yet. */
export const searchFallback = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
