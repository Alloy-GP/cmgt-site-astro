// src/lib/boardUpdate.ts
// Data layer for /board-update: CMGT's monthly Board Update, built and
// published by CMGT in the Alloy Growth Portal (Board Update page), read here
// from the portal's public feed. Nothing is edited per issue on this site.
//
// The feed serves PUBLISHED issues only, newest first, each with the document
// as an HTML fragment (`html`) plus the data (`content`), and `css` once for the
// fragments. The pages are SSR with a short CDN cache (see the page files), so
// a publish shows within minutes and no deploy hook is needed.
//
// Graceful degradation: a feed error or an empty feed gives `issues: []` and
// the page renders its "first issue coming" state. It never throws.

export interface BoardUpdateIssue {
  /** '2026-10' — the issue's own address: /board-update/2026-10 */
  slug: string;
  /** "October 2026" — the month the issue is named for */
  label: string;
  /** "September 2026" — the month it reports */
  period: string;
  issueMonth: string;
  periodMonth: string;
  publishedAt: string | null;
  /** The document fragment (a `.bu-doc`), rendered by the portal. */
  html: string;
}

export interface BoardUpdateFeed {
  client: { name: string; slug: string; publicUrl: string | null } | null;
  css: string;
  issues: BoardUpdateIssue[];
}

const EMPTY: BoardUpdateFeed = { client: null, css: '', issues: [] };
const DEFAULT_FEED = 'https://aryttfcmleukwstknvio.supabase.co/functions/v1/board-update-feed?client=cmgt';

export async function getBoardUpdates(): Promise<BoardUpdateFeed> {
  const url = import.meta.env.BOARD_UPDATE_FEED_URL || DEFAULT_FEED;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) { console.warn('[board-update] feed answered', res.status); return EMPTY; }
    const data = await res.json();
    const issues: BoardUpdateIssue[] = Array.isArray(data?.issues)
      ? data.issues.filter((i: BoardUpdateIssue) => i && typeof i.slug === 'string' && typeof i.html === 'string')
      : [];
    return { client: data?.client ?? null, css: typeof data?.css === 'string' ? data.css : '', issues };
  } catch (err) {
    console.warn('[board-update] feed fetch failed:', err);
    return EMPTY;
  }
}

export function publishedLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });
}
