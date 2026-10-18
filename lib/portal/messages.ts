/* What a client reads while reviewing a draft. Kept out of review-actions.ts:
   a 'use server' module may export only async functions. */

export const REVIEW_RULES = { NOTE_MAX: 1000 } as const;

export const REVIEW_MESSAGES = {
  NOTE_REQUIRED: 'Tell us what to change.',
  NOTE_TOO_LONG: `Keep your note under ${REVIEW_RULES.NOTE_MAX} characters.`,
  /* The insert policy refuses a snapshot that no longer matches the draft. */
  DRAFT_CHANGED: 'This draft just changed. Reload to see the latest.',
  THANKS_APPROVED: 'Thank you. We have your approval.',
  THANKS_CHANGES: 'Thank you. We will be in touch on WhatsApp.',
  LAST_APPROVED: 'You approved this invitation',
  LAST_CHANGES: 'You asked for changes',
  APPROVED_ON: 'You approved this on',
  CHANGES_ON: 'You asked for changes on',
  UPDATED_SINCE_APPROVAL: 'We updated your invitation since you approved it. Please look again.',
  WITHDRAW: 'Withdraw approval',
  /* Sent when a client withdraws without saying why: the action needs a note. */
  WITHDRAWN_NOTE: 'Approval withdrawn.',
  INCOMPLETE: 'Your invitation is still being set. Check back soon.',
} as const;
