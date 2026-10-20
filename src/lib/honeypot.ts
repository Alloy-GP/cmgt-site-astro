// src/lib/honeypot.ts
// The honeypot field shared by the intake form (client) and the form API routes
// (server). Importable from both sides — keep it to constants.
//
// The field used to be called `website`. Safari's contact AutoFill and password
// managers treat a text input named "website" as the contact's URL and fill it,
// and the server then discarded the submission as a bot while the visitor saw
// "You're all set". The name below maps to nothing any autofill engine knows.
// (The input is also read-only until focused, which autofill never does — see
// <Honeypot> in IntakeForm.jsx. Bots that set .value directly are still caught.)
export const HONEYPOT_FIELD = 'contact_preference_other';

// Every name the server treats as the honeypot: the current one, plus the names
// earlier bundles and the footer / newsletter forms send, so a visitor on a
// cached page is still judged on the right field.
export const HONEYPOT_FIELDS = [HONEYPOT_FIELD, 'website', 'company_website'];
