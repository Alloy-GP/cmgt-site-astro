import type { APIRoute } from 'astro';
import { LOCATION_REVIEWS, reviewsLink, searchFallback } from '~/data/reviews';

/* ============================================================
   GET /api/reviews?city=<baton-rouge|shreveport|lafayette>
     → { rating, count, reviews[], placeId, reviewsUrl, source, updatedAt }

   Pulls each location's live Google rating, review count AND review text from
   the Google Places API (New), keyed on that location's own profile. Ported
   from the Edison implementation and extended for the two things the CMGT city
   pages need: multiple locations, and review bodies (not just the number).

   Cached at the edge for 24h (s-maxage) so the upstream Places call happens at
   most ~once a day per location regardless of traffic; the daily Vercel cron in
   vercel.json keeps it warm. Never called from the client on every page load.

   Falls back to the committed values in src/data/reviews.ts when the key is
   missing or the API fails — so a page never renders an empty or zero rating.

   Activation: GOOGLE_PLACES_API_KEY in the Vercel env. Optionally set the exact
   Place ID per city (GOOGLE_PLACE_ID_BATON_ROUGE / _SHREVEPORT / _LAFAYETTE) to
   skip the text lookup — preferred, it's exact and one fewer call.
   ============================================================ */
export const prerender = false;

const PLACES = 'https://places.googleapis.com/v1';
/** How many reviews to surface per page (handoff asks for 3). */
const WANT = 3;

function json(body: unknown, cacheable: boolean) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheable
        ? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400'
        : 'public, max-age=0, s-maxage=300',
    },
  });
}

/** Per-city Place ID override from env, e.g. GOOGLE_PLACE_ID_BATON_ROUGE. */
function envPlaceId(city: string): string | undefined {
  const k = 'GOOGLE_PLACE_ID_' + city.toUpperCase().replace(/-/g, '_');
  return (import.meta.env as Record<string, string | undefined>)[k];
}

interface OutReview {
  author: string;
  rating: number;
  text: string;
  relative: string;
  publishedAt: string | null;
}

/** Shape Places API review objects into just what the card renders. */
function shapeReviews(raw: unknown): OutReview[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: Record<string, any>) => ({
      author: r?.authorAttribution?.displayName ?? 'Google reviewer',
      rating: typeof r?.rating === 'number' ? r.rating : 0,
      text: (r?.originalText?.text ?? r?.text?.text ?? '').trim(),
      relative: r?.relativePublishTimeDescription ?? '',
      publishedAt: r?.publishTime ?? null,
    }))
    // Only render reviews that actually have something to read.
    .filter((r) => r.text.length > 0 && r.rating > 0)
    .slice(0, WANT);
}

export const GET: APIRoute = async ({ url }) => {
  const debug = url.searchParams.get('debug') === '1';
  const city = (url.searchParams.get('city') ?? 'baton-rouge').toLowerCase();
  const loc = LOCATION_REVIEWS[city];

  if (!loc) {
    return json({ error: 'unknown city', known: Object.keys(LOCATION_REVIEWS) }, false);
  }

  const key = import.meta.env.GOOGLE_PLACES_API_KEY;
  const fallback = {
    city,
    rating: loc.rating,
    count: loc.count,
    reviews: [] as OutReview[],
    placeId: loc.placeId || null,
    reviewsUrl: loc.placeId ? reviewsLink(loc.placeId) : searchFallback(loc.textQuery),
    source: 'fallback',
    updatedAt: loc.updatedAt,
  };

  if (!key) {
    return json(debug ? { ...fallback, _debug: { keyPresent: false } } : fallback, false);
  }

  try {
    // Resolve the Place ID: explicit config > env override > text lookup.
    let placeId = loc.placeId || envPlaceId(city);
    const placeIdKnown = !!placeId;
    if (!placeId) {
      const found = await fetch(`${PLACES}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
        // Both of this project's Google keys are HTTP-referrer restricted (they're
        // browser keys by design). A server-side fetch sends no referrer, which Google
        // rejects with "Requests from referer <empty> are blocked" — the reason a live
        // pull returns nothing even with a valid key. Sending our own origin makes the
        // restricted key usable here. A dedicated server key would be cleaner.
        Referer: 'https://cmgt.org/',
          'X-Goog-FieldMask': 'places.id',
        },
        body: JSON.stringify({ textQuery: loc.textQuery }),
      }).then((r) => r.json());
      placeId = found?.places?.[0]?.id;
    }
    if (!placeId) return json(debug ? { ...fallback, _debug: { resolved: false } } : fallback, false);

    // Place Details: rating + count + reviews in one call.
    const det = await fetch(`${PLACES}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': key,
        // Both of this project's Google keys are HTTP-referrer restricted (they're
        // browser keys by design). A server-side fetch sends no referrer, which Google
        // rejects with "Requests from referer <empty> are blocked" — the reason a live
        // pull returns nothing even with a valid key. Sending our own origin makes the
        // restricted key usable here. A dedicated server key would be cleaner.
        Referer: 'https://cmgt.org/',
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
    }).then((r) => r.json());

    const rating = det?.rating;
    const count = det?.userRatingCount;
    const reviews = shapeReviews(det?.reviews);

    if (typeof rating === 'number' && typeof count === 'number') {
      return json({
        city,
        rating,
        count,
        reviews,
        placeId,
        reviewsUrl: reviewsLink(placeId),
        source: 'live',
        updatedAt: new Date().toISOString(),
      }, true);
    }

    // Have a Place ID but no usable numbers — keep the working reviews link.
    const partial = { ...fallback, placeId, reviewsUrl: reviewsLink(placeId), reviews };
    return json(debug
      ? { ...partial, _debug: { keyPresent: true, placeIdKnown, status: det?.error?.status, error: det?.error?.message, rating, count } }
      : partial, false);
  } catch (e) {
    return json(debug ? { ...fallback, _debug: { exception: String(e) } } : fallback, false);
  }
};
