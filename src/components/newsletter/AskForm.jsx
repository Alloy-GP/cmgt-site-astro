// src/components/newsletter/AskForm.jsx
// The only hydrated island on /newsletter. Everything else on the page is
// static Astro. Themed to the current issue via the `ask` prop (label +
// placeholder + button copy change with the topic). Posts JSON to
// /api/newsletter-ask, which writes the contact to Mailchimp and emails the
// question to CMGT. Styling: src/styles/newsletter.css (`nl-` prefix).
import { useState } from 'react';

const BOARD_ROLES = [
  'President',
  'Vice President',
  'Treasurer',
  'Secretary',
  'Director / At-large',
  'Developer / Declarant',
  'Property manager',
  'Homeowner / resident',
  'Other',
];

export default function AskForm({ slug, issueLabel, ask, newsletterName = 'CMGT board newsletter' }) {
  const [state, setState] = useState('idle'); // idle | sending | sent | error

  async function onSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (data.website) return; // honeypot tripped — silently drop
    setState('sending');
    try {
      const res = await fetch('/api/newsletter-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          subscribe: data.SUBSCRIBE === 'on',
          issueSlug: slug,
          issueLabel,
        }),
      });
      setState(res.ok ? 'sent' : 'error');
      if (res.ok && typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', { form: 'newsletter_ask', issue: slug });
      }
    } catch (err) {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="nl-sent" role="status" aria-live="polite">
        <div className="nl-sent-h">Your question is in.</div>
        <p className="nl-sent-b">
          A CMGT community manager will reply directly — usually within one business day.
        </p>
      </div>
    );
  }

  const busy = state === 'sending';

  return (
    <form className="nl-form" onSubmit={onSubmit}>
      <div className="nl-grid">
        <label className="nl-field">
          <span className="nl-label">First name<span className="nl-req" aria-hidden="true">*</span></span>
          <input className="nl-input" required type="text" name="FNAME" autoComplete="given-name" />
        </label>
        <label className="nl-field">
          <span className="nl-label">Last name<span className="nl-req" aria-hidden="true">*</span></span>
          <input className="nl-input" required type="text" name="LNAME" autoComplete="family-name" />
        </label>
        <label className="nl-field nl-span">
          <span className="nl-label">Email<span className="nl-req" aria-hidden="true">*</span></span>
          <input className="nl-input" required type="email" name="EMAIL" autoComplete="email" />
        </label>
        <label className="nl-field">
          <span className="nl-label">Community or association</span>
          <input className="nl-input" type="text" name="COMMUNITY" autoComplete="organization" />
        </label>
        <label className="nl-field">
          <span className="nl-label">Your role</span>
          <select className="nl-input nl-select" name="ROLE" defaultValue="">
            <option value="" disabled>Select one</option>
            {BOARD_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="nl-field nl-span">
          <span className="nl-label">{ask.questionLabel}<span className="nl-req" aria-hidden="true">*</span></span>
          <textarea
            className="nl-input nl-textarea"
            required
            name="QUESTION"
            rows={4}
            placeholder={ask.questionPlaceholder}
          />
        </label>
      </div>

      {/* Honeypot — hidden from humans, catches bots. Do not remove. */}
      <div className="nl-hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="nl-check">
        <input type="checkbox" name="SUBSCRIBE" defaultChecked />
        <span>Also send me the {newsletterName} each month. Unsubscribe anytime.</span>
      </label>

      {state === 'error' && (
        <div className="nl-error" role="alert" aria-live="assertive">
          That didn't go through. Try again, or email us directly at{' '}
          <a href="mailto:info@cmgt.org">info@cmgt.org</a>.
        </div>
      )}

      <button className="btn btn-green nl-submit" type="submit" disabled={busy}>
        {busy ? 'Sending…' : ask.submitLabel} {!busy && <span className="arrow">→</span>}
      </button>
      <p className="nl-note">
        We use your answers to route the question to the right manager. No sales calls.
      </p>
    </form>
  );
}
