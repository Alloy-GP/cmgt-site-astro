// src/lib/newsletter.ts
// Data layer for the /newsletter landing page. Zero per-issue editing.
//
// Everything issue-specific is read from Mailchimp at BUILD time (the page is
// prerendered; a campaign-sent webhook rebuilds it — see
// src/pages/api/newsletter-webhook.ts):
//
//   • the sent campaigns in the folder MAILCHIMP_NEWSLETTER_FOLDER_ID
//     → newest = current issue, the rest = archive rows
//   • the current campaign's HTML (GET /campaigns/{id}/content)
//     → issue label, section list, intro paragraph, hero image
//     (see src/lib/newsletter-content.ts for the extraction rules)
//   • subject line → headline, preview text → archive blurb / intro fallback,
//     long_archive_url → "read the full issue"
//
// Evergreen copy (newsletter name, Ask block, fallback hero, pre-launch state)
// lives in src/data/newsletter/newsletter.json and never changes per issue.
//
// Graceful degradation: if the folder id / API key is unset, or a fetch fails,
// or nothing has been sent yet, `current` is null and the page renders its
// "coming soon" state with the archive empty. It always builds.
//
// Ported from the Edison site's newsletter system (Alloy-GP/Edison-Website).

import copy from '~/data/newsletter/newsletter.json';
import { extractIssue } from '~/lib/newsletter-content';

export interface AskConfig {
  title: string;
  body: string;
  prompts: string[];
  questionLabel: string;
  questionPlaceholder: string;
  submitLabel: string;
}

export interface Hero {
  src: string;
  alt: string;
  /** Social card. Absolute Mailchimp URL for issue photos, /photos/og/… for the fallback. */
  og?: string;
}

export interface NewsletterCopy {
  name: string;
  description: string;
  subscribeBlurb: string;
  fallbackHero: Hero;
  comingSoon: { title: string; dek: string };
  ask: AskConfig;
}

export interface Issue {
  /** YYYY-MM of the send, Central time. Used for archive dedupe and the asked-{slug} Mailchimp tag. */
  slug: string;
  /** "October 2026" — the template's own header date when it has one, else the send month. */
  issueLabel: string;
  title: string;
  dek: string;
  hero: Hero;
  archiveUrl: string;
  sections: string[];
}

export interface ArchiveItem {
  slug: string;
  issueLabel: string;
  title: string;
  blurb: string;
  url: string;
}

export interface NewsletterData {
  newsletter: NewsletterCopy;
  current: Issue | null;
  archive: ArchiveItem[];
}

interface MailchimpCampaign {
  id: string;
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

// "2026-09-10T13:00:00+00:00" -> "2026-09", in the same zone as monthLabel.
function monthSlug(sendTime: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/Chicago',
  }).formatToParts(new Date(sendTime));
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '00';
  return `${y}-${m}`;
}

function configured(): boolean {
  const ok = Boolean(
    import.meta.env.MAILCHIMP_NEWSLETTER_FOLDER_ID &&
      import.meta.env.MAILCHIMP_API_KEY &&
      import.meta.env.MAILCHIMP_SERVER_PREFIX
  );
  if (!ok) console.warn('[newsletter] Mailchimp folder id / keys not set — rendering the pre-launch state');
  return ok;
}

async function mc<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${MC_BASE()}${path}`, { headers: { Authorization: authHeader() } });
    if (!res.ok) {
      console.error(`[newsletter] ${path} → ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[newsletter] ${path} failed:`, err);
    return null;
  }
}

async function fetchCampaigns(): Promise<MailchimpCampaign[]> {
  // No `status` filter on purpose: the rebuild is triggered by Mailchimp's
  // "campaign sending" event, which fires when the send STARTS. A campaign can
  // still be `sending` when this runs, so we take sent + sending and drop
  // everything else (drafts, scheduled, paused) below.
  const params = new URLSearchParams({
    type: 'regular',
    folder_id: import.meta.env.MAILCHIMP_NEWSLETTER_FOLDER_ID,
    sort_field: 'send_time',
    sort_dir: 'DESC',
    count: '24',
    fields:
      'campaigns.id,campaigns.status,campaigns.send_time,campaigns.long_archive_url,campaigns.settings.subject_line,campaigns.settings.preview_text',
  });
  const data = await mc<{ campaigns?: MailchimpCampaign[] }>(`/campaigns?${params}`);
  return (data?.campaigns ?? []).filter(
    (c) => c.send_time && (c.status === 'sent' || c.status === 'sending')
  );
}

async function fetchContent(id: string): Promise<string> {
  const data = await mc<{ html?: string }>(`/campaigns/${id}/content`);
  return data?.html ?? '';
}

export async function getNewsletterData(): Promise<NewsletterData> {
  const newsletter = copy as NewsletterCopy;

  if (!configured()) return { newsletter, current: null, archive: [] };

  const campaigns = await fetchCampaigns();
  if (!campaigns.length) return { newsletter, current: null, archive: [] };

  const [latest, ...rest] = campaigns;
  const previewText = latest.settings?.preview_text ?? '';
  const html = await fetchContent(latest.id);
  const x = extractIssue(html, { previewText, newsletterName: newsletter.name });

  // subject_line is the public-facing line; settings.title is Mailchimp's
  // internal campaign name ("September Newsletter") — never the H1. The
  // template's own big headline is the fallback if a subject line is missing.
  const title = latest.settings?.subject_line || x.headline || 'Newsletter';
  const hero: Hero = x.hero
    ? { src: x.hero.src, alt: x.hero.alt || `${title} — ${newsletter.name}`, og: x.hero.src }
    : newsletter.fallbackHero;

  const current: Issue = {
    slug: monthSlug(latest.send_time),
    issueLabel: x.issueLabel ?? monthLabel(latest.send_time),
    title,
    dek: x.dek ?? previewText,
    hero,
    archiveUrl: latest.long_archive_url || '',
    sections: x.sections,
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
