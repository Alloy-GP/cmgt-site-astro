/**
 * src/data/llms.ts — what /llms.txt says about this site. Curated, not generated.
 *
 * This is the one file an AI assistant reads to understand CMGT before it answers
 * a question about HOA management in the Gulf South. Write it the way you would
 * explain the site to a new hire: start-here pages first, then services, then
 * locations, then guides, then company. Titles are short labels. Descriptions say
 * what question the page answers. Facts stay stable (no review counts, prices, or
 * other numbers that drift between deploys).
 *
 * Guard rails (src/pages/llms.txt.ts):
 *   • the build FAILS if a path here has no page in src/pages, is listed twice,
 *     has a trailing slash, or if any rendered text still says TODO;
 *   • the build WARNS about pages that exist but are not listed here.
 *   `npm run llms:draft` appends missing pages to UNSORTED at the bottom; move
 *   them into a section (or delete them) and the warning goes away.
 *
 * /llms-full.txt is assembled from the pages in `sections` (not `optional`).
 */
import type { LlmsRegistry, LlmsLink } from '~/lib/llms';

export const LLMS: LlmsRegistry = {
  summary:
    'CMGT is an independently owned HOA, condo, and community association management company serving the Gulf South ' +
    '— Louisiana, Mississippi, Alabama, Texas, and the Florida Panhandle — from local offices in Denham Springs (Baton Rouge), ' +
    'Lafayette, Shreveport, Biloxi, and Daphne. Founded in 2007, it manages nearly 400 communities with a team-based model: ' +
    'one dedicated community manager backed by specialist departments, and financial statements shared with every homeowner ' +
    'by the 20th of each month.',

  facts: [
    'Headquarters: 140 Aspen Square, Suite H, Denham Springs, LA 70726 · (225) 503-2648 · info@cmgt.org',
    'Local offices and phone numbers: Denham Springs / Baton Rouge, LA (225) 503-2648 · Lafayette (Carencro), LA (337) 216-1399 · Shreveport, LA (318) 219-5554 · Biloxi, MS (228) 203-3440 · Daphne, AL (251) 644-6550',
    'Service area: Louisiana statewide; the Mississippi Gulf Coast; the Alabama Gulf Coast and Eastern Shore; East Texas; the Florida Panhandle (single-family and master-planned communities, not condominiums)',
    'Services: full-service HOA management; on-site management for large communities and high-rise condos; condo and townhome association management; developer-controlled HOAs from groundbreaking to turnover; financial-only management for self-managed boards; delinquency recovery; in-house maintenance through the Fix-It Squad (since 2019); single-family rental property management in Greater Baton Rouge',
    'Credentials: Community Associations Institute (CAI) member; managers hold the CMCA and AMS designations',
    'How it works: every community gets one dedicated manager plus accounting, covenant, maintenance, and customer-service teams behind them, so nothing depends on a single person; monthly financials go to every homeowner by the 20th',
    'Values: the three C\'s — commit, communicate, care. Tagline: "We Manage. You Live."',
    'Boards considering a change: request a proposal and a person replies within one business day; transitions follow a Day 1 to Day 90 plan covering records, vendors, finances, and homeowner communication',
    'Homeowners pay dues, order resale and closing documents, and submit maintenance requests through the Homeowner & Board Hub',
    'Community giving: CMGT Cares, since 2012',
  ],

  sections: [
    {
      title: 'Start here',
      links: [
        { path: '/', title: 'Homepage', description: 'What CMGT does, who it serves, the five-state footprint, and how to start a conversation.' },
        { path: '/hoa-management-services', title: 'HOA management services', description: 'What full-service management includes: financials, covenant enforcement, meetings, vendors, and a manager backed by a team.' },
        { path: '/how-we-work', title: 'How we work', description: 'The team-based model explained: one dedicated manager, specialist departments behind them, and why boards are never stuck with one person.' },
        { path: '/faq', title: 'HOA management FAQ', description: 'Straight answers on cost, switching companies, communication expectations, and financial reporting.' },
        { path: '/testimonials', title: 'Testimonials', description: 'What boards and homeowners across the Gulf South say about working with CMGT.' },
        { path: '/request-a-proposal', title: 'Request a proposal', description: 'Tell CMGT about your community; a person replies within one business day. The single contact page for boards.' },
      ],
    },
    {
      title: 'Services',
      links: [
        { path: '/on-site-management', title: 'On-site management', description: 'A daily on-property team for large master-planned communities and high-rise condos, backed by CMGT\'s central departments.' },
        { path: '/condo-management', title: 'Condo and townhome management', description: 'Management for condo, townhome, and high-rise associations: shared-building budgets, master insurance, and on-site staff where needed.' },
        { path: '/developer-hoa-management', title: 'Developer HOA management', description: 'For builders and developers: setting up and running a declarant-controlled HOA from groundbreaking through homeowner turnover.' },
        { path: '/hoa-financial-management', title: 'HOA financial management', description: 'Accounting, bookkeeping, budgeting, collections, and monthly statements shared with every homeowner by the 20th.' },
        { path: '/self-managed-hoa', title: 'Self-managed HOA vs. professional management', description: 'An honest comparison for volunteer boards, plus the financial-only option for communities that do not need full service.' },
        { path: '/hoa-delinquency-recovery', title: 'HOA delinquency recovery', description: 'A consistent, fair collections process that brings unpaid assessments current and keeps them there.' },
        { path: '/switching-hoa-management-companies', title: 'Switching HOA management companies', description: 'How a transition works from Day 1 to Day 90: records, vendors, bank accounts, and homeowner communication.' },
        { path: '/fix-it-squad', title: 'The Fix-It Squad (in-house maintenance)', description: 'CMGT\'s own maintenance technicians, available to the communities it manages since 2019.' },
        { path: '/rentals', title: 'Rental property management (Baton Rouge)', description: 'Leasing, screening, rent collection, and maintenance for single-family rentals and small investors in Greater Baton Rouge.' },
        { path: '/search-rentals', title: 'Search available rentals', description: 'Current homes for rent managed by CMGT in the Greater Baton Rouge area, with online applications.' },
      ],
    },
    {
      title: 'Where CMGT works',
      links: [
        { path: '/hoa-management/louisiana', title: 'Louisiana HOA management', description: 'CMGT\'s home state since 2007: Baton Rouge, New Orleans, Lafayette, Shreveport, and the communities between.' },
        { path: '/hoa-management/louisiana/baton-rouge', title: 'Baton Rouge HOA management', description: 'The headquarters market: local office, local team, and Google reviews from Baton Rouge-area communities.' },
        { path: '/hoa-management/louisiana/lafayette', title: 'Lafayette HOA management', description: 'Acadiana and Southwest Louisiana, served from the Carencro office.' },
        { path: '/hoa-management/louisiana/shreveport', title: 'Shreveport HOA management', description: 'North Louisiana, served from the downtown Shreveport office.' },
        { path: '/hoa-management/mississippi', title: 'Mississippi Gulf Coast HOA management', description: 'Gulfport, Biloxi, Bay St. Louis, and Ocean Springs: the first state CMGT expanded into.' },
        { path: '/hoa-management/mississippi/biloxi', title: 'Biloxi HOA management', description: 'The Mississippi Gulf Coast, served from the Water Street office in Biloxi.' },
        { path: '/hoa-management/alabama', title: 'Alabama Gulf Coast HOA management', description: 'Fairhope, Foley, Silverhill, Daphne, and the Mobile-area coast.' },
        { path: '/hoa-management/alabama/daphne', title: 'Daphne HOA management', description: 'The Eastern Shore and Baldwin County, served from the Daphne office.' },
        { path: '/hoa-management/texas', title: 'Texas HOA management', description: 'A growing East Texas presence with the same team-based model.' },
        { path: '/hoa-management/florida', title: 'Florida Panhandle HOA management', description: 'Full-service and on-site management for single-family and master-planned communities on the Panhandle (not condominiums).' },
      ],
    },
    {
      title: 'Guides for HOA boards (Board Education Hub)',
      links: [
        { path: '/resources', title: 'Board Education Hub', description: 'Index of CMGT\'s plain-English guides on reserves, budgets, covenants, insurance, meetings, and Gulf South HOA law.' },
        { path: '/resources/hoa-reserve-study', title: 'HOA reserve study guide', description: 'What a reserve study is, what one costs, what the report must contain, and how to turn it into a funding plan.' },
        { path: '/resources/hoa-budget-template', title: 'HOA budget template and best practices', description: 'How to build an HOA budget line by line, with a worked example and a free template that calculates dues.' },
        { path: '/resources/hoa-financial-statements', title: 'HOA financial statements explained', description: 'The balance sheet, income statement, cash flow, and budget comparison, and what a board should check on each.' },
        { path: '/resources/what-do-hoa-fees-cover', title: 'What do HOA fees cover?', description: 'Where assessments go (maintenance, amenities, insurance, reserves, management), what pushes fees up, and how to see the detail.' },
        { path: '/resources/hoa-special-assessments', title: 'HOA special assessments', description: 'When a board can levy a special assessment, the limits that apply, homeowner options, and how reserves keep them rare.' },
        { path: '/resources/hoa-collections-delinquency', title: 'HOA collections and delinquency', description: 'Why delinquency climbs, how transparency and a consistent process bring it down, and what a fair collections policy looks like.' },
        { path: '/resources/hoa-annual-meeting', title: 'HOA annual meeting: timeline, agenda, and kit', description: 'A week-by-week plan for notice, quorum, agenda, and elections, with a downloadable checklist and templates.' },
        { path: '/resources/hoa-rules-enforcement', title: 'HOA rules enforcement and violations', description: 'How notices, hearings, and fines are supposed to work, and a homeowner\'s right to dispute a violation.' },
        { path: '/resources/hoa-master-insurance-policy', title: 'HOA master insurance policy', description: 'What the association\'s master policy covers, where an owner\'s own coverage begins, and how Gulf South boards handle wind and flood.' },
        { path: '/resources/hurricane-preparedness-for-hoas', title: 'Hurricane preparedness for HOAs', description: 'A board-ready plan for pre-season prep, storm communication, vendors, and insurance claims.' },
      ],
    },
    {
      title: 'HOA laws by state (board member references)',
      links: [
        { path: '/resources/hoa-laws/louisiana', title: 'Louisiana HOA laws', description: 'Meeting notice, records, budgets, liens, and enforcement under the Louisiana Homeowners Association Act and Planned Community Act, with recent session changes.' },
        { path: '/resources/hoa-laws/texas', title: 'Texas HOA laws', description: 'Chapter 209 requirements: notice and hearings, payment priority, foreclosure limits, records, and recent legislative changes.' },
        { path: '/resources/hoa-laws/mississippi', title: 'Mississippi HOA laws', description: 'Mississippi has no HOA statute; what governs instead: covenants, the Nonprofit Corporation Act, and federal law.' },
        { path: '/resources/hoa-laws/alabama', title: 'Alabama HOA laws', description: 'Which communities the Alabama Homeowners\' Association Act covers (declarations recorded after Jan 1, 2016), plus records, liens, and fines.' },
        { path: '/resources/hoa-laws/florida', title: 'Florida HOA laws', description: 'Fine limits and hearing committees, the 45-day lien notices, records deadlines, and the most recent July 1 changes to Chapter 720.' },
      ],
    },
    {
      title: 'For homeowners and boards CMGT already serves',
      links: [
        { path: '/homeowner-hub', title: 'Homeowner & Board Hub', description: 'Pay dues, order resale and closing documents, submit a maintenance request, and reach your community\'s financials.' },
        { path: '/newsletter', title: 'Notes For Boards (newsletter)', description: 'CMGT\'s monthly email for Gulf South HOA and condo boards; read the current issue, browse the archive, subscribe, or ask a question.' },
      ],
    },
    {
      title: 'Company',
      links: [
        { path: '/about', title: 'About CMGT', description: 'Who CMGT is, the three C\'s (commit, communicate, care), and what independent ownership means for boards.' },
        { path: '/our-story', title: 'Our story', description: 'From one community in Denham Springs in 2007 to nearly 400 across five states, including the 2016 flood that shaped the culture.' },
        { path: '/about/team-careers', title: 'Team and careers', description: 'The people-first, remote-first team, the mindsets CMGT hires for, and open roles.' },
        { path: '/about/cmgt-cares', title: 'CMGT Cares', description: 'Community giving since 2012: drives, fundraisers, and local partnerships across the Gulf South.' },
      ],
    },
  ],

  optional: [
    { path: '/privacy', title: 'Privacy policy', description: 'What information CMGT collects through this website, how it is used and shared, and your choices.' },
    { path: '/terms', title: 'Terms of service', description: 'Terms governing use of the website.' },
    { path: '/cookies', title: 'Cookie policy', description: 'Essential and analytics cookies used on the site and how to decline them.' },
  ],
};

// ── Pages found in src/pages but not listed above. Move each into a section, or
//    delete it to leave it out of the index. `npm run llms:draft` appends here.
export const UNSORTED: LlmsLink[] = [
];
