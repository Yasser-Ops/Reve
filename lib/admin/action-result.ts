import type { ContentIssue } from '@/lib/invitations/content';

/**
 * What every admin action returns. Expected failures come back as a message
 * for the form; only the unexpected throws, into the segment's error.tsx.
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; issues?: readonly ContentIssue[] };

export type FormAction = (
  previous: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export const UNEXPECTED = 'Something went wrong saving that. Try again.';
