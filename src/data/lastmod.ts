/**
 * src/data/lastmod.ts — <lastmod> dates for the sitemap.
 *
 * The site is server-rendered, so @astrojs/sitemap has no file mtimes to work
 * from and was emitting no lastmod at all. A lastmod that is always "now" is
 * noise Google learns to ignore, so this is an explicit map instead: a route is
 * listed only when its content materially changed, dated the day it shipped.
 * Routes not listed get no lastmod, which is correct.
 *
 * Resource guides: keep these in step with the visible "Updated" line in the
 * hero and the dateModified in the page's Article schema.
 */
export const LASTMOD: Record<string, string> = {
  // Board Education Hub
  '/resources':                                 '2026-09-22',
  '/resources/hoa-reserve-study':               '2026-09-22',
  '/resources/hoa-budget-template':             '2026-09-22',
  '/resources/hoa-master-insurance-policy':     '2026-09-22',
  '/resources/hoa-special-assessments':         '2026-08-13',
  '/resources/hoa-financial-statements':        '2026-08-14',
  '/resources/hoa-rules-enforcement':           '2026-06-01',
  '/resources/hurricane-preparedness-for-hoas': '2026-06-01',
  '/resources/hoa-laws/louisiana':              '2026-08-21',
  '/resources/hoa-laws/texas':                  '2026-08-01',
  '/resources/hoa-laws/mississippi':            '2026-08-01',
  '/resources/hoa-laws/alabama':                '2026-08-01',
  '/resources/hoa-laws/florida':                '2026-08-01',

  // Service and solution pages touched in the 2026-W39 SEO pass
  '/hoa-financial-management':                  '2026-09-22',
  '/condo-management':                          '2026-09-22',
  '/hoa-management-services':                   '2026-09-22',
  '/developer-hoa-management':                  '2026-09-22',
  '/on-site-management':                        '2026-09-22',
  '/self-managed-hoa':                          '2026-09-22',
  '/switching-hoa-management-companies':        '2026-09-22',

  // Geo pages: local team refresh (W38) plus the W39 resource relinks
  '/hoa-management/louisiana':                  '2026-09-22',
  '/hoa-management/mississippi':                '2026-09-22',
  '/hoa-management/alabama':                    '2026-09-22',
  '/hoa-management/texas':                      '2026-09-22',
  '/hoa-management/florida':                    '2026-09-22',
  '/hoa-management/louisiana/baton-rouge':      '2026-09-22',
  '/hoa-management/louisiana/lafayette':        '2026-09-22',
  '/hoa-management/louisiana/shreveport':       '2026-09-22',
  '/hoa-management/mississippi/biloxi':         '2026-09-22',
  '/hoa-management/alabama/daphne':             '2026-09-22',
};
