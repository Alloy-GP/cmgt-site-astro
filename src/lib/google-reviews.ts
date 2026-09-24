import { LOCATION_REVIEWS, reviewsLink, searchFallback, type LocationReviews } from '~/data/reviews';

/* ============================================================
   Live Google rating, review count and review text for one GBP-matched city page.

   One fetcher, two callers:
   - Each city page awaits getLocationReviews() in its frontmatter, so the hero
     rating rail, the NAP "Reviews" row, the proof-band counter and the
     LocalBusiness aggregateRating are all rendered from the same number on first
     paint. The city pages are SSR (output: 'server'), so this is what keeps the
     numbers current without a redeploy — and what keeps them agreeing with each
     other: before this, only the hero rail was swapped client-side, so it could
     read 3.5 while the NAP row a screen below still said 3.4.
   - /api/reviews wraps the same call for the inline script on each page, which
     re-syncs the numbers and renders the review cards. That route is edge-cached
     for a day and warmed by the crons in vercel.json.

   Results are memoised per function instance so a warm instance asks Google a
   handful of times a day per market, not once per page view. A failed or slow
   pull returns the last good live value if there is one, else the committed
   fallback from src/data/reviews.ts, and is retried after a short cooldown — a
   page never renders an empty or zero rating, and never waits on an outage twice.

   Activation: GOOGLE_PLACES_API_KEY in the Vercel env (PUBLIC_GOOGLE_MAPS_API_KEY
   is accepted too — see the Referer note below). Place IDs live in
   src/data/reviews.ts; GOOGLE_PLACE_ID_<CITY> in the env overrides them.
   ============================================================ */

const PLACES = 'https://places.googleapis.com/v1';
/** How many reviews to surface per page (handoff asks for 3). */
const WANT = 3;
/**
 * Minimum star rating for a review to be *quoted* on the page.
 *
 * The Places API returns Google's "most relevant" reviews, not the best ones — in
 * practice that meant a 1-star review was about to render inside the proof band on
 * four of the five markets. The aggregate rating and count stay truthful and
 * unfiltered (they mirror the GBP exactly); this only governs which review bodies
 * get quoted, the same editorial call any testimonial section makes.
 */
const MIN_STARS = 4;
/**
 * Below this many qualifying reviews, quote none and let the page show the rating
 * rail alone — one lonely testimonial reads worse than none, and it invites a
 * reader to wonder what the other fifteen said.
 */
const MIN_TO_SHOW = 2;

/** A live result is reused this long by a warm instance before Google is asked again. */
const LIVE_TTL_MS = 6 * 60 * 60 * 1000;
/**
 * After a failed pull, serve what we have for this long before retrying, so an
 * outage costs one slow render per instance, not every render.
 */
const MISS_TTL_MS = 10 * 60 * 1000;

/**
 * Both of this project's Google keys are HTTP-referrer restricted (they're browser
 * keys by design). A server-side fetch sends no referrer, which Google rejects with
 * "Requests from referer <empty> are blocked" — the reason a live pull returns
 * nothing even with a valid key. Sending our own origin makes the restricted key
 * usable here. A dedicated server key would be cleaner.
 */
const REFERER = 'https://cmgt.org/';

export interface ReviewCard {
  author: string;
  rating: number;
  text: string;
  relative: string;
  publishedAt: string | null;
}

export interface LocationReviewData {
  city: string;
  rating: number;
  count: number;
  reviews: ReviewCard[];
  placeId: string | null;
  reviewsUrl: string;
  source: 'live' | 'fallback';
  updatedAt: string;
}

export interface LocationReviewResult {
  data: LocationReviewData;
  /**
   * True when this pull reached Google — safe to cache for a day. False for the
   * committed fallback and for a stale re-serve of an earlier live value (whose
   * `data.source` is still 'live'), both of which should be retried soon.
   */
  fresh: boolean;
  /** Why a pull fell back (or was served stale); surfaced by /api/reviews?debug=1. */
  debug: Record<string, unknown>;
}

/**
 * Env lookup that works under the Vercel adapter.
 *
 * import.meta.env alone is not enough: Astro inlines PUBLIC_* at build time, but a
 * server-only secret like GOOGLE_PLACES_API_KEY is neither inlined nor present on
 * import.meta.env at request time — it arrives on process.env. Reading only
 * import.meta.env is why this route reported keyPresent:false on a deployment where
 * the variable was correctly set, and silently served fallback data instead.
 */
function envVar(name: string): string | undefined {
  const p = typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
  return p || (import.meta.env as Record<string, string | undefined>)[name];
}

/** Per-city Place ID override from env, e.g. GOOGLE_PLACE_ID_BATON_ROUGE. */
function envPlaceId(city: string): string | undefined {
  return envVar('GOOGLE_PLACE_ID_' + city.toUpperCase().replace(/-/g, '_'));
}

/** Shape Places API review objects into just what the card renders. */
function shapeReviews(raw: unknown): ReviewCard[] {
  if (!Array.isArray(raw)) return [];
  const out = raw
    .map((r: Record<string, any>) => ({
      author: r?.authorAttribution?.displayName ?? 'Google reviewer',
      rating: typeof r?.rating === 'number' ? r.rating : 0,
      text: (r?.originalText?.text ?? r?.text?.text ?? '').trim(),
      relative: r?.relativePublishTimeDescription ?? '',
      publishedAt: r?.publishTime ?? null,
    }))
    // Only quote reviews that have something to read and clear the quality floor.
    .filter((r) => r.text.length > 0 && r.rating >= MIN_STARS)
    .slice(0, WANT);
  return out.length >= MIN_TO_SHOW ? out : [];
}

/** The committed numbers for a location, in the same shape as a live result. */
export function fallbackFor(loc: LocationReviews): LocationReviewData {
  return {
    city: loc.id,
    rating: loc.rating,
    count: loc.count,
    reviews: [],
    placeId: loc.placeId || null,
    reviewsUrl: loc.placeId ? reviewsLink(loc.placeId) : searchFallback(loc.textQuery),
    source: 'fallback',
    updatedAt: loc.updatedAt,
  };
}

/**
 * One uncached pull from Google. `timeoutMs` is the total budget for the (up to
 * two) upstream calls; on expiry the committed fallback comes back.
 */
export async function fetchLocationReviews(
  loc: LocationReviews,
  opts: { timeoutMs?: number } = {},
): Promise<LocationReviewResult> {
  const fallback = fallbackFor(loc);
  const miss = (debug: Record<string, unknown>, data: LocationReviewData = fallback): LocationReviewResult =>
    ({ data, fresh: false, debug });

  // Accept either the server-only name or the browser key already in the project —
  // the Referer header makes the restricted key usable server-side.
  const key = envVar('GOOGLE_PLACES_API_KEY') || envVar('PUBLIC_GOOGLE_MAPS_API_KEY');
  if (!key) return miss({ keyPresent: false });

  const signal = opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : null;

  try {
    // Resolve the Place ID: explicit config > env override > text lookup.
    let placeId = loc.placeId || envPlaceId(loc.id);
    const placeIdKnown = !!placeId;
    if (!placeId) {
      const found = await fetch(`${PLACES}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          Referer: REFERER,
          'X-Goog-FieldMask': 'places.id',
        },
        body: JSON.stringify({ textQuery: loc.textQuery }),
        signal,
      }).then((r) => r.json());
      placeId = found?.places?.[0]?.id;
    }
    if (!placeId) return miss({ keyPresent: true, resolved: false });

    // Place Details: rating + count + reviews in one call.
    const det = await fetch(`${PLACES}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': key,
        Referer: REFERER,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
      signal,
    }).then((r) => r.json());

    const rating = det?.rating;
    const count = det?.userRatingCount;
    const reviews = shapeReviews(det?.reviews);

    if (typeof rating === 'number' && typeof count === 'number') {
      return {
        data: {
          city: loc.id,
          rating,
          count,
          reviews,
          placeId,
          reviewsUrl: reviewsLink(placeId),
          source: 'live',
          updatedAt: new Date().toISOString(),
        },
        fresh: true,
        debug: {},
      };
    }

    // Have a Place ID but no usable numbers — keep the working reviews link.
    return miss(
      { keyPresent: true, placeIdKnown, status: det?.error?.status, error: det?.error?.message, rating, count },
      { ...fallback, placeId, reviewsUrl: reviewsLink(placeId), reviews },
    );
  } catch (e) {
    return miss({ keyPresent: true, exception: String(e) });
  }
}

const memo = new Map<string, { at: number; ttl: number; result: LocationReviewResult }>();

/**
 * This location's current numbers, memoised per function instance.
 *
 * Throws on an unknown city so a typo in a page fails at dev time instead of
 * quietly rendering another market's rating — the exact bug the generator README
 * warns about.
 */
export async function getLocationReviews(
  city: string,
  opts: { timeoutMs?: number } = {},
): Promise<LocationReviewResult> {
  const loc = LOCATION_REVIEWS[city];
  if (!loc) throw new Error(`Unknown reviews location "${city}" — add it to src/data/reviews.ts`);

  const hit = memo.get(city);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.result;

  const fetched = await fetchLocationReviews(loc, opts);
  let result = fetched;
  if (!fetched.fresh && hit?.result.data.source === 'live') {
    // Google was slow or down. The last live value is fresher than the committed
    // fallback, so keep showing it — but as a non-fresh result, so it is retried
    // after the miss cooldown and not pinned at the edge for a day.
    result = {
      data: hit.result.data,
      fresh: false,
      debug: { staleLive: true, since: hit.result.data.updatedAt, ...fetched.debug },
    };
  }
  memo.set(city, { at: Date.now(), ttl: fetched.fresh ? LIVE_TTL_MS : MISS_TTL_MS, result });
  return result;
}
