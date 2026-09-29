import { z } from 'zod';

/*
 * Every field a design draws carries an `ask`: the plain-language line the
 * operator sends a client to collect it. Declared on zod's global metadata so
 * `.meta({ ask })` is typed at every call site. `checklistFor` refuses a
 * field without one.
 */
declare module 'zod' {
  interface GlobalMeta {
    ask?: string;
  }
}

export const venueSchema = z.object({
  name: z.string().min(1),
  addressLine: z.string().min(1),
  mapUrl: z.url().optional(),
});

/**
 * What exists for EVERY design, and is read outside any one of them: the
 * envelope's initials, the portal header, link previews, RSVP.
 *
 * Everything else is a design's own business. A design composes its schema
 * as `coreContentSchema.extend({ ...blocks it draws, ...fields of its own })`.
 */
export const coreContentSchema = z.object({
  coupleFirstName: z
    .string()
    .min(1)
    .meta({ ask: 'The first name, exactly as it should be written' }),
  couplePartnerName: z
    .string()
    .min(1)
    .meta({ ask: 'The second name, exactly as it should be written' }),
  initials: z
    .string()
    .min(2)
    .max(4)
    .meta({ ask: 'The initials for the wax seal, two to four letters' }),
  eventDate: z.iso
    .datetime()
    .meta({ ask: 'The date, and the time guests should arrive' }),
  venue: venueSchema.meta({
    ask: 'The venue name, its address, and a Google Maps link',
  }),
});

export type CoreContent = z.infer<typeof coreContentSchema>;

/** Any design's schema: an object that carries at least the core. */
export type DesignSchema = z.ZodObject & z.ZodType<CoreContent>;
