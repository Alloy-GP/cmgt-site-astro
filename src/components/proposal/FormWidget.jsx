/* eslint-disable */
// ---------------------------------------------------------------------------
// FormWidget — CMGT adaptation of the Alloy Intake widget (handoff port).
// Adds `startIntent` so the proposal page opens with that intent pre-picked;
// the "Change request type" back link still exposes all four intents.
// ---------------------------------------------------------------------------
import React, { useState, useRef, useEffect } from 'react';
import { FIcon, DestMark } from './icons.jsx';
import { DESTINATIONS, INTENTS, intentById } from './intake-data.js';
import './intake.css';

function genId() {
  const d = new Date();
  const s = d.toISOString().slice(2, 10).replace(/-/g, "");
  return "REQ-" + s + "-" + Math.floor(1000 + Math.random() * 9000);
}

function Field({ def, value, error, onChange }) {
  const span = def.col === 2 ? "1 / -1" : "auto";
  return (
    <div className="ai-field" style={{ gridColumn: span }}>
      <label className="ai-label">
        {def.label}{def.required && <span className="ai-req">*</span>}
      </label>
      {def.type === "text" && (
        <input className={"ai-control" + (error ? " ai-err" : "")} type="text"
          placeholder={def.placeholder || ""} value={value || ""}
          onChange={(e) => onChange(def.key, e.target.value)} />
      )}
      {def.type === "select" && (
        <div className={"ai-select-wrap" + (error ? " ai-err" : "")}>
          <select className="ai-control ai-select" value={value || ""}
            onChange={(e) => onChange(def.key, e.target.value)}>
            <option value="" disabled>Select…</option>
            {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <svg className="ai-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      )}
      {def.type === "radio" && (
        <div className="ai-segmented" role="radiogroup">
          {def.options.map((o) => (
            <button type="button" key={o}
              className={"ai-seg" + (value === o ? " on" : "")}
              onClick={() => onChange(def.key, o)}>{o}</button>
          ))}
        </div>
      )}
      {error && <div className="ai-err-msg">{error}</div>}
    </div>
  );
}

function IntentCard({ intent, onPick }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" className="ai-intent-card"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onPick(intent.id)}
      style={{ borderColor: hover ? intent.accent : "var(--ai-border)",
               boxShadow: hover ? "var(--ai-shadow-md)" : "var(--ai-shadow-sm)",
               transform: hover ? "translateY(-2px)" : "none" }}>
      <span className="ai-intent-icon" style={{ background: intent.accentTint, color: intent.accent }}>
        <FIcon name={intent.icon} size={24} strokeWidth={1.7} />
      </span>
      <span className="ai-intent-body">
        <span className="ai-intent-label">
          {intent.label}
          {intent.hot && <span className="ai-hot">Most common</span>}
        </span>
        <span className="ai-intent-blurb">{intent.blurb}</span>
        <span className="ai-intent-for">{intent.forWho}</span>
      </span>
      <span className="ai-intent-arrow" style={{ color: hover ? intent.accent : "var(--ai-muted)" }}>
        <FIcon name="arrow-right" size={18} strokeWidth={2} />
      </span>
    </button>
  );
}

function RoutingReceipt({ intent }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const timers = intent.routes.map((_, i) => setTimeout(() => setShown((s) => Math.max(s, i + 1)), 280 + i * 360));
    return () => timers.forEach(clearTimeout);
  }, [intent.id]);
  return (
    <div className="ai-receipt">
      <div className="ai-receipt-head">
        <FIcon name="zap" size={15} color="var(--brand)" strokeWidth={2} />
        <span>Routed the moment you hit send</span>
      </div>
      <ul className="ai-receipt-list">
        {intent.routes.map((r, i) => {
          const d = DESTINATIONS[r.dest];
          const on = i < shown;
          return (
            <li key={r.dest} className={"ai-receipt-row" + (on ? " on" : "")}>
              <span className="ai-receipt-check"><FIcon name="check" size={13} color="#fff" strokeWidth={3} /></span>
              <span className="ai-receipt-mark"><DestMark id={d.id} size={20} /></span>
              <span className="ai-receipt-txt">
                <strong>{d.name}</strong>
                <span>{r.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function FormWidget({ clientName = "CMGT", startIntent = null, onSubmit = null }) {
  const [step, setStep] = useState(startIntent ? "form" : "intent");
  const [intentId, setIntentId] = useState(startIntent);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [fields, setFields] = useState({});
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [submission, setSubmission] = useState(null);
  const topRef = useRef(null);

  const intent = intentId ? intentById(intentId) : null;

  function pick(id) {
    setIntentId(id);
    setFields({});
    setErrors({});
    setStep("form");
  }
  function back() { setStep("intent"); setErrors({}); }

  function setField(k, v) { setFields((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); }
  function setC(k, v) { setContact((c) => ({ ...c, [k]: v })); setErrors((e) => ({ ...e, [k]: null })); }

  function validate() {
    const e = {};
    if (!contact.name.trim()) e.name = "Required";
    if (!contact.email.trim()) e.email = "Required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) e.email = "Enter a valid email";
    intent.fields.forEach((f) => { if (f.required && !fields[f.key]) e[f.key] = "Required"; });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    const sub = {
      id: genId(),
      clientName,
      intent: intent.id,
      intentLabel: intent.label,
      submittedAt: new Date().toISOString(),
      contact: { ...contact },
      fields: { ...fields },
      message: message.trim(),
      routes: intent.routes.map((r) => r.dest),
    };
    setSubmission(sub);
    // TODO: wire to real endpoint (CRM/email/serverless)
    onSubmit && onSubmit(sub);
    setStep("done");
  }

  function reset() {
    setStep(startIntent ? "form" : "intent");
    setIntentId(startIntent);
    setContact({ name: "", email: "", phone: "" });
    setFields({}); setMessage(""); setErrors({}); setSubmission(null);
  }

  return (
    <div className="ai-widget" ref={topRef}>
      <div className="ai-accentbar"></div>
      <div className="ai-widget-inner">
        {step === "intent" && (
          <div className="ai-stage" key="intent">
            <div className="ai-eyebrow">Get in touch</div>
            <h2 className="ai-title">How can we help?</h2>
            <p className="ai-sub">Pick what fits — we'll only ask what we need, then make sure the right person sees it fast.</p>
            <div className="ai-intent-grid">
              {INTENTS.map((it) => <IntentCard key={it.id} intent={it} onPick={pick} />)}
            </div>
          </div>
        )}

        {step === "form" && intent && (
          <form className="ai-stage" key="form" onSubmit={submit} noValidate>
            <button type="button" className="ai-back" onClick={back}>
              <FIcon name="arrow-left" size={15} strokeWidth={2} /> Change request type
            </button>
            <div className="ai-chosen" style={{ borderColor: intent.accent }}>
              <span className="ai-chosen-icon" style={{ background: intent.accentTint, color: intent.accent }}>
                <FIcon name={intent.icon} size={20} strokeWidth={1.8} />
              </span>
              <span className="ai-chosen-txt"><strong>{intent.label}</strong><span>{intent.blurb}</span></span>
            </div>

            <div className="ai-grid">
              <Field def={{ key: "name", label: "Your name", type: "text", required: true, placeholder: "First & last", col: 2 }}
                value={contact.name} error={errors.name} onChange={setC} />
              <Field def={{ key: "email", label: "Email", type: "text", required: true, placeholder: "you@email.com" }}
                value={contact.email} error={errors.email} onChange={setC} />
              <Field def={{ key: "phone", label: "Phone", type: "text", placeholder: "(optional)" }}
                value={contact.phone} error={errors.phone} onChange={setC} />
              {intent.fields.map((f) => (
                <Field key={f.key} def={f} value={fields[f.key]} error={errors[f.key]} onChange={setField} />
              ))}
              <div className="ai-field" style={{ gridColumn: "1 / -1" }}>
                <label className="ai-label">{intent.id === "service" ? "Describe the issue" : "Anything else?"}{intent.id === "service" && <span className="ai-req">*</span>}</label>
                <textarea className="ai-control ai-textarea" rows={intent.id === "general" ? 5 : 3}
                  placeholder={intent.id === "general" ? "Tell us what's on your mind…" : "A sentence or two helps us route this faster."}
                  value={message} onChange={(e) => setMessage(e.target.value)}></textarea>
              </div>
            </div>

            <div className="ai-actions">
              <div className="ai-trust"><FIcon name="lock" size={13} strokeWidth={1.8} /> Your details stay private. No spam, ever.</div>
              <button type="submit" className="ai-submit">
                {intent.id === "proposal" ? "Request my proposal" : intent.id === "vendor" ? "Submit bid" : intent.id === "service" ? "Send request" : "Send message"}
                <FIcon name="arrow-right" size={16} strokeWidth={2.2} />
              </button>
            </div>
          </form>
        )}

        {step === "done" && submission && (
          <div className="ai-stage ai-done" key="done">
            <div className="ai-done-badge"><FIcon name="check" size={30} color="#fff" strokeWidth={3} /></div>
            <h2 className="ai-title" style={{ marginTop: 14 }}>You're all set, {submission.contact.name.split(" ")[0]}.</h2>
            <p className="ai-sub">Your request is in — reference <strong style={{ color: "var(--brand)" }}>{submission.id}</strong>. A real person will reach out within one business day.</p>
            <RoutingReceipt intent={intent} />
            <button type="button" className="ai-restart" onClick={reset}>Submit another request</button>
          </div>
        )}
      </div>
    </div>
  );
}
