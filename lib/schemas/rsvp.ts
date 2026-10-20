import { z } from 'zod';

/** Mirror the CHECK constraints on `rsvps` (migration 0012). */
export const RSVP_LIMITS = { NAME_MAX: 80, PARTY_MAX: 10, NOTE_MAX: 500 } as const;

export const RSVP_MESSAGES = {
  CLOSED: 'Replies are not open for this invitation.',
  FAILED: 'We could not send your reply. Please try again.',
  INVALID: 'Please check your reply and try again.',
} as const;

export const RSVP_ATTENDING = { YES: 'yes', NO: 'no' } as const;

const SLUG_MAX = 200;

/** A blank optional field is stored as null, never as an empty string. */
const optionalNote = z
  .string()
  .trim()
  .max(RSVP_LIMITS.NOTE_MAX)
  .nullish()
  .transform((value) => value || null);

/** An absent or blank party size means one, so a decline needs no number. */
const partySize = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.coerce.number().int().min(1).max(RSVP_LIMITS.PARTY_MAX).default(1),
);

export const rsvpSubmissionSchema = z
  .object({
    slug: z.string().min(1).max(SLUG_MAX),
    name: z.string().trim().min(1).max(RSVP_LIMITS.NAME_MAX),
    attending: z
      .enum([RSVP_ATTENDING.YES, RSVP_ATTENDING.NO])
      .transform((value) => value === RSVP_ATTENDING.YES),
    partySize,
    dietaryNotes: optionalNote,
    message: optionalNote,
    /** Honeypot: real guests never see this field. */
    company: z.string().nullish(),
  })
  /* The DB requires party_size = 1 for a decline. */
  .transform((input) => ({ ...input, partySize: input.attending ? input.partySize : 1 }));

export type RsvpSubmission = z.infer<typeof rsvpSubmissionSchema>;

export type RsvpResult = { ok: true; attending: boolean } | { ok: false; message: string };
