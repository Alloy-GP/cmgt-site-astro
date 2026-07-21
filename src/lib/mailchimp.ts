// src/lib/mailchimp.ts
// Upserts a contact into Mailchimp — ADD if new, UPDATE if they already exist.
// Used by every form route so a returning contact is never dropped with a
// "Member Exists" error (which the old addListMember call produced).
//
//   • No-op unless EMAIL_CONFIG.mailchimp.enabled (prod only).
//   • Never throws — a Mailchimp hiccup must not break a form submission.
//   • Existing members keep their current subscription status (we never
//     resurrect someone who unsubscribed); we only refresh their info + tags.
//   • Tags are applied on BOTH new and existing members.

import crypto from 'node:crypto';
import mailchimp from '@mailchimp/mailchimp_marketing';
import { EMAIL_CONFIG } from '~/lib/email.config';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  mailchimp.setConfig({
    apiKey: import.meta.env.MAILCHIMP_API_KEY,
    server: import.meta.env.MAILCHIMP_SERVER_PREFIX,
  });
  configured = true;
}

// Accept either env name (some Vercel projects use LIST_ID, others AUDIENCE_ID).
const listId = () => import.meta.env.MAILCHIMP_AUDIENCE_ID ?? import.meta.env.MAILCHIMP_LIST_ID;

interface MailchimpContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags?: string[];
}

export async function upsertMailchimpContact(contact: MailchimpContact): Promise<void> {
  if (!EMAIL_CONFIG.mailchimp.enabled) return;
  const email = (contact.email || '').trim();
  if (!email) return;

  try {
    ensureConfigured();
    const id = listId();
    // Mailchimp keys members by the MD5 of the lowercased email.
    const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

    // Only send merge fields we actually have, so an update never overwrites
    // existing Mailchimp data with blanks.
    const merge: Record<string, string> = {};
    if (contact.firstName) merge.FNAME = contact.firstName;
    if (contact.lastName)  merge.LNAME = contact.lastName;
    if (contact.company)   merge.COMPANY = contact.company;

    // PUT = add-or-update. `status_if_new` only applies when CREATING, so an
    // existing (or previously-unsubscribed) member keeps their current status.
    const base = { email_address: email, status_if_new: 'subscribed' as const };
    try {
      await mailchimp.lists.setListMember(id, hash, {
        ...base,
        ...(Object.keys(merge).length ? { merge_fields: merge } : {}),
      });
    } catch (err: any) {
      // A missing custom merge field (e.g. COMPANY not defined on the audience)
      // shouldn't stop the contact from landing — retry with the email only.
      console.error('Mailchimp upsert (with merge) failed, retrying minimal:', err?.response?.body ?? err);
      await mailchimp.lists.setListMember(id, hash, base);
    }

    // Tags go through the dedicated endpoint so they apply on both new AND
    // existing members (setListMember ignores tag changes for existing ones).
    const tags = (contact.tags || []).filter(Boolean);
    if (tags.length) {
      await mailchimp.lists.updateListMemberTags(id, hash, {
        tags: tags.map((name) => ({ name, status: 'active' })),
      });
    }
  } catch (err: any) {
    console.error('Mailchimp upsert error:', err?.response?.body ?? err);
  }
}
