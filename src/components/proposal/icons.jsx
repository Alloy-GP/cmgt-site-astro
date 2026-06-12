/* eslint-disable */
import React from 'react';

// Icon set — Lucide-style line icons + simple destination marks.
export function FIcon({ name, size = 24, color = "currentColor", strokeWidth = 1.6, style = {} }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "building": return <svg {...p}><path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M15 21V9h3a1 1 0 0 1 1 1v11"/><path d="M8 7h2M8 11h2M8 15h2"/></svg>;
    case "home": return <svg {...p}><path d="M3 10.4 12 3l9 7.4"/><path d="M5.6 8.9V19a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V8.9"/><path d="M9.7 20v-5.2a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1V20"/></svg>;
    case "hardhat": return <svg {...p}><path d="M3.5 17a8.5 8.5 0 0 1 17 0z"/><path d="M2.5 17h19"/><path d="M9.6 8.4V6.5A2.4 2.4 0 0 1 12 4.1a2.4 2.4 0 0 1 2.4 2.4v1.9"/></svg>;
    case "wrench": return <svg {...p}><path d="M15.4 6.6a3.8 3.8 0 0 1-4.8 4.8l-5.3 5.3a1.6 1.6 0 0 0 2.3 2.3l5.3-5.3a3.8 3.8 0 0 0 4.8-4.8l-2.3 2.3-2-.3-.3-2z"/></svg>;
    case "chat": return <svg {...p}><path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.1A7.5 7.5 0 1 1 20 11.5z"/><circle cx="8.6" cy="11.6" r=".7" fill={color} stroke="none"/><circle cx="12" cy="11.6" r=".7" fill={color} stroke="none"/><circle cx="15.4" cy="11.6" r=".7" fill={color} stroke="none"/></svg>;
    case "mail": return <svg {...p}><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>;
    case "arrow-right": return <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    case "arrow-left": return <svg {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
    case "check": return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case "check-circle": return <svg {...p}><circle cx="12" cy="12" r="9"/><polyline points="16 9.5 11 15 8 12"/></svg>;
    case "shield": return <svg {...p}><path d="M12 3 5 6v6c0 4 3 7 7 8 4-1 7-4 7-8V6z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg>;
    case "lock": return <svg {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>;
    case "zap": return <svg {...p}><polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2"/></svg>;
    case "spark": return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>;
    case "code": return <svg {...p}><polyline points="9 8 5 12 9 16"/><polyline points="15 8 19 12 15 16"/></svg>;
    case "layers": return <svg {...p}><polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 13 12 18 21 13"/></svg>;
    case "users": return <svg {...p}><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="8" r="3.2"/><path d="M19.5 19v-1.4a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3.2 3.2 0 0 1 0 5.6"/></svg>;
    default: return null;
  }
}

// Destination marks — uniform CMGT line icons (single Freedom-Blue stroke,
// matching the rest of the form). No third-party brand logos.
const DEST_ICON = {
  email: "users",
  mailchimp: "mail",
  sheets: "layers",
  whatconverts: "spark",
};
export function DestMark({ id, size = 20 }) {
  return <FIcon name={DEST_ICON[id] || "check-circle"} size={size} color="var(--brand)" strokeWidth={1.7} />;
}
