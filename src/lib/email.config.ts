// src/lib/email.config.ts
// The only file you edit per client for email setup.
// All API routes (contact.ts, lead.ts, subscribe.ts) read from here.

// ── Non-production safety ────────────────────────────────────────────────
// On stg/dev, route ALL form notifications to a test inbox and skip Mailchimp,
// so testing never pings the real client inbox or pollutes the audience.
// Production (PUBLIC_ENV=production) uses the real CMGT inboxes below, unchanged.
const IS_PROD = import.meta.env.PUBLIC_ENV === 'production';
const NON_PROD_NOTIFY = ['skyler@alloygp.co']; // where stg/dev test leads go

export const EMAIL_CONFIG = {

  // ── Client brand identity. Used in headings, signatures, and links. ──
  brand: {
    name: 'CMGT',
    url:  'https://cmgt.org',
    team: 'Skyler',
  },

  // ── All site mail (staff notifications AND submitter confirmations) sends
  // FROM notifications@cmgt.org. Both keys point here so every form uses it.
  // Must be from a domain verified in Resend. ──
  from: {
    notifications: 'CMGT <notifications@cmgt.org>',
    hello:         'CMGT <notifications@cmgt.org>',
  },

  // ── Replies to any of our emails route to this monitored inbox. ──
  replyTo: 'info@cmgt.org',

  // ── Visible CC on the internal STAFF notification (every recipient there is
  // internal, so it's safe to show them). Prod only. ──
  notifyCc: IS_PROD ? ['jharman@cmgt.org', 'admin@alloygp.co'] : [],

  // ── Hidden BCC (audit copy) on SUBMITTER-facing mail — the confirmation and
  // the newsletter welcome — so we never expose internal addresses to the public
  // submitter. Prod only. ──
  bcc: IS_PROD ? ['jharman@cmgt.org', 'admin@alloygp.co'] : [],

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
        vendor:   ['newdevelopment@cmgt.org'], // contractor / vendor bids
        general:  ['newdevelopment@cmgt.org'], // catch-all general inquiries
        rental:   ['newdevelopment@cmgt.org'], // rental management inquiries
      }
    : { proposal: NON_PROD_NOTIFY, vendor: NON_PROD_NOTIFY, general: NON_PROD_NOTIFY, rental: NON_PROD_NOTIFY }
  ) as Record<string, string[]>,

  mailchimp: {
    enabled:      IS_PROD,   // prod only — never add stg/dev test leads to the real audience
    defaultTags:  ['website-lead'],        // tag applied to lead/proposal form submissions
    subscribeTags: ['website-newsletter'], // tag applied to footer newsletter opt-ins
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
      confirmSubject: 'We received your request — CMGT',
      confirmBody: (firstName: string) =>
        `<p>Hi ${firstName},</p>
        <p>Thanks for reaching out to CMGT. We've received the details about your community and appreciate the chance to learn more about what your board needs.</p>
        <p>A real person on the team for your region will review your request and follow up within one business day — with a proposal built around your community, not a template.</p>
        <p>Talk soon,<br>The CMGT Team</p>`,
    },
    rental: {
      label: 'Rental Management Inquiry',
      notifySubject: (who: string) => `New rental management inquiry — ${who}`,
      confirmSubject: 'We received your rental inquiry — CMGT',
      confirmBody: (firstName: string) =>
        `<p>Hi ${firstName},</p>
        <p>Thanks for reaching out about rental management. We've received the details about your property.</p>
        <p>A member of our Greater Baton Rouge rental team will review it and follow up within two business days.</p>
        <p>Talk soon,<br>The CMGT Team</p>`,
    },
    vendor: {
      label: 'Vendor Bid',
      notifySubject: (who: string) => `New vendor bid — ${who}`,
      confirmSubject: 'We received your bid — CMGT',
      confirmBody: (firstName: string) =>
        `<p>Hi ${firstName},</p>
        <p>Thanks for your interest in working with CMGT. We've received your information and passed it to our procurement team.</p>
        <p>If there's a fit for your trade and service area, someone will be in touch. We appreciate you reaching out.</p>
        <p>Best regards,<br>The CMGT Team</p>`,
    },
    general: {
      label: 'General Inquiry',
      notifySubject: (who: string) => `New general inquiry — ${who}`,
      confirmSubject: 'We received your message — CMGT',
      confirmBody: (firstName: string) =>
        `<p>Hi ${firstName},</p>
        <p>Thanks for reaching out to CMGT. We've received your message and will make sure it reaches the right team.</p>
        <p>Someone will follow up with you within one business day.</p>
        <p>Best regards,<br>The CMGT Team</p>`,
    },
    default: {
      label: 'Inquiry',
      notifySubject: (who: string) => `New inquiry — ${who}`,
      confirmSubject: 'We received your message — CMGT',
      confirmBody: (firstName: string) =>
        `<p>Hi ${firstName},</p>
        <p>Thanks for reaching out to CMGT. A member of our team will follow up with you within one business day.</p>
        <p>Best regards,<br>The CMGT Team</p>`,
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
      confirmSubject: "You're on the list — CMGT",
      confirmBody: (name: string) =>
        `<p>Hi${name ? ` ${name}` : ''},</p>
        <p>Thanks for subscribing. We'll be in touch with useful updates, no fluff.</p>
        <p>— Skyler</p>`,
    },
  },
};
