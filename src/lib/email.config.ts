// src/lib/email.config.ts
// The only file you edit per client for email setup.
// All API routes (contact.ts, lead.ts, subscribe.ts) read from here.

export const EMAIL_CONFIG = {

  // ── Client brand identity. Used in headings, signatures, and links. ──
  brand: {
    name: 'CMGT',
    url:  'https://cmgt.org',
    team: 'Skyler',
  },

  // ── Both addresses must be from a domain verified in Resend. ──
  from: {
    notifications: 'CMGT <notifications@cmgt.org>',
    hello:         'CMGT <hello@cmgt.org>',
  },

  // ── Replies to any of our emails route to this monitored inbox. ──
  replyTo: 'info@cmgt.org',

  // ── Default inbox — used by unknown/unrouted intents (fallback). ──
  notify: [
    'info@cmgt.org',
  ],

  // ── Failure-alert inbox. Handlers send the email-fallback alert here
  // when a notification send fails (see form-alert.ts). ──
  alertsTo: [
    'info@cmgt.org',
  ],

  // ── Per-intent routing. The intake form sends an `intent`; /api/lead
  // routes the staff notification to the matching list (falls back to `notify`).
  // Each value can be one address or several. (Refine per inbox when available.) ──
  routes: {
    proposal: ['info@cmgt.org'], // boards exploring new management
    vendor:   ['info@cmgt.org'], // contractor / vendor bids
    service:  ['info@cmgt.org'], // homeowner service requests
    general:  ['info@cmgt.org'], // catch-all general inquiries
  } as Record<string, string[]>,

  mailchimp: {
    enabled:     true,      // set false if client has no Mailchimp
    defaultTags: ['website-lead'],
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
    service: {
      label: 'Service Request',
      notifySubject: (who: string) => `New service request — ${who}`,
      confirmSubject: 'We received your service request — CMGT',
      confirmBody: (firstName: string) =>
        `<p>Hi ${firstName},</p>
        <p>Thanks for contacting CMGT. We've received your request and routed it to your community's manager.</p>
        <p>A member of the team will follow up within one business day to confirm next steps. For an emergency, please call us at (225) 503-2648.</p>
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
