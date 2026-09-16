// src/data/team.ts
// ─────────────────────────────────────────────────────────────────────────────
// The people CMGT shows publicly — single source of truth for the Team &
// Careers roster, the local-team panels on the city pages, and the Person
// JSON-LD both emit. Add a person here once and every surface picks them up.
//
// Headshots live in public/photos as {slug}-cmgt.webp (480×480, face-centred).
// Names, titles, and regions come from the PPD org chart.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE } from '~/config/site';

export type Region =
  | 'company'                // department-wide, no single market
  | 'baton-rouge'
  | 'northshore'
  | 'southwest-louisiana'
  | 'north-louisiana'
  | 'mississippi-gulf-coast'
  | 'alabama-gulf-coast';

/** How each region reads in copy ("Your {label} point of contact") and alt text. */
export const REGION_LABEL: Record<Region, string> = {
  'company':                'CMGT',
  'baton-rouge':            'Baton Rouge',
  'northshore':             'Louisiana Northshore',
  'southwest-louisiana':    'Southwest Louisiana',
  'north-louisiana':        'North Louisiana',
  'mississippi-gulf-coast': 'Mississippi Gulf Coast',
  'alabama-gulf-coast':     'Alabama Gulf Coast',
};

export interface TeamMember {
  slug: string;
  givenName: string;
  familyName: string;
  jobTitle: string;
  region: Region;
  /** Named point of contact on that region's city page — listed first there. */
  lead?: boolean;
  /**
   * Public profiles for the same person (LinkedIn, CAI directory, etc.). Each
   * one is a corroborating signal that this is a real, identifiable
   * professional — fill in as the team supplies them.
   */
  sameAs?: string[];
  /**
   * Industry credentials, exactly as designated: 'CMCA', 'AMS', 'PCAM', or a
   * state license such as 'Florida CAM License'. Emitted as hasCredential.
   * Leave empty until confirmed — never guess a credential.
   */
  credentials?: string[];
}

export const TEAM_PAGE = '/about/team-careers';

export const TEAM: TeamMember[] = [
  { slug: 'summer-mere',       givenName: 'Summer',  familyName: 'Mere',        jobTitle: 'Director of PPD',                      region: 'company' },
  { slug: 'amanda-roubique',   givenName: 'Amanda',  familyName: 'Roubique',    jobTitle: 'CAM Supervisor',                       region: 'baton-rouge',            lead: true },
  { slug: 'caitlin-wentland',  givenName: 'Caitlin', familyName: 'Wentland',    jobTitle: 'CAM Supervisor',                       region: 'mississippi-gulf-coast', lead: true },
  { slug: 'megan-moore',       givenName: 'Megan',   familyName: 'Moore',       jobTitle: 'Community Association Manager',        region: 'baton-rouge' },
  { slug: 'denise-scipione',   givenName: 'Denise',  familyName: 'Scipione',    jobTitle: 'Community Association Manager',        region: 'northshore' },
  { slug: 'shonte-thompson',   givenName: 'Shonte',  familyName: 'Thompson',    jobTitle: 'Onsite Community Association Manager', region: 'northshore' },
  { slug: 'jayda-barrilleaux', givenName: 'Jayda',   familyName: 'Barrilleaux', jobTitle: 'Community Association Manager',        region: 'southwest-louisiana' },
  { slug: 'natalie-vidrine',   givenName: 'Natalie', familyName: 'Vidrine',     jobTitle: 'Onsite Community Association Manager', region: 'southwest-louisiana' },
  { slug: 'tonya-leblanc',     givenName: 'Tonya',   familyName: 'LeBlanc',     jobTitle: 'Community Association Manager',        region: 'southwest-louisiana',    lead: true,
    sameAs: ['https://www.linkedin.com/in/tonya-krist0824/'] },
  { slug: 'sarah-radovich',    givenName: 'Sarah',   familyName: 'Radovich',    jobTitle: 'Community Association Manager',        region: 'mississippi-gulf-coast' },
  { slug: 'sarah-solomon',     givenName: 'Sarah',   familyName: 'Solomon',     jobTitle: 'F&A CAM',                              region: 'mississippi-gulf-coast' },
  { slug: 'sheena-walter',     givenName: 'Sheena',  familyName: 'Walter',      jobTitle: 'Community Association Manager',        region: 'north-louisiana',        lead: true },
  { slug: 'shelby-averett',    givenName: 'Shelby',  familyName: 'Averett',     jobTitle: 'Community Association Manager',        region: 'alabama-gulf-coast',     lead: true },
];

// ── Derived helpers ──────────────────────────────────────────────────────────

export const fullName  = (m: TeamMember) => `${m.givenName} ${m.familyName}`;
export const photoPath = (m: TeamMember) => `/photos/${m.slug}-cmgt.webp`;
/** Stable, resolvable identifier for the person — the anchor on the team page. */
export const memberUrl = (m: TeamMember) => `${TEAM_PAGE}#${m.slug}`;
export const memberId  = (m: TeamMember) => SITE.url + memberUrl(m);

/** Alt text: who they are, what they do, where — e.g. "…for CMGT on the Alabama Gulf Coast". */
export function memberAlt(m: TeamMember): string {
  if (m.region === 'company') return `${fullName(m)}, ${m.jobTitle} at CMGT`;
  const label = REGION_LABEL[m.region];
  const prep = /Coast|Northshore/.test(label) ? 'on the' : 'in';
  return `${fullName(m)}, ${m.jobTitle} for CMGT ${prep} ${label}`;
}

/** Everyone in a region, point of contact first, otherwise in roster order. */
export function teamFor(region: Region): TeamMember[] {
  return TEAM.filter((m) => m.region === region).sort((a, b) => Number(!!b.lead) - Number(!!a.lead));
}
