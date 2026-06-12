/* eslint-disable */
/* =================================================================
   CMGT Intake — data layer (adapted from Alloy Intake handoff)
   Canonical field keys preserved; copy + routing tuned for CMGT.
   ================================================================= */

export const DESTINATIONS = {
  email: {
    id: "email",
    name: "Team email",
    sub: "Smart routing by intent + community",
    icon: "mail",
    color: "var(--brand)",
  },
  mailchimp: {
    id: "mailchimp",
    name: "Mailchimp",
    sub: "Audience + tag for nurture",
    icon: "mailchimp",
    color: "#ffe01b",
    ink: "#1a1a1a",
  },
  sheets: {
    id: "sheets",
    name: "Google Sheets",
    sub: "Master log — one row per lead",
    icon: "sheets",
    color: "#188038",
  },
  whatconverts: {
    id: "whatconverts",
    name: "WhatConverts",
    sub: "Attribution + sales lead",
    icon: "whatconverts",
    color: "#1f6fde",
  },
};

export const INTENTS = [
  {
    id: "proposal",
    label: "Request a proposal",
    blurb: "We're a board exploring new management.",
    forWho: "Boards & volunteer leaders",
    icon: "home",
    accent: "var(--c-pink)",
    accentTint: "var(--c-pink-tint)",
    hot: true,
    fields: [
      { key: "association", label: "Association / community name", type: "text", required: true, placeholder: "e.g. Lakeshore HOA", col: 2 },
      { key: "units", label: "Number of homes", type: "select", required: true, options: ["1–50", "51–150", "151–400", "400+"] },
      { key: "propertyType", label: "Community type", type: "select", required: true, options: ["Single-family HOA", "Condominium", "Townhome", "Master-planned", "Developer-controlled"] },
      { key: "situation", label: "Current situation", type: "select", required: true, options: ["Self-managed today", "Unhappy with current manager", "Contract ending soon", "Just exploring"], col: 2 },
      { key: "timeline", label: "Decision timeline", type: "radio", required: true, options: ["ASAP", "1–3 months", "Just researching"], col: 2 },
    ],
    routes: [
      { dest: "email", detail: "→ sales@cmgt.org · auto-assigned to the rep for your region", primary: true },
      { dest: "whatconverts", detail: "Logged as a sales-qualified lead with full attribution" },
      { dest: "mailchimp", detail: "Prospects audience · tag “proposal-request”" },
      { dest: "sheets", detail: "Master log + “Proposals” tab" },
    ],
  },
  {
    id: "vendor",
    label: "Submit a bid",
    blurb: "I'm a vendor who wants to work with you.",
    forWho: "Contractors & service vendors",
    icon: "hardhat",
    accent: "var(--c-blue)",
    accentTint: "var(--c-blue-tint)",
    fields: [
      { key: "company", label: "Company name", type: "text", required: true, placeholder: "e.g. Bayou Landscaping", col: 2 },
      { key: "trade", label: "Trade / service", type: "select", required: true, options: ["Landscaping", "Roofing", "Paving & concrete", "Pool service", "Janitorial", "Plumbing", "Electrical", "Other"] },
      { key: "serviceArea", label: "Service area", type: "text", required: true, placeholder: "e.g. Greater Baton Rouge" },
      { key: "insured", label: "Licensed & insured?", type: "radio", required: true, options: ["Yes", "In progress"], col: 2 },
    ],
    routes: [
      { dest: "email", detail: "→ vendors@cmgt.org · procurement inbox", primary: true },
      { dest: "sheets", detail: "Master log + “Vendor directory” tab" },
    ],
  },
  {
    id: "service",
    label: "Service request",
    blurb: "I'm a homeowner and need something handled.",
    forWho: "Homeowners",
    icon: "wrench",
    accent: "var(--c-green)",
    accentTint: "var(--c-green-tint)",
    fields: [
      { key: "association", label: "Community name", type: "text", required: true, placeholder: "e.g. Lakeshore", col: 2 },
      { key: "unit", label: "Unit / address", type: "text", required: true, placeholder: "e.g. 204B" },
      { key: "category", label: "What's the issue?", type: "select", required: true, options: ["Common area", "Landscaping", "Plumbing / water", "Gate / access", "Billing / account", "Other"] },
      { key: "urgency", label: "Urgency", type: "radio", required: true, options: ["Routine", "Urgent", "Emergency"], col: 2 },
    ],
    routes: [
      { dest: "email", detail: "→ ops@cmgt.org · routed to your community's CAM", primary: true },
      { dest: "sheets", detail: "Master log + “Service log” tab" },
    ],
  },
  {
    id: "general",
    label: "General question",
    blurb: "Something else — just reaching out.",
    forWho: "Anyone",
    icon: "chat",
    accent: "var(--c-yellow)",
    accentTint: "var(--c-yellow-tint)",
    fields: [],
    routes: [
      { dest: "email", detail: "→ hello@cmgt.org · front-desk inbox", primary: true },
      { dest: "mailchimp", detail: "Newsletter audience · tag “general”" },
      { dest: "sheets", detail: "Master log + “Inbox” tab" },
    ],
  },
];

export function intentById(id) { return INTENTS.find(i => i.id === id); }
