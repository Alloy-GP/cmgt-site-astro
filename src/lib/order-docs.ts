// src/lib/order-docs.ts
// The "Order Documents" destination changes providers on Aug 1, 2026:
//   • before  → HomeWiseDocs
//   • on/after → CondoCerts resale portal
//
// The site is server-rendered (output: 'server'), so this is evaluated per
// request — the link flips itself at the cutover with NO manual change and NO
// scheduled job. Used by the header (Nav), footer, and the login/portal hub so
// all three stay in sync from one source of truth.

// Aug 1, 2026 at 00:00 America/Chicago. CMGT is Gulf South (Central Time);
// August is CDT (UTC−5), so midnight Central = 05:00 UTC.
const CUTOVER_MS = Date.UTC(2026, 7, 1, 5);

const BEFORE = 'https://www.homewisedocs.com/';
const AFTER  = 'https://cmgt.condocerts.com/resale/';

export function orderDocsUrl(now: number = Date.now()): string {
  return now >= CUTOVER_MS ? AFTER : BEFORE;
}
