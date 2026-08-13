// src/data/og-images.ts
// ─────────────────────────────────────────────────────────────────────────────
// Per-route social card. Before this, 40 of 41 pages shared one generic
// /assets/og.png, so every link preview looked identical no matter what was
// shared. Each entry is that page's own hero, re-cropped to 1200x630.
//
// BaseLayout looks a route up here when the page doesn't pass ogImage itself, so
// an explicit ogImage prop still wins. Alt text is the hero's own, which is
// already written per page.
//
// Images are generated from public/photos/<hero> — keep the two in step if a
// hero is replaced.
// ─────────────────────────────────────────────────────────────────────────────

export interface OgImage {
  image: string;
  alt: string;
}

export const OG_IMAGES: Record<string, OgImage> = {
  '/': {
    image: '/photos/og/hero-b-photo.jpg',
    alt: 'A warm CMGT community manager meeting with a homeowner outside a well-kept Gulf South neighborhood at golden hour',
  },
  '/about': {
    image: '/photos/og/hoa-fullbleed.jpg',
    alt: 'A wide view of a Gulf South community CMGT manages, with tidy homes and landscaped common areas',
  },
  '/about/cmgt-cares': {
    image: '/photos/og/cc-hero-photo.jpg',
    alt: 'CMGT team members and volunteers gathered at a Gulf South community giving-back event, working side by side outdoors',
  },
  '/about/team-careers': {
    image: '/photos/og/on-site-cam-helping-residents.jpg',
    alt: 'A CMGT community manager helping residents on site at a Gulf South community',
  },
  '/condo-management': {
    image: '/photos/og/condo-hero-photo.jpg',
    alt: 'A Gulf South condominium and townhome community — a mid-rise building with balconies and shared grounds under a clear coastal sky',
  },
  '/developer-hoa-management': {
    image: '/photos/og/dev-hero-photo.jpg',
    alt: 'A Gulf South new-home development under construction — framed houses and graded lots in an emerging CMGT-managed community',
  },
  '/faq': {
    image: '/photos/og/hoa-board-members-financials.jpg',
    alt: 'HOA board members talking through community documents and financials together',
  },
  '/fix-it-squad': {
    image: '/photos/og/baton-rouge-maintenance-service.jpg',
    alt: 'A CMGT Fix-It Squad technician handling a maintenance call at a Baton Rouge community',
  },
  '/hoa-delinquency-recovery': {
    image: '/photos/og/dq-hero-photo.jpg',
    alt: 'A healthy, well-kept Gulf South neighborhood where dues stay current and common areas are cared for',
  },
  '/hoa-financial-management': {
    image: '/photos/og/homeowner-porch-hoa-financials.jpg',
    alt: 'A homeowner relaxing on a Gulf South front porch, checking their HOA\'s financial summary on a phone',
  },
  '/hoa-management-services': {
    image: '/photos/og/hoa-hero-photo.jpg',
    alt: 'A wide view of a Gulf South single-family, master-planned community with tidy homes and landscaped common areas',
  },
  '/hoa-management/alabama': {
    image: '/photos/og/al-geo-hero-photo.jpg',
    alt: 'An established single-family neighborhood along the Alabama Gulf Coast — manicured lawns, mature trees, and Gulf Coast homes under a clear sky',
  },
  '/hoa-management/alabama/daphne': {
    image: '/photos/og/al-geo-hero-photo.jpg',
    alt: 'An Alabama Gulf Coast community CMGT manages near Daphne',
  },
  '/hoa-management/florida': {
    image: '/photos/og/fl-geo-hero-photo.jpg',
    alt: 'A Florida Panhandle master-planned community near Pensacola with single-family homes and lush coastal landscaping',
  },
  '/hoa-management/louisiana': {
    image: '/photos/og/la-geo-hero-photo.jpg',
    alt: 'An established Louisiana residential community near Baton Rouge with mature oaks, well-kept homes, and manicured common areas under a bright Gulf South sky',
  },
  '/hoa-management/louisiana/baton-rouge': {
    image: '/photos/og/la-geo-hero-photo.jpg',
    alt: 'A Louisiana community neighborhood CMGT manages near Baton Rouge',
  },
  '/hoa-management/louisiana/lafayette': {
    image: '/photos/og/la-geo-hero-photo.jpg',
    alt: 'A Louisiana community neighborhood CMGT manages near Lafayette',
  },
  '/hoa-management/louisiana/shreveport': {
    image: '/photos/og/la-geo-hero-photo.jpg',
    alt: 'A Louisiana community neighborhood CMGT manages near Shreveport',
  },
  '/hoa-management/mississippi': {
    image: '/photos/og/ms-geo-hero-photo.jpg',
    alt: 'A Mississippi Gulf Coast neighborhood near Gulfport with coastal homes, palm-lined streets, and well-kept common areas',
  },
  '/hoa-management/mississippi/biloxi': {
    image: '/photos/og/ms-geo-hero-photo.jpg',
    alt: 'A Mississippi Gulf Coast community CMGT manages near Biloxi',
  },
  '/hoa-management/texas': {
    image: '/photos/og/tx-geo-hero-photo.jpg',
    alt: 'A newer master-planned East Texas neighborhood with modern single-family homes, wide streets, and open Texas sky',
  },
  '/homeowner-hub': {
    image: '/photos/og/homeowner-porch-hoa-financials.jpg',
    alt: 'A homeowner on a Gulf South front porch checking their HOA financials on a phone',
  },
  '/how-we-work': {
    image: '/photos/og/hoa-board-members-financials.jpg',
    alt: 'HOA board members reviewing community financials together at a kitchen table',
  },
  '/on-site-management': {
    image: '/photos/og/on-site-management-showing-clubhouse.jpg',
    alt: 'A CMGT on-site community manager with a tablet showing a resident around a Gulf South clubhouse community',
  },
  '/our-story': {
    image: '/photos/og/story-hero-photo.jpg',
    alt: 'A founding-era Gulf South community at golden hour — manicured streetscape with live oaks',
  },
  '/rentals': {
    image: '/photos/og/rn-hero-photo.jpg',
    alt: 'A well-kept single-family rental home in the Greater Baton Rouge area with a tidy lawn and inviting front porch',
  },
  '/request-a-proposal': {
    image: '/photos/og/hero-b-photo.jpg',
    alt: 'A CMGT community manager meeting with a homeowner outside a well-kept Gulf South neighborhood',
  },
  '/resources': {
    image: '/photos/og/hoa-clubhouse-roof-replacement.jpg',
    alt: 'Roof replacement underway on an HOA clubhouse',
  },
  '/resources/hoa-budget-template': {
    image: '/photos/og/budget-hero-photo.jpg',
    alt: 'An HOA board treasurer working on community finances at a clubhouse table with a laptop open',
  },
  '/resources/hoa-reserve-study': {
    image: '/photos/og/reserve-hero-photo.jpg',
    alt: 'A well-maintained HOA common area — a clubhouse, pool, and paved entrance kept in good repair by a funded reserve plan',
  },
  '/resources/hoa-rules-enforcement': {
    image: '/photos/og/enforce-hero-photo.jpg',
    alt: 'A CMGT community manager and a homeowner talking easily on a front porch — enforcement handled through conversation, not confrontation',
  },
  '/resources/hoa-special-assessments': {
    image: '/photos/og/hoa-clubhouse-roof-replacement.jpg',
    alt: 'Roof replacement underway on an HOA clubhouse',
  },
  '/resources/hurricane-preparedness-for-hoas': {
    image: '/photos/og/hurricane-hero-photo.jpg',
    alt: 'A Gulf South community standing intact under a dramatic, storm-darkened sky as a hurricane approaches the coast',
  },
  '/search-rentals': {
    image: '/photos/og/rn-hero-photo.jpg',
    alt: 'A well-kept single-family rental home in the Greater Baton Rouge area',
  },
  '/self-managed-hoa': {
    image: '/photos/og/sm-hero-photo.jpg',
    alt: 'Volunteer HOA board members meeting around a kitchen table, reviewing community paperwork together',
  },
  '/switching-hoa-management-companies': {
    image: '/photos/og/sw-hero-photo.jpg',
    alt: 'A relieved HOA board member shaking hands with a calm, capable CMGT community manager outside a community clubhouse — the feeling of weight lifted and trust earned',
  },
  '/testimonials': {
    image: '/photos/og/homeowner-porch-hoa-financials.jpg',
    alt: 'A homeowner on a Gulf South front porch checking their HOA financials on a phone',
  },
};
