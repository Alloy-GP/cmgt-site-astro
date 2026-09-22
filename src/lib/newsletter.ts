// src/lib/newsletter.ts
// Data layer for the /newsletter landing page.
//
// The CURRENT issue and the ARCHIVE both derive from the sent campaigns in the
// Mailchimp campaign folder named "CMGT Newsletter" (its id lives in env as
// MAILCHIMP_NEWSLETTER_FOLDER_ID). Newest sent campaign = current issue; the
// rest = archive rows. Editorial fields Mailchimp cannot know (hero image,
// "in this issue" list, and the whole ask block) come from
// src/data/newsletter/current.json and overlay the campaign data.
//
// This runs at BUILD time (newsletter.astro is prerendered) — never per page
// view — so it respects Mailchimp's rate limits. A campaign-sent webhook
// triggers a rebuild; see src/pages/api/newsletter-webhook.ts.
//
// Graceful degradation: if the folder id / API key is unset, or the fetch
// fails, or no campaign has been sent yet, the page falls back to the seed in
// current.json and an empty archive. It always builds.
//
// Ported from the Edison site's newsletter system (Alloy-GP/Edison-Website).

import editorial from '~/data/newsletter/current.json';

export interface AskConfig {
  title: string;
  body: string;
  prompts: string[];
  questionLabel: string;
  questionPlaceholder: string;
  submitLabel: string;
}

export interface Issue {
  slug: string;
  issueLabel: string;
  title: string;
  dek: string;
  heroImg: string;
  heroAlt: string;
  /** 1200×630 social card for this issue. Optional — BaseLayout falls back to OG_IMAGES['/newsletter']. */
  ogImage?: string;
  archiveUrl: string;
  inThisIssue: string[];
  ask: AskConfig;
}

export interface ArchiveItem {
  slug: string;
  issueLabel: string;
  title: string;
  blurb: string;
  url: string;
}

export interface NewsletterMeta {
  name: string;
  description: string;
  subscribeBlurb: string;
}

export interface NewsletterData {
  newsletter: NewsletterMeta;
  current: Issue;
  archive: ArchiveItem[];
}

interface MailchimpCampaign {
  status?: string;
  send_time: string;
  long_archive_url?: string;
  settings?: { subject_line?: string; preview_text?: string };
}

const MC_BASE = () => `https://${import.meta.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0`;

function authHeader(): string {
  return 'Basic ' + Buffer.from(`anystring:${import.meta.env.MAILCHIMP_API_KEY}`).toString('base64');
}

// "2026-09-10T13:00:00+00:00" -> "September 2026", pinned to Central time (CMGT
// is Gulf South) so the month label never drifts across the UTC boundary.
function monthLabel(sendTime: string): string {
  return new Date(sendTime).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Chicago',
  });
}

// "2026-09-10T13:00:00+00:00" -> "2026-09", in the same zone as monthLabel so
// the slug and the label always describe the same month.
function monthSlug(sendTime: string): string {
  const d = new Date(sendTime);
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/Chicago',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '00';
  return `${y}-${m}`;
}

async function fetchCampaigns(): Promise<MailchimpCampaign[]> {
  const folderId = import.meta.env.MAILCHIMP_NEWSLETTER_FOLDER_ID;
  const apiKey = import.meta.env.MAILCHIMP_API_KEY;
  const prefix = import.meta.env.MAILCHIMP_SERVER_PREFIX;

  // Blockers not resolved yet (folder created / keys in env) → fall back cleanly.
  if (!folderId || !apiKey || !prefix) {
    console.warn('[newsletter] Mailchimp folder id / keys not set — using seed content only');
    return [];
  }

  // No `status` filter on purpose: the rebuild is triggered by Mailchimp's
  // "campaign sending" event, which fires when the send STARTS. A campaign can
  // still be `sending` when this fetch runs, so we take sent + sending and
  // drop everything else (drafts, scheduled, paused) below.
  const params = new URLSearchParams({
    type: 'regular',
    folder_id: folderId,
    sort_field: 'send_time',
    sort_dir: 'DESC',
    count: '24',
    fields:
      'campaigns.status,campaigns.send_time,campaigns.long_archive_url,campaigns.settings.subject_line,campaigns.settings.preview_text',
  });

  try {
    const res = await fetch(`${MC_BASE()}/campaigns?${params}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) {
      console.error(`[newsletter] campaigns fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = (await res.json()) as { campaigns?: MailchimpCampaign[] };
    return (data.campaigns ?? []).filter(
      (c) => c.send_time && (c.status === 'sent' || c.status === 'sending')
    );
  } catch (err) {
    console.error('[newsletter] campaigns fetch error:', err);
    return [];
  }
}

export async function getNewsletterData(): Promise<NewsletterData> {
  const newsletter = editorial.newsletter as NewsletterMeta;
  const seed = editorial.current as Issue;
  const campaigns = await fetchCampaigns();

  // Pre-send / no data → seed is the whole story, archive empty.
  if (!campaigns.length) {
    return { newsletter, current: seed, archive: [] };
  }

  const [latest, ...rest] = campaigns;
  // Derived from the campaign, NOT seed.slug: a stale hand-edited slug would
  // match the previous issue and the dedupe filter below would strip it out of
  // the archive, leaving the page claiming this month is the first issue.
  const currentSlug = monthSlug(latest.send_time);

  const current: Issue = {
    ...seed,
    slug: currentSlug,
    issueLabel: monthLabel(latest.send_time),
    // subject_line is the public-facing line; settings.title is Mailchimp's
    // internal campaign name ("CMGT NL Sep 2026 - v3 FINAL") — never the H1.
    title: latest.settings?.subject_line || seed.title,
    // Editorial dek wins (it's richer); fall back to the campaign preview text.
    dek: seed.dek || latest.settings?.preview_text || '',
    archiveUrl: latest.long_archive_url || seed.archiveUrl || '',
  };

  const archive: ArchiveItem[] = rest
    .map((c) => ({
      slug: monthSlug(c.send_time),
      issueLabel: monthLabel(c.send_time),
      title: c.settings?.subject_line || 'Newsletter',
      blurb: c.settings?.preview_text || '',
      url: c.long_archive_url || '',
    }))
    .filter((i) => i.slug !== current.slug && i.url);

  return { newsletter, current, archive };
}
