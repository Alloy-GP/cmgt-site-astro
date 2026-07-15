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
  { label: 'Homepage',                       path: '/',                                             review: true },

  // Management & solutions
  { label: 'HOA Management Services',        path: '/hoa-management-services',                      review: true },
  { label: 'On-Site Management',             path: '/on-site-management',                           review: true },
  { label: 'Condo & Townhome Management',    path: '/condo-management',                             review: true },
  { label: 'Developer HOA Management',       path: '/developer-hoa-management',                     review: true },
  { label: 'Switching Management Companies', path: '/switching-hoa-management-companies',           review: true },
  { label: 'HOA Delinquency Recovery',       path: '/hoa-delinquency-recovery',                     review: true },
  { label: 'HOA Financial Management',       path: '/hoa-financial-management',                     review: true },
  { label: 'Self-Managed HOA',               path: '/self-managed-hoa',                             review: true },
  { label: 'Rentals',                        path: '/rentals',                                      review: true },
  { label: 'Search Rentals (Listings)',      path: '/search-rentals',                               review: true },

  // Locations
  { label: 'Louisiana HOA Management',       path: '/hoa-management/louisiana',                     review: true },
  { label: 'Texas HOA Management',           path: '/hoa-management/texas',                         review: true },
  { label: 'Mississippi HOA Management',     path: '/hoa-management/mississippi',                   review: true },
  { label: 'Alabama HOA Management',         path: '/hoa-management/alabama',                       review: true },
  { label: 'Florida Panhandle HOA Management', path: '/hoa-management/florida',                     review: true },

  // Resources & guides
  { label: 'Resources Hub',                  path: '/resources',                                    review: true },
  { label: 'Hurricane Preparedness',         path: '/resources/hurricane-preparedness-for-hoas',    review: true },
  { label: 'HOA Reserve Study',              path: '/resources/hoa-reserve-study',                  review: true },
  { label: 'HOA Budget Template',            path: '/resources/hoa-budget-template',                review: true },
  { label: 'HOA Rules Enforcement',          path: '/resources/hoa-rules-enforcement',              review: true },
  { label: 'FAQ',                            path: '/faq',                                          review: true },

  // Company
  { label: 'About CMGT',                     path: '/about',                                        review: true },
  { label: 'CMGT Cares',                     path: '/about/cmgt-cares',                             review: true },
  { label: 'Team & Careers',                 path: '/about/team-careers',                           review: true },
  { label: 'Our Story',                      path: '/our-story',                                    review: true },
  { label: 'How We Work',                    path: '/how-we-work',                                  review: true },
  { label: 'Testimonials',                   path: '/testimonials',                                 review: true },
  { label: 'The Fix-It Squad',               path: '/fix-it-squad',                                 review: true },
  { label: 'Request a Proposal',             path: '/request-a-proposal',                           review: true },
  { label: 'Log In (Account Hub)',           path: '/login',                                        review: true },

  // Legal
  { label: 'Privacy Policy',                 path: '/privacy',                                      review: true },
  { label: 'Terms of Service',               path: '/terms',                                        review: true },
  { label: 'Cookie Policy',                  path: '/cookies',                                      review: true },
];
