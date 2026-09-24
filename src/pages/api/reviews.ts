import type { APIRoute } from 'astro';
import { LOCATION_REVIEWS } from '~/data/reviews';
import { getLocationReviews } from '~/lib/google-reviews';

/* ============================================================
   GET /api/reviews?city=<baton-rouge|shreveport|lafayette|daphne|biloxi>
     → { rating, count, reviews[], placeId, reviewsUrl, source, updatedAt }

   The client-side half of the city pages' Google review data. The pages render
   the rating, count and reviews link server-side via src/lib/google-reviews.ts;
   the inline script on each page then calls this route to re-sync those numbers
   and to render the review cards. Same fetcher, same per-instance memo — this
   route only adds the HTTP cache policy.

   Cached at the edge for 24h (s-maxage) so the upstream Places call happens at
   most ~once a day per location regardless of traffic; the daily Vercel crons in
   vercel.json keep it warm. Fallback responses are cached for 5 minutes only.

   ?debug=1 adds a _debug object explaining why a response fell back.
   ============================================================ */
export const prerender = false;

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

export const GET: APIRoute = async ({ url }) => {
  const debug = url.searchParams.get('debug') === '1';
  const city = (url.searchParams.get('city') ?? 'baton-rouge').toLowerCase();

  if (!LOCATION_REVIEWS[city]) {
    return json({ error: 'unknown city', known: Object.keys(LOCATION_REVIEWS) }, false);
  }

  const result = await getLocationReviews(city, { timeoutMs: 8000 });
  return json(debug ? { ...result.data, _debug: result.debug } : result.data, result.fresh);
};
