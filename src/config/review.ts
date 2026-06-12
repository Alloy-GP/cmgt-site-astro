// src/config/review.ts
// Source of truth for the Alloy Preview Review widget (stg only).
//
//   PASTEL_BASE  — fixed Pastel share link for this client. Set once. (trailing # required)
//   TICKET_ID    — rewritten by Claude at the start of each review session.
//   REVIEW_ITEMS — every reviewable page. Only items with review:true appear in the
//                  widget; if none are true the widget is hidden entirely.
//
// Paths must match exactly, including the trailing slash. Pages start at review:false
// so the widget stays hidden until the first real review session.

export const PASTEL_BASE = ''; // ← add the Pastel share link once the project is created
export const TICKET_ID   = '';

export interface ReviewItem {
  label: string;
  path: string;
  review: boolean;
}

export const REVIEW_ITEMS: ReviewItem[] = [
  { label: 'Homepage', path: '/', review: false },
];
