import { z } from 'zod';
import type { MediaKind } from '@/lib/admin/media-paths';

/*
 * Every field a design draws carries an `ask`: the plain-language line the
 * operator sends a client to collect it. `checklistFor` refuses a top-level
 * field without one. Every field, nested ones included, also carries a
 * `label` for the admin's content form; `formModel` refuses one without it.
 * Declared on zod's global metadata so `.meta()` is typed at every call site.
 */
declare module 'zod' {
  interface GlobalMeta {
    ask?: string;
    /** The editor's label for the field. */
    label?: string;
    /** Show as a multi-line box. */
    multiline?: boolean;
    /** The field holds an uploaded file of this kind; the editor offers the uploads. */
    media?: MediaKind;
  }
}

export const venueSchema = z.object({
  name: z.string().min(1).meta({ label: 'Venue name' }),
  addressLine: z.string().min(1).meta({ label: 'Address' }),
  mapUrl: z.url().optional().meta({ label: 'Google Maps link' }),
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
    .meta({ label: 'First name', ask: 'The first name, exactly as it should be written' }),
  couplePartnerName: z
    .string()
    .min(1)
    .meta({ label: 'Second name', ask: 'The second name, exactly as it should be written' }),
  initials: z
    .string()
    .min(2)
    .max(4)
    .meta({ label: 'Initials', ask: 'The initials for the wax seal, two to four letters' }),
  eventDate: z.iso
    .datetime()
    .meta({ label: 'Date and arrival time', ask: 'The date, and the time guests should arrive' }),
  venue: venueSchema.meta({
    label: 'Venue', ask: 'The venue name, its address, and a Google Maps link',
  }),
});

export type CoreContent = z.infer<typeof coreContentSchema>;

/** Any design's schema: an object that carries at least the core. */
export type DesignSchema = z.ZodObject & z.ZodType<CoreContent>;
