/**
 * External login destinations, in one place.
 *
 * These URLs were previously inline in src/pages/login.astro. They are now shared
 * because pages other than the login hub deep-link straight into a portal — a
 * visitor already on /rentals should land in their portal, not be bounced back to a
 * chooser page to pick the door they already walked through.
 *
 * PropertyWare's tenant and owner logins are distinct URLs, so link to the one that
 * matches the page's audience rather than defaulting to either.
 */
export const PORTALS = {
  /** Homeowner / board portal for managed HOA communities. */
  hoa: 'https://portal.cmgt.org/public',
  /** PropertyWare — rental property owners and investors. */
  owner: 'https://app.propertyware.com/pw/index.html#/login/owner/cmgtproperties.org',
  /** PropertyWare — tenants renting a CMGT-managed property. */
  tenant: 'https://app.propertyware.com/pw/index.html#/login/tenant/cmgtproperties.org',
  /** Fix-It Squad maintenance. */
  fixit: 'https://fixitsquad.org/',
} as const;
