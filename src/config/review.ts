// src/config/review.ts
// Source of truth for the Alloy Preview Review widget (stg only).
//
//   PASTEL_BASE  — fixed Pastel share link for this client. Set once. (trailing # required)
//   TICKET_ID    — rewritten by Claude at the start of each review session.
//   REVIEW_ITEMS — every reviewable page. Only items with review:true appear in the
//                  widget; if none are true the widget is hidden entirely.
//
// Paths must match exactly, including the trailing slash. Pages start at review:false
// so the widget stays hidden until the first real review session.

export const PASTEL_BASE = 'https://usepastel.com/link/4wen2164/#';
export const TICKET_ID   = '10515';

export interface ReviewItem {
  label: string;
  path: string;
  review: boolean;
}

export const REVIEW_ITEMS: ReviewItem[] = [
  { label: 'Homepage',                       path: '/',                                             review: false },

  // Management & solutions
  { label: 'HOA Management Services',        path: '/hoa-management-services',                      review: false },
  { label: 'On-Site Management',             path: '/on-site-management',                           review: false },
  { label: 'Condo & Townhome Management',    path: '/condo-management',                             review: false },
  { label: 'Developer HOA Management',       path: '/developer-hoa-management',                     review: false },
  { label: 'Switching Management Companies', path: '/switching-hoa-management-companies',           review: false },
  { label: 'HOA Delinquency Recovery',       path: '/hoa-delinquency-recovery',                     review: false },
  { label: 'HOA Financial Management',       path: '/hoa-financial-management',                     review: false },
  { label: 'Self-Managed HOA',               path: '/self-managed-hoa',                             review: false },
  { label: 'Rentals',                        path: '/rentals',                                      review: false },
  { label: 'Search Rentals (Listings)',      path: '/search-rentals',                               review: false },

  // Locations
  { label: 'Louisiana HOA Management',       path: '/hoa-management/louisiana',                     review: false },
  { label: 'Texas HOA Management',           path: '/hoa-management/texas',                         review: false },
  { label: 'Mississippi HOA Management',     path: '/hoa-management/mississippi',                   review: false },
  { label: 'Alabama HOA Management',         path: '/hoa-management/alabama',                       review: false },
  { label: 'Florida Panhandle HOA Management', path: '/hoa-management/florida',                     review: false },

  // City pages — next review batch
  { label: 'Baton Rouge HOA Management (LA)', path: '/hoa-management/louisiana/baton-rouge',          review: false },
  { label: 'Lafayette HOA Management (LA)',   path: '/hoa-management/louisiana/lafayette',            review: false },
  { label: 'Shreveport HOA Management (LA)',  path: '/hoa-management/louisiana/shreveport',           review: false },
  { label: 'Daphne HOA Management (AL)',      path: '/hoa-management/alabama/daphne',                 review: false },
  { label: 'Biloxi HOA Management (MS)',      path: '/hoa-management/mississippi/biloxi',             review: false },

  // State HOA Law pages — NEW, up for review
  { label: 'Alabama HOA Laws',               path: '/resources/hoa-laws/alabama',                   review: true },
  { label: 'Louisiana HOA Laws',             path: '/resources/hoa-laws/louisiana',                 review: true },
  { label: 'Mississippi HOA Laws',           path: '/resources/hoa-laws/mississippi',               review: true },
  { label: 'Texas HOA Laws',                 path: '/resources/hoa-laws/texas',                     review: true },
  { label: 'Florida HOA Laws',               path: '/resources/hoa-laws/florida',                   review: true },

  // Resources & guides
  { label: 'HOA Special Assessments',        path: '/resources/hoa-special-assessments',            review: true },
  { label: 'Resources Hub',                  path: '/resources',                                    review: false },
  { label: 'Hurricane Preparedness',         path: '/resources/hurricane-preparedness-for-hoas',    review: false },
  { label: 'HOA Reserve Study',              path: '/resources/hoa-reserve-study',                  review: false },
  { label: 'HOA Budget Template',            path: '/resources/hoa-budget-template',                review: false },
  { label: 'HOA Rules Enforcement',          path: '/resources/hoa-rules-enforcement',              review: false },
  { label: 'FAQ',                            path: '/faq',                                          review: false },

  // Company
  { label: 'About CMGT',                     path: '/about',                                        review: false },
  { label: 'CMGT Cares',                     path: '/about/cmgt-cares',                             review: false },
  { label: 'Team & Careers',                 path: '/about/team-careers',                           review: false },
  { label: 'Our Story',                      path: '/our-story',                                    review: false },
  { label: 'How We Work',                    path: '/how-we-work',                                  review: false },
  { label: 'Testimonials',                   path: '/testimonials',                                 review: false },
  { label: 'The Fix-It Squad',               path: '/fix-it-squad',                                 review: false },
  { label: 'Request a Proposal',             path: '/request-a-proposal',                           review: false },
  { label: 'Homeowner Hub',                  path: '/homeowner-hub',                                        review: false },

  // Legal
  { label: 'Privacy Policy',                 path: '/privacy',                                      review: false },
  { label: 'Terms of Service',               path: '/terms',                                        review: false },
  { label: 'Cookie Policy',                  path: '/cookies',                                      review: false },
];
