// src/lib/email.config.ts
// The only file you edit per client for email setup.
// All API routes (contact.ts, lead.ts, subscribe.ts) read from here.

// ── Non-production safety ────────────────────────────────────────────────
// On stg/dev, route ALL form notifications to a test inbox and skip Mailchimp,
// so testing never pings the real client inbox or pollutes the audience.
// Production (PUBLIC_ENV=production) uses the real CMGT inboxes below, unchanged.
const IS_PROD = import.meta.env.PUBLIC_ENV === 'production';
const NON_PROD_NOTIFY = ['skyler@alloygp.co']; // where stg/dev test leads go

// ── Alloy's monitoring copy ──────────────────────────────────────────────
// Alloy was cc'd on every staff notification and bcc'd on every confirmation,
// so a shared inbox received a copy of everything this site produced. That copy
// exists to keep an eye on the site, and the Slack channel does it better: it
// carries the whole submission, and it puts no Alloy address on a thread with a
// CMGT board, owner or vendor.
//
// So: empty once there is somewhere in Slack to log submissions, and unchanged
// until then, so monitoring is never dropped silently. Non-prod is already
// covered by NON_PROD_NOTIFY above.
const ALLOY_MONITORING: string[] =
  IS_PROD &&
  !(import.meta.env.FORM_SLACK_WEBHOOK || import.meta.env.FORM_ALERT_SLACK_URL)
    ? ['admin@alloygp.co']
    : [];

export const EMAIL_CONFIG = {

  // ── Client brand identity. Used in headings, signatures, and links. ──
  brand: {
    name: 'CMGT',
    url:  'https://cmgt.org',
    team: 'Skyler',
  },

  // ── All site mail sends from the verified mail.cmgt.org sending subdomain.
  // Internal staff notifications come from notifications@; customer-facing
  // confirmations / welcomes come from the friendlier hello@. Replies to both
  // route to info@cmgt.org (replyTo below). ──
  from: {
    notifications: 'CMGT <notifications@mail.cmgt.org>', // staff notification sender (dedicated sending subdomain)
    confirmations: 'CMGT <hello@mail.cmgt.org>',         // customer confirmation / welcome sender (dedicated sending subdomain)
  },

  // ── Replies to any of our emails route to this monitored inbox. ──
  replyTo: 'info@cmgt.org',

  // ── Visible CC on the internal STAFF notification (every recipient there is
  // internal, so it's safe to show them). Prod only. This is the DEFAULT cc
  // fallback (Jeff + agency admin); per-intent overrides are below. ──
  notifyCc: IS_PROD ? ['jharman@cmgt.org', ...ALLOY_MONITORING] : [],

  // ── Per-intent CC override. Vendor bids + general questions route to info@
  // and deliberately skip Jeff (they're not new-business); only the agency
  // admin stays cc'd for monitoring. Intents not listed fall back to notifyCc. ──
  notifyCcByIntent: (IS_PROD
    ? {
        proposal: ['jharman@cmgt.org', ...ALLOY_MONITORING],
        rental:   [...ALLOY_MONITORING], // rentals go to Chris Tremblay; Jeff not cc'd
        vendor:   [...ALLOY_MONITORING],
        general:  [...ALLOY_MONITORING],
        resident: [...ALLOY_MONITORING], // homeowner help — Jeff not cc'd
      }
    : {}
  ) as Record<string, string[]>,

  // ── Hidden BCC (audit copy) on SUBMITTER-facing mail — the confirmation and
  // the newsletter welcome — so we never expose internal addresses to the public
  // submitter. Prod only. ──
  bcc: ALLOY_MONITORING,

  // ── Default inbox — used by unknown/unrouted intents (fallback). ──
  notify: IS_PROD ? ['newdevelopment@cmgt.org'] : NON_PROD_NOTIFY,

  // ── Failure-alert inbox. Handlers send the email-fallback alert here
  // when a notification send fails (see form-alert.ts). ──
  alertsTo: IS_PROD ? ['newdevelopment@cmgt.org'] : NON_PROD_NOTIFY,

  // ── Per-intent routing. The intake form sends an `intent`; /api/lead
  // routes the staff notification to the matching list (falls back to `notify`).
  // All lead forms go to newdevelopment@cmgt.org in prod (newsletter is separate,
  // Mailchimp-only). On non-prod everything goes to the test inbox. ──
  routes: (IS_PROD
    ? {
        proposal: ['newdevelopment@cmgt.org'], // boards exploring new management
        vendor:   ['info@cmgt.org'],           // contractor / vendor bids → general inbox
        general:  ['info@cmgt.org'],           // catch-all general inquiries → general inbox
        rental:   ['christremblay@cmgt.org'], // rental management inquiries → Chris Tremblay
        resident: ['info@cmgt.org'],           // homeowner help → general office inbox (never new development)
      }
    : { proposal: NON_PROD_NOTIFY, vendor: NON_PROD_NOTIFY, general: NON_PROD_NOTIFY, rental: NON_PROD_NOTIFY, resident: NON_PROD_NOTIFY }
  ) as Record<string, string[]>,

  mailchimp: {
    enabled:      IS_PROD,   // prod only — never add stg/dev test leads to the real audience
    defaultTags:  ['website-lead'],        // tag applied to proposal form submissions (only intent synced to Mailchimp)
    subscribeTags: ['newsletter-footer'],  // tag applied to footer newsletter opt-ins
  },

  // ───────────────────────────────────────────────────────────────────────────
  // PER-INTENT EMAIL CONTENT  (intake form → /api/lead)
  // Each intent key matches the form's intent id (proposal | vendor | service | general).
  // `default` is the fallback for any unknown intent.
  //   • label          → staff-notification heading + used in subject
  //   • notifySubject  → subject line of the STAFF notification email
  //   • confirmSubject → subject line of the email the SUBMITTER receives
  //   • confirmBody    → body (HTML) of the email the SUBMITTER receives
  // (Recipient routing per intent lives in `routes` above.)
  // ───────────────────────────────────────────────────────────────────────────
  intents: {
    proposal: {
      label: 'Proposal Request',
      notifySubject: (who: string) => `New proposal request — ${who}`,
      confirmSubject: "We've got it from here 👋",
      confirmBody: (firstName: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply — even the best management company lets a robot say the first hello. But here's the real part: your proposal request just landed with us, and a real person on our team is already reviewing the details you shared about your community.</p>
        <p>From here, we'll take a close look at what your association needs and reach out personally to walk you through what management with CMGT would look like — no generic pitch, just a straight answer on how we'd serve your community.</p>
        <p>We've got it from here.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
    rental: {
      label: 'Rental Management Inquiry',
      notifySubject: (who: string) => `New rental management inquiry — ${who}`,
      confirmSubject: "We've got it from here 👋",
      confirmBody: (firstName: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply, even the best property managers have to let a robot say hello now and then. But here's the real part: the details about your property landed safely, and a real person on our Greater Baton Rouge rental team is already on the way to review it and follow up personally.</p>
        <p>We've got it from here.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
    vendor: {
      label: 'Vendor Bid',
      notifySubject: (who: string) => `New vendor bid — ${who}`,
      confirmSubject: "We've got it from here 👋",
      confirmBody: (firstName: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply, even the best management company has to let a robot say hello now and then. But here's the real part: your bid landed safely, and a real person on our procurement team is already on the way to review it. If there's a fit for your trade and service area, someone will follow up personally.</p>
        <p>We've got it from here.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
    general: {
      label: 'General Inquiry',
      notifySubject: (who: string) => `New general inquiry — ${who}`,
      confirmSubject: "We've got it from here 👋",
      confirmBody: (firstName: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply, even the best communication company has to let a robot say hello now and then. But here's the real part: your message landed safely, and an actual human on our team is already on the way to read it and follow up personally. Because around here, "we'll look into it" actually means someone is looking into it.</p>
        <p>We've got it from here.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
    // Resident / homeowner help — reuses the general-inquiry reply (per client).
    resident: {
      label: 'Resident / Homeowner',
      notifySubject: (who: string) => `New resident inquiry — ${who}`,
      confirmSubject: "We've got it from here 👋",
      confirmBody: (firstName: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply, even the best communication company has to let a robot say hello now and then. But here's the real part: your message landed safely, and an actual human on our team is already on the way to read it and follow up personally. Because around here, "we'll look into it" actually means someone is looking into it.</p>
        <p>We've got it from here.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
    default: {
      label: 'Inquiry',
      notifySubject: (who: string) => `New inquiry — ${who}`,
      confirmSubject: "We've got it from here 👋",
      confirmBody: (firstName: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply, even the best communication company has to let a robot say hello now and then. But here's the real part: your message landed safely, and an actual human on our team is already on the way to read it and follow up personally. We've got it from here.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
  } as Record<string, {
    label: string;
    notifySubject: (who: string) => string;
    confirmSubject: string;
    confirmBody: (firstName: string, siteUrl: string) => string;
  }>,

  // ── Confirmation copy for the contact + subscribe forms.
  // (contact.ts / subscribe.ts read these — keep both keys.) ──
  copy: {
    contact: {
      confirmSubject: 'We received your message — CMGT',
      confirmBody: (name: string, _siteUrl: string) =>
        `<p>Hi ${name},</p>
        <p>Thanks for reaching out. Our team will be in touch within one business day.</p>
        <p>— Skyler</p>`,
    },
    subscribe: {
      confirmSubject: "You're on the list 👋",
      confirmBody: (name: string) =>
        `<p>Hi there,</p>
        <p>This is an automated reply, even the best communication company has to let a robot say hello now and then. But here's the real part: you're officially on the list. When we've got something genuinely useful for your board — plain-English guidance on reserves, budgets, and Gulf South HOA law — a real team will send it your way. No spam, no filler, ever.</p>
        <p>Glad to have you.</p>
        <p>— The CMGT Team<br>We Manage. You Live.</p>`,
    },
  },
};
