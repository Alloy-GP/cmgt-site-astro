// src/lib/track.ts
// Analytics events for the site's forms, so the funnel can be read in GA4
// instead of guessed at. gtag exists only on production (BaseLayout loads GA
// when PUBLIC_ENV=production and GA_MEASUREMENT_ID is set), so on stg/dev this
// logs to the console instead — type in the proposal form locally and watch
// the events go by.
//
// Events the intake form sends (all under the GA4 property):
//   intake_intent_selected   { intent, via: picker | link | offramp }
//   proposal_step_viewed     { step: 1 | 2 | 3 }
//   proposal_step_blocked    { step, fields }      validation stopped "Continue" / submit
//   proposal_partial_captured                       step 1 done, partial lead stored
//   intake_offramp_resident  { role }               a resident was routed out of the proposal
//   form_blocked             { form, fields }       the flat (non-proposal) form's validation
//   generate_lead            { form, ref }          a COMPLETE submission the server accepted
//   form_submit_failed       { form, reason }       the POST failed: network | http_<status>
//
// `generate_lead` is GA4's recommended lead event — mark it as a key event in
// the property to get conversion reporting. It is also sent to the Meta pixel
// as a Lead when the pixel is present.
type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  };
  try {
    if (typeof w.gtag === 'function') w.gtag('event', event, params);
    else if (import.meta.env.DEV) console.info('[track]', event, params);
    if (event === 'generate_lead' && typeof w.fbq === 'function') {
      w.fbq('track', 'Lead', { content_name: params.form });
    }
  } catch {
    // Analytics must never be able to break a form.
  }
}
