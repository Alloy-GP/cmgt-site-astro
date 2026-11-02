// src/components/MeetForm.jsx — the /meet landing page's "say hi" form.
//
// Six fields, one step: name, role, email, phone, community, notes. It posts to
// the same /api/lead route as the proposal wizard, as intent=meet, so a postcard
// lead gets the site's plumbing — the Slack ledger, the email to newdevelopment@
// + Savannah, the confirmation, the Mailchimp tag, the Pipedrive deal — with no
// second handler to maintain (the old meet.cmgt.org site carried its own copy of
// all four and had drifted). Routing and copy for the intent live in
// src/lib/email.config.ts (`routes.meet`, `intents.meet`, `salesIntents`).
//
// Deliberately NOT the canonical IntakeForm: a postcard visitor is asked to say
// hi, not to walk a three-step proposal wizard.
import { useState } from 'react';
import { HONEYPOT_FIELD } from '../lib/honeypot';
import { track } from '../lib/track';

// The campaign phone number printed on the postcards (not the main office line).
const PHONE = '(225) 425-5622';
const ROLES = ['Board President', 'Board Member', 'Developer / Sponsor', 'Homeowner', 'Other'];

// MEET-yymmdd-nnnn — same shape as the wizard's REQ- refs, so a meet lead is
// recognisable in Slack, the email footer and the Pipedrive deal note.
function genRef() {
  const d = new Date();
  const s = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return 'MEET-' + s + '-' + Math.floor(1000 + Math.random() * 9000);
}

// POST with one retry when the request got no response at all (dropped mobile
// connection). HTTP errors are not retried: the server has already alerted
// Slack. Mirrors postForm in IntakeForm.jsx, which is canonical and not exported.
async function postForm(url, body) {
  try {
    return await fetch(url, { method: 'POST', body });
  } catch {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      return await fetch(url, { method: 'POST', body });
    } catch (err) {
      err.reason = 'network';
      throw err;
    }
  }
}

const EMPTY = { name: '', role: '', email: '', phone: '', company: '', notes: '' };

export default function MeetForm() {
  const [vals, setVals] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [hp, setHp] = useState('');
  const [hpLocked, setHpLocked] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [done, setDone] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.value;
    setVals((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!vals.name.trim()) errs.name = 'Please tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email.trim())) errs.email = 'Please enter a valid email.';
    setErrors(errs);
    const blocked = Object.keys(errs);
    if (blocked.length) {
      track('form_blocked', { form: 'meet', fields: blocked.join(',') });
      return;
    }

    setSending(true);
    setSendError('');
    const ref = genRef();
    const fd = new FormData();
    fd.set('name', vals.name.trim());
    fd.set('email', vals.email.trim());
    fd.set('phone', vals.phone.trim());
    fd.set('company', vals.company.trim()); // the community / association — the Pipedrive Organization
    fd.set('intent', 'meet');
    fd.set('intentLabel', 'Meet CMGT');
    fd.set('ref', ref);
    fd.set('stage', 'complete');
    fd.set('source', typeof window !== 'undefined' ? window.location.pathname : '');
    fd.set(HONEYPOT_FIELD, hp);
    fd.set('fieldsJson', JSON.stringify([{ label: 'Role', value: vals.role }]));
    fd.set('message', vals.notes.trim());

    try {
      const res = await postForm('/api/lead', fd);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        const err = new Error(json.error || 'Something went wrong.');
        err.reason = `http_${res.status}`;
        throw err;
      }
      setDone(true);
      track('generate_lead', { form: 'meet', ref });
    } catch (err) {
      track('form_submit_failed', { form: 'meet', reason: err.reason || err.message });
      setSendError(
        err.reason === 'network'
          ? `We couldn’t reach our server — please check your connection and try again, or call us at ${PHONE}.`
          : `Something went wrong sending your message. Please try again or call us directly at ${PHONE}.`,
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="meet-form-card meet-form-success" role="status" aria-live="polite">
        <div className="meet-form-check" aria-hidden="true">✓</div>
        <h3 className="meet-form-success-h">Thanks — talk soon.</h3>
        <p className="meet-form-success-p">A real person from our team will reach out within one business day.</p>
      </div>
    );
  }

  return (
    <form id="meet-form" name="meet-form" className="meet-form-card" onSubmit={submit} noValidate>
      <div className="meet-form-head">
        <h3>Let’s have a conversation.</h3>
        <p>We’ll get back to you within one business day. No pitch, no pressure — promise.</p>
      </div>

      <div className="meet-form-row">
        <div className="meet-field">
          <label htmlFor="meet-name">Your name</label>
          <input id="meet-name" name="name" type="text" autoComplete="name" required placeholder="Jane Boudreaux"
            value={vals.name} onChange={set('name')} aria-invalid={errors.name ? 'true' : undefined} />
          {errors.name && <span className="meet-field-error">{errors.name}</span>}
        </div>
        <div className="meet-field">
          <label htmlFor="meet-role">Your role</label>
          <select id="meet-role" name="role" value={vals.role} onChange={set('role')}>
            <option value="">Select…</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="meet-form-row">
        <div className="meet-field">
          <label htmlFor="meet-email">Email</label>
          <input id="meet-email" name="email" type="email" autoComplete="email" required placeholder="you@email.com"
            value={vals.email} onChange={set('email')} aria-invalid={errors.email ? 'true' : undefined} />
          {errors.email && <span className="meet-field-error">{errors.email}</span>}
        </div>
        <div className="meet-field">
          <label htmlFor="meet-phone">Phone</label>
          <input id="meet-phone" name="phone" type="tel" autoComplete="tel" placeholder={PHONE}
            value={vals.phone} onChange={set('phone')} />
        </div>
      </div>

      <div className="meet-field" style={{ marginBottom: 14 }}>
        <label htmlFor="meet-company">Community / Association name</label>
        <input id="meet-company" name="company" type="text" autoComplete="organization" placeholder="e.g. Lakeshore HOA"
          value={vals.company} onChange={set('company')} />
      </div>

      <div className="meet-field" style={{ marginBottom: 22 }}>
        <label htmlFor="meet-notes">Anything you’d like us to know? <span className="meet-field-optional">(optional)</span></label>
        <textarea id="meet-notes" name="notes" rows={3} placeholder="Size of community, current manager, things you wish were different…"
          value={vals.notes} onChange={set('notes')} />
      </div>

      {/* Honeypot: visually hidden, out of the tab order, read-only until focused
          so autofill never fills it. Same field the proposal wizard uses. */}
      <div className="meet-hp" aria-hidden="true">
        <label>Leave this field empty
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off"
            readOnly={hpLocked} onFocus={() => setHpLocked(false)}
            value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      <button className="meet-form-submit" type="submit" disabled={sending}>
        {sending ? 'Sending…' : 'Say hi to CMGT →'}
      </button>
      {sendError && <p className="meet-form-error" role="alert">{sendError}</p>}
      <p className="meet-form-fineprint">We’ll never share your info. Unsubscribe anytime.</p>
    </form>
  );
}
