// src/lib/roles.ts
// Is this step-1 role a homeowner rather than a board decision-maker? Partial
// proposals from residents are not pushed to Pipedrive (see /api/lead).
//
// Whole-word match only. The obvious /resident/ also matches "Board P-resident"
// and "Vice P-resident", which silently dropped every board president's
// partial from the CRM. Kept free of imports so the test script can load it
// under plain Node.
export function isResidentRole(role: string): boolean {
  return /\bresident\b/i.test(role);
}
