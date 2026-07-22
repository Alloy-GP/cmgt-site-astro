// Adaptive multi-intent intake form.
// Config-driven: brand/options/extra-intents live in ./intake-form.config.js.
// The PROPOSAL intent's field SET is CANONICAL and defined here — it must stay
// identical on every AGP site. Per site, only options/copy/theme change.
// Floating labels, `if-` CSS prefix, full WhatConverts field capture.
// Multi-step intent picker → fields → submit → animated receipt. Posts to /api/lead.
import { useState, useEffect, useRef } from 'react';
import { BRAND, TRACKING, PROPOSAL_OPTIONS, PROPOSAL_COPY, EXTRA_INTENTS, PROPOSAL_FORM_VERSION, PROPOSAL_V2 } from './intake-form.config.js';

// ── Icons (Lucide-style) ─────────────────────────────────────────
const I = {
  building:   <svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 21V9h3a1 1 0 0 1 1 1v11"/><path d="M8 7h2M8 11h2M8 15h2"/></svg>,
  hardhat:    <svg viewBox="0 0 24 24"><path d="M2 18a10 10 0 0 1 20 0"/><path d="M2 18h20"/><path d="M10 8.5V6a2 2 0 0 1 4 0v2.5"/><path d="M6 18v-2a6 6 0 0 1 1.2-3.6M18 18v-2a6 6 0 0 0-1.2-3.6"/></svg>,
  wrench:     <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.6-.6-2.3z"/></svg>,
  chat:       <svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.7L3 21l1.4-4.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>,
  home:       <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  arrowRight: <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  arrowLeft:  <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  check:      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  lock:       <svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>,
  zap:        <svg viewBox="0 0 24 24"><polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2"/></svg>,
  chevron:    <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>,
  inbox:      <svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>,
  users:      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  clock:      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>,
};
function Ic({ name }) { return <span className="if-ic">{I[name]}</span>; }

// ── CANONICAL PROPOSAL INTENT — DO NOT EDIT THE FIELD SET ────────────────
// Identical on every AGP site. Options come from PROPOSAL_OPTIONS, copy from
// PROPOSAL_COPY, colors/fonts from the --if-* theme vars. To add a request
// type, use EXTRA_INTENTS in the config — never fork these fields.
const PROPOSAL_INTENT = {
  id: 'proposal', label: 'Request a proposal', icon: 'building', tone: 'teal',
  blurb: PROPOSAL_COPY.blurb, forWho: PROPOSAL_COPY.forWho, routeTo: PROPOSAL_COPY.routeTo,
  fields: [
    { key: 'association', label: 'Association / community name', type: 'text', required: true, placeholder: 'e.g. Wynbrook HOA', col: 2 },
    { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'e.g. Annapolis' },
    { key: 'zip', label: 'ZIP code', type: 'text', required: true, placeholder: 'e.g. 21401', inputMode: 'numeric', maxLength: 10 },
    { key: 'units', label: 'Number of units', type: 'text', required: true, placeholder: 'e.g. 120', inputMode: 'numeric', maxLength: 6 },
    { key: 'propertyType', label: 'Property type', type: 'select', required: true, options: PROPOSAL_OPTIONS.propertyType },
    { key: 'situation', label: 'Current situation', type: 'select', required: true, options: PROPOSAL_OPTIONS.situation, col: 2 },
    { key: 'timeline', label: 'Decision timeline', type: 'radio', required: true, options: PROPOSAL_OPTIONS.timeline, col: 2 },
  ],
};

const INTENTS = [PROPOSAL_INTENT, ...EXTRA_INTENTS];
const intentById = (id) => INTENTS.find((i) => i.id === id);

function genId() {
  const d = new Date();
  const s = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return 'REQ-' + s + '-' + Math.floor(1000 + Math.random() * 9000);
}

// Call-tracking (e.g. WhatConverts) reads the DOM form on submit and only
// captures controls with a `name`. Map standard contact fields to the names
// the tracker maps to its built-in lead fields; everything else uses its
// label as the name so it shows verbatim. (The POST builds its own FormData,
// so these names don't change what the handler/email receive.)
const WC_STD = { name: 'name', email: 'email', phone: 'phone', association: 'company', company: 'company' };
const wcName = (def) => WC_STD[def.key] || def.label;

function Field({ def, value, error, onChange }) {
  const span = def.col === 2 ? '1 / -1' : 'auto';
  const fid = 'if-' + def.key;
  // noName: skip the DOM name (the v2 wizard captures via hidden mirror inputs
  // instead, to avoid duplicate-named controls across unmounted steps).
  const name = def.noName ? undefined : wcName(def);
  const filled = value != null && String(value) !== '';

  // Radio (segmented) has no placeholder slot — keep a static label.
  if (def.type === 'radio') {
    return (
      <div className="if-field" style={{ gridColumn: span }}>
        <label className="if-label" htmlFor={fid}>{def.label}{def.required && <span className="if-req">*</span>}</label>
        <div className="if-segmented" role="radiogroup">
          {def.options.map((o) => (
            <button type="button" key={o} className={'if-seg' + (value === o ? ' on' : '')}
              onClick={() => onChange(def.key, o)}>{o}</button>
          ))}
          {/* Carries the segmented value into the DOM form so call-tracking captures it. */}
          <input type="hidden" id={fid} name={name} value={value || ''} readOnly />
        </div>
        {error && <div className="if-err-msg">{error}</div>}
      </div>
    );
  }

  // Floating label: sits inside the field, shrinks to the top border on focus/fill.
  return (
    <div className="if-field" style={{ gridColumn: span }}>
      <div className={'if-float' + (filled ? ' has-value' : '') + (error ? ' is-err' : '')}>
        {def.type === 'text' && (
          <input id={fid} name={name} aria-label={def.label} className="if-control" type="text" placeholder=" "
            inputMode={def.inputMode} maxLength={def.maxLength}
            value={value || ''} onChange={(e) => onChange(def.key, e.target.value)} />
        )}
        {def.type === 'select' && (
          <>
            <select id={fid} name={name} aria-label={def.label} className="if-control if-select" value={value || ''} onChange={(e) => onChange(def.key, e.target.value)}>
              <option value="" disabled></option>
              {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="if-caret"><Ic name="chevron" /></span>
          </>
        )}
        <label className="if-flabel" htmlFor={fid}>{def.label}{def.required && <span className="if-req">*</span>}</label>
      </div>
      {error && <div className="if-err-msg">{error}</div>}
    </div>
  );
}

function Receipt({ intent }) {
  const steps = [
    { icon: 'check', title: 'Logged & time-stamped', detail: 'Saved to our system the moment you hit send — nothing slips through.' },
    { icon: 'users', title: 'Routed to the right team', detail: `Sent straight to ${intent.routeTo}.` },
    { icon: 'clock', title: 'A real person responds', detail: 'Expect to hear back within one business day — no auto-pilot.' },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const timers = steps.map((_, i) => setTimeout(() => setShown((s) => Math.max(s, i + 1)), 280 + i * 360));
    return () => timers.forEach(clearTimeout);
  }, [intent.id]);
  return (
    <div className="if-receipt">
      <div className="if-receipt-head"><Ic name="zap" /> Here’s what happens next</div>
      <ul className="if-receipt-list">
        {steps.map((r, i) => (
          <li key={r.title} className={'if-receipt-row' + (i < shown ? ' on' : '')}>
            <span className="if-receipt-check"><Ic name="check" /></span>
            <span className="if-receipt-txt"><strong>{r.title}</strong><span>{r.detail}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── v2 multi-select: chips (amenities, services) ────────────────────────
function PillMulti({ options, value, onChange }) {
  return (
    <div className="if-pillgrid" role="group">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} aria-pressed={on}
            className={'if-pill' + (on ? ' on' : '')}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ── v2 multi-select: checkbox cards (pain points) ───────────────────────
function CheckMulti({ options, value, onChange }) {
  return (
    <div className="if-checkgrid" role="group">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button type="button" key={o} aria-pressed={on}
            className={'if-checkcard' + (on ? ' on' : '')}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}>
            <span className="if-checkbox">{on && <Ic name="check" />}</span>
            <span className="if-checktxt">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── v2 step progress bar (1 · You → 2 · Your community → 3 · What you need) ──
function Steps({ step }) {
  const labels = ['You', 'Your community', 'What you need'];
  return (
    <ol className="if-steps">
      {labels.map((l, i) => {
        const n = i + 1;
        const state = n < step ? ' done' : n === step ? ' on' : '';
        return (
          <li key={l} className={'if-step-pip' + state}>
            <span className="if-step-bar" />
            <span className="if-step-label">{n} · {l}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ── CANONICAL PROPOSAL v2 — guided 3-step wizard with partial-lead capture ──
// Field SET + step order are fixed here (identical on every AGP site running v2).
// Options come from PROPOSAL_V2, copy from PROPOSAL_COPY. Step 1 (contact) fires
// a `stage=partial` lead the moment it's completed, so abandoned forms are still
// captured; the final submit sends `stage=complete` with the same `ref`.
function ProposalWizard({ onBack }) {
  const V = PROPOSAL_V2;
  const [step, setStep] = useState(1);
  const [refId, setRefId] = useState(genId);
  const [vals, setVals] = useState({
    name: '', role: '', email: '', phone: '',
    association: '', location: '', units: '', type: '', mgmtStatus: '', dues: '',
    amenities: [], services: [], pains: [], success: '', budget: '', timeline: '',
  });
  const [errors, setErrors] = useState({});
  const [hp, setHp] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [submission, setSubmission] = useState(null);
  const partialSent = useRef(false);

  const set = (k, v) => { setVals((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); };

  // Broadcast the active wizard step so the page can highlight it on the roadmap.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('intake:step', { detail: submission ? 'done' : step }));
  }, [step, submission]);

  // On completion, scroll back to the top so the success screen isn't stranded at
  // the bottom of the page after submitting from the last step.
  useEffect(() => {
    if (submission && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [submission]);

  function validateStep(s) {
    const e = {};
    if (s === 1) {
      if (!vals.name.trim()) e.name = 'Required';
      if (!vals.email.trim()) e.email = 'Required';
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vals.email)) e.email = 'Enter a valid email';
    } else if (s === 2) {
      if (!vals.association.trim()) e.association = 'Required';
      if (!vals.location.trim()) e.location = 'Required';
    } else if (s === 3) {
      if (!vals.services.length && !vals.pains.length) e.services = 'Pick at least one';
      if (!vals.timeline) e.timeline = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Labeled, ordered answers for the staff email (every answer with its real label).
  function buildFields() {
    const j = (a) => (Array.isArray(a) ? a.join(', ') : a);
    return [
      { label: 'Role', value: vals.role },
      { label: 'Association / community name', value: vals.association },
      { label: 'Location', value: vals.location },
      { label: 'Number of units', value: vals.units },
      { label: 'Community type', value: vals.type },
      { label: 'Current management status', value: vals.mgmtStatus },
      { label: 'Monthly dues / unit', value: vals.dues ? '$' + vals.dues : '' },
      { label: 'Amenities', value: j(vals.amenities) },
      { label: 'Services needed', value: j(vals.services) },
      { label: 'Frustrations', value: j(vals.pains) },
      { label: 'Budget range', value: vals.budget },
      { label: 'Engagement timeline', value: vals.timeline },
    ];
  }

  async function postLead(stage) {
    const fd = new FormData();
    fd.set('name', vals.name.trim());
    fd.set('email', vals.email.trim());
    fd.set('phone', vals.phone.trim());
    fd.set('company', vals.association.trim());
    fd.set('intent', 'proposal');
    fd.set('intentLabel', 'Request a proposal');
    fd.set('ref', refId);
    fd.set('stage', stage);
    fd.set('source', typeof window !== 'undefined' ? window.location.pathname : '');
    fd.set('website', hp); // honeypot
    if (stage === 'partial') {
      fd.set('fieldsJson', JSON.stringify([{ label: 'Role', value: vals.role }]));
      fd.set('message', '');
    } else {
      fd.set('fieldsJson', JSON.stringify(buildFields()));
      fd.set('message', vals.success.trim());
    }
    const res = await fetch('/api/lead', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.error || 'Something went wrong.');
  }

  function next() {
    if (!validateStep(step)) return;
    // Partial-lead capture: fire once when the contact step is completed.
    // Fire-and-forget so a slow/failed network never blocks the user.
    if (step === 1 && !partialSent.current) {
      partialSent.current = true;
      postLead('partial').catch((err) => { partialSent.current = false; console.error('partial lead failed:', err); });
    }
    setSendError('');
    setStep((s) => Math.min(3, s + 1));
  }
  function prev() {
    if (step === 1) { onBack(); return; }
    setSendError('');
    setStep((s) => s - 1);
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validateStep(3) || sending) return;
    setSending(true); setSendError('');
    try {
      await postLead('complete');
      setSubmission({ id: refId, first: vals.name.trim().split(' ')[0] });
    } catch (err) {
      setSendError(err.message || `Something went wrong. Please try again or call ${BRAND.phone}.`);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setStep(1); setRefId(genId());
    setVals({ name: '', role: '', email: '', phone: '', association: '', location: '', units: '', type: '', mgmtStatus: '', dues: '', amenities: [], services: [], pains: [], success: '', budget: '', timeline: '' });
    setErrors({}); setSendError(''); setSubmission(null); partialSent.current = false;
  }

  if (submission) {
    return (
      <div className="if-stage if-done">
        <div className="if-done-badge"><Ic name="check" /></div>
        <h2 className="if-title" style={{ marginTop: 14 }}>You’re all set, {submission.first}.</h2>
        <p className="if-sub">Your request is in — reference <strong style={{ color: 'var(--if-accent)' }}>{submission.id}</strong>. Expect a written proposal within one business day.</p>
        <Receipt intent={{ id: 'proposal', routeTo: PROPOSAL_COPY.routeTo }} />
        <button type="button" className="if-restart" onClick={reset}>Submit another request</button>
      </div>
    );
  }

  // Collected values mirrored as off-screen text inputs so call-tracking
  // (WhatConverts) captures everything on submit — even fields from earlier
  // (now-unmounted) steps and the chip/card multi-selects, which aren't real
  // inputs. WhatConverts reads any named input EXCEPT type="hidden", so these are
  // type="text" hidden via CSS (.if-wc), not type="hidden". Budget/timeline/success
  // are omitted here because they're visible inputs on step 3 that WC already reads
  // (keeping them would duplicate the field in the lead).
  const mirror = [
    ['name', vals.name], ['email', vals.email], ['phone', vals.phone], ['company', vals.association],
    ['Role', vals.role], ['Location', vals.location], ['Number of units', vals.units],
    ['Community type', vals.type], ['Current management status', vals.mgmtStatus],
    ['Monthly dues / unit', vals.dues], ['Amenities', vals.amenities.join(', ')],
    ['Services needed', vals.services.join(', ')], ['Frustrations', vals.pains.join(', ')],
  ];

  // Only expose the WhatConverts-tracked id on the FINAL step. WhatConverts
  // captures (and freezes the lead on) the first submit-like event it sees inside
  // a tracked form — clicking "Continue" out of step 2 was triggering a partial
  // capture, so the lead never got step-3 fields. Keeping the form untracked until
  // step 3 means the first (and only) capture is the complete final submit.
  const wcTracked = step === 3 && TRACKING.intents.includes('proposal');
  return (
    <form
      id={wcTracked ? TRACKING.formId : 'proposal-wizard'}
      name={wcTracked ? TRACKING.formId : 'proposal-wizard'}
      className="if-stage if-wizard" onSubmit={submit} noValidate>
      <div className="if-hp" aria-hidden="true">
        <label>Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>
      <div className="if-wc" aria-hidden="true">
        {mirror.map(([n, v]) => <input key={n} type="text" name={n} value={v} readOnly tabIndex={-1} autoComplete="off" />)}
      </div>

      {/* Change request type lives at the top — same place as the other intents. */}
      <button type="button" className="if-back" onClick={onBack}><Ic name="arrowLeft" /> Change request type</button>

      <Steps step={step} />

      {step === 1 && (
        <div className="if-wstep">
          <div className="if-stephead">
            <span className="if-eyebrow">Step 1</span>
            <h2 className="if-title">How to reach you</h2>
            <p className="if-sub">So we can send the proposal.</p>
          </div>
          <div className="if-grid">
            <Field def={{ key: 'name', label: 'Your name', type: 'text', required: true, noName: true }} value={vals.name} error={errors.name} onChange={set} />
            <Field def={{ key: 'role', label: 'Your role', type: 'select', options: V.roles, noName: true }} value={vals.role} error={errors.role} onChange={set} />
            <Field def={{ key: 'email', label: 'Email', type: 'text', required: true, noName: true }} value={vals.email} error={errors.email} onChange={set} />
            <Field def={{ key: 'phone', label: 'Phone', type: 'text', noName: true }} value={vals.phone} error={errors.phone} onChange={set} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="if-wstep">
          <div className="if-stephead">
            <span className="if-eyebrow">Step 2</span>
            <h2 className="if-title">Your community</h2>
            <p className="if-sub">The basics about your association.</p>
          </div>
          <div className="if-grid">
            <Field def={{ key: 'association', label: 'Association name', type: 'text', required: true, noName: true }} value={vals.association} error={errors.association} onChange={set} />
            <Field def={{ key: 'location', label: 'Location', type: 'text', required: true, placeholder: 'e.g. Baton Rouge, LA', noName: true }} value={vals.location} error={errors.location} onChange={set} />
            <Field def={{ key: 'units', label: 'Number of units', type: 'text', inputMode: 'numeric', maxLength: 6, noName: true }} value={vals.units} error={errors.units} onChange={set} />
            <Field def={{ key: 'type', label: 'Community type', type: 'select', options: V.communityType, noName: true }} value={vals.type} error={errors.type} onChange={set} />
            <Field def={{ key: 'mgmtStatus', label: 'Current management status', type: 'select', options: V.managementStatus, noName: true }} value={vals.mgmtStatus} error={errors.mgmtStatus} onChange={set} />
            <Field def={{ key: 'dues', label: 'Monthly dues / unit', type: 'text', inputMode: 'decimal', maxLength: 8, placeholder: 'e.g. 37.50', noName: true }} value={vals.dues} error={errors.dues} onChange={set} />
            <div className="if-field" style={{ gridColumn: '1 / -1' }}>
              <span className="if-grouplabel">Amenities <em>(select all that apply)</em></span>
              <PillMulti options={V.amenities} value={vals.amenities} onChange={(v) => set('amenities', v)} />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="if-wstep">
          <div className="if-stephead">
            <span className="if-eyebrow">Step 3</span>
            <h2 className="if-title">What you need</h2>
            <p className="if-sub">Be honest — the more specific, the more useful the proposal.</p>
          </div>
          <div className="if-grid">
            <div className="if-field" style={{ gridColumn: '1 / -1' }}>
              <span className="if-grouplabel">Services you’re looking for</span>
              <PillMulti options={V.services} value={vals.services} onChange={(v) => set('services', v)} />
            </div>
            <div className="if-field" style={{ gridColumn: '1 / -1' }}>
              <span className="if-grouplabel">What’s frustrating you right now? <em>(select as many as apply — these shape the proposal)</em></span>
              <CheckMulti options={V.painPoints} value={vals.pains} onChange={(v) => { set('pains', v); setErrors((e) => ({ ...e, services: null })); }} />
              {errors.services && <div className="if-err-msg">{errors.services}</div>}
            </div>
            <div className="if-field" style={{ gridColumn: '1 / -1' }}>
              <div className={'if-float if-float-top' + (vals.success ? ' has-value' : '')}>
                <textarea id="if-success" aria-label="What does success look like?" className="if-control if-textarea" rows={3} placeholder=" "
                  value={vals.success} onChange={(e) => set('success', e.target.value)} />
                <label className="if-flabel" htmlFor="if-success">In your own words — what does success look like?</label>
              </div>
            </div>
            <Field def={{ key: 'budget', label: 'Budget range', type: 'select', options: V.budget, noName: true }} value={vals.budget} error={errors.budget} onChange={set} />
            <Field def={{ key: 'timeline', label: 'Engagement timeline', type: 'select', required: true, options: V.timeline, noName: true }} value={vals.timeline} error={errors.timeline} onChange={set} />
          </div>
          <div className="if-next">
            <Ic name="zap" />
            <p><strong>What happens next.</strong> Your responses are reviewed by CMGT’s intake team within one business day. You’ll get a written proposal — built around what your board specifically said — at the email above. No phone bombardment.</p>
          </div>
        </div>
      )}

      {sendError && <div className="if-senderror">{sendError}</div>}

      <div className="if-wnav">
        {step > 1
          ? <button type="button" className="if-back" onClick={prev}><Ic name="arrowLeft" /> Back</button>
          : <span className="if-wnav-spacer" />}
        <span className="if-wstepcount">Step {step} of 3</span>
        {step < 3 ? (
          <button type="button" className="if-submit" onClick={next}>Continue <Ic name="arrowRight" /></button>
        ) : (
          <button type="submit" className="if-submit" disabled={sending}>
            {sending ? 'Sending…' : 'Submit request'}{!sending && <Ic name="arrowRight" />}
          </button>
        )}
      </div>
    </form>
  );
}

export default function IntakeForm() {
  const [step, setStep] = useState('intent');
  const [intentId, setIntentId] = useState(null);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [fields, setFields] = useState({});
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [submission, setSubmission] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [hp, setHp] = useState(''); // honeypot — must stay empty for humans

  const intent = intentId ? intentById(intentId) : null;

  // Deep-link: ?intent=proposal opens straight to that intent's fields.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const want = new URLSearchParams(window.location.search).get('intent');
    if (want && intentById(want)) { setIntentId(want); setFields({}); setErrors({}); setStep('form'); }
  }, []);

  // On completion, scroll back to the top so the success screen isn't stranded at
  // the bottom of the page after submit.
  useEffect(() => {
    if (step === 'done' && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Broadcast the active intent so the surrounding page can adapt (e.g. swap hero
  // copy). No-op if nothing listens — keeps the component drop-in everywhere.
  // null while on the picker; the intent id once a form/wizard is showing.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('intake:intent', { detail: step === 'intent' ? null : intentId }));
  }, [step, intentId]);

  const pick = (id) => { setIntentId(id); setFields({}); setErrors({}); setStep('form'); };
  const back = () => { setStep('intent'); setErrors({}); setSendError(''); };
  const setField = (k, v) => { setFields((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); };
  const setC = (k, v) => { setContact((c) => ({ ...c, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); };

  function validate() {
    const e = {};
    if (!contact.name.trim()) e.name = 'Required';
    if (!contact.email.trim()) e.email = 'Required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) e.email = 'Enter a valid email';
    (intent.fields || []).forEach((f) => { if (f.required && !fields[f.key]) e[f.key] = 'Required'; });
    if (intent.id === 'service' && !message.trim()) e.message = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate() || sending) return;
    setSending(true); setSendError('');
    const id = genId();
    const company = fields.association || fields.company || fields.reference || fields.address || '';
    // Send the per-intent fields as a labeled, ordered list so the handler can
    // render every answer with its real label (not a cram-everything-into-message blob).
    const fieldsJson = JSON.stringify(
      (intent.fields || []).map((f) => ({ label: f.label, value: (fields[f.key] ?? '').toString().trim() }))
    );

    const fd = new FormData();
    fd.set('name', contact.name.trim());
    fd.set('email', contact.email.trim());
    fd.set('phone', contact.phone.trim());
    fd.set('company', company);
    fd.set('intent', intent.id);
    fd.set('intentLabel', intent.label);
    fd.set('ref', id);
    fd.set('fieldsJson', fieldsJson);
    fd.set('message', message.trim()); // free-text "anything else" only
    fd.set('source', typeof window !== 'undefined' ? window.location.pathname : '');
    fd.set('website', hp); // honeypot — handler rejects if non-empty

    try {
      const res = await fetch('/api/lead', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.error || 'Something went wrong.');
      setSubmission({ id, first: contact.name.trim().split(' ')[0] });
      setStep('done');
    } catch (err) {
      setSendError(err.message || `Something went wrong. Please try again or call ${BRAND.phone}.`);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setStep('intent'); setIntentId(null); setContact({ name: '', email: '', phone: '' });
    setFields({}); setMessage(''); setErrors({}); setSubmission(null); setSendError('');
  }

  return (
    <div className="if-widget">
      <div className="if-inner">
        {step === 'intent' && (
          <div className="if-stage">
            <div className="if-eyebrow">Get in touch</div>
            <h2 className="if-title">How can we help?</h2>
            <p className="if-sub">Pick what fits — we’ll only ask what we need, then make sure the right person sees it fast.</p>
            <div className="if-intent-grid">
              {INTENTS.filter((it) => !it.hidden).map((it) => (
                <button type="button" key={it.id} className={`if-intent-card tone-${it.tone}`} onClick={() => pick(it.id)}>
                  <span className="if-intent-icon"><Ic name={it.icon} /></span>
                  <span className="if-intent-body">
                    <span className="if-intent-label">{it.label}{it.hot && <span className="if-hot">Most common</span>}</span>
                    <span className="if-intent-blurb">{it.blurb}</span>
                    <span className="if-intent-for">{it.forWho}</span>
                  </span>
                  <span className="if-intent-arrow"><Ic name="arrowRight" /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* v2: the proposal intent uses the guided 3-step wizard (with partial-lead
            capture). All other intents — and v1 sites — use the flat form below. */}
        {step === 'form' && intent && PROPOSAL_FORM_VERSION === 2 && intent.id === 'proposal' && (
          <ProposalWizard onBack={back} />
        )}

        {step === 'form' && intent && !(PROPOSAL_FORM_VERSION === 2 && intent.id === 'proposal') && (
          // Call-tracking (e.g. WhatConverts) tracks only the intents listed in
          // TRACKING.intents: those render the tracked id (TRACKING.formId); every
          // other intent gets id="intake-form" so the tracker ignores it. The key
          // forces a clean remount per intent for the tracker's form detection.
          <form
            key={intent.id}
            id={TRACKING.intents.includes(intent.id) ? TRACKING.formId : 'intake-form'}
            name={TRACKING.intents.includes(intent.id) ? TRACKING.formId : 'intake-form'}
            className="if-stage" onSubmit={submit} noValidate>
            {/* Honeypot — hidden from humans; bots that fill it get rejected by /api/lead */}
            <div className="if-hp" aria-hidden="true">
              <label>Leave this field empty
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
              </label>
            </div>
            <button type="button" className="if-back" onClick={back}><Ic name="arrowLeft" /> Change request type</button>
            <div className={`if-chosen tone-${intent.tone}`}>
              <span className="if-intent-icon"><Ic name={intent.icon} /></span>
              <span className="if-chosen-txt"><strong>{intent.label}</strong><span>{intent.blurb}</span></span>
            </div>
            <div className="if-grid">
              <Field def={{ key: 'name', label: 'Your name', type: 'text', required: true, placeholder: 'First & last', col: 2 }} value={contact.name} error={errors.name} onChange={setC} />
              <Field def={{ key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'you@email.com' }} value={contact.email} error={errors.email} onChange={setC} />
              <Field def={{ key: 'phone', label: 'Phone', type: 'text', placeholder: '(optional)' }} value={contact.phone} error={errors.phone} onChange={setC} />
              {(intent.fields || []).map((f) => (
                <Field key={f.key} def={f} value={fields[f.key]} error={errors[f.key]} onChange={setField} />
              ))}
              <div className="if-field" style={{ gridColumn: '1 / -1' }}>
                <div className={'if-float if-float-top' + (message ? ' has-value' : '') + (errors.message ? ' is-err' : '')}>
                  <textarea id="if-message" aria-label={intent.id === 'service' ? 'How can we help?' : 'Anything else?'} name={intent.id === 'service' ? 'How can we help?' : 'Message'} className="if-control if-textarea" rows={intent.id === 'general' ? 5 : 3}
                    placeholder=" "
                    value={message} onChange={(e) => { setMessage(e.target.value); setErrors((x) => ({ ...x, message: null })); }} />
                  <label className="if-flabel" htmlFor="if-message">{intent.id === 'service' ? 'How can we help?' : 'Anything else?'}{intent.id === 'service' && <span className="if-req">*</span>}</label>
                </div>
                {errors.message && <div className="if-err-msg">{errors.message}</div>}
              </div>
            </div>
            {sendError && <div className="if-senderror">{sendError}</div>}
            <div className="if-actions">
              <div className="if-trust"><Ic name="lock" /> Your details stay private. No spam, ever.</div>
              <button type="submit" className="if-submit" disabled={sending}>
                {sending ? 'Sending…' : intent.id === 'proposal' ? 'Request my proposal' : intent.id === 'service' ? 'Send request' : 'Send message'}
                {!sending && <Ic name="arrowRight" />}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && submission && (
          <div className="if-stage if-done">
            <div className="if-done-badge"><Ic name="check" /></div>
            <h2 className="if-title" style={{ marginTop: 14 }}>You’re all set, {submission.first}.</h2>
            <p className="if-sub">Your request is in — reference <strong style={{ color: 'var(--if-accent)' }}>{submission.id}</strong>. Expect to hear back within one business day.</p>
            <Receipt intent={intent} />
            <button type="button" className="if-restart" onClick={reset}>Submit another request</button>
          </div>
        )}
      </div>
    </div>
  );
}
