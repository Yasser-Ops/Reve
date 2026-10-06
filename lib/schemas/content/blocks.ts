import { z } from 'zod';

const scheduleItemSchema = z.object({
  time: z.string().min(1).meta({ label: 'Time' }),
  title: z.string().min(1).meta({ label: 'Moment' }),
  description: z.string().optional().meta({ label: 'Detail' }),
});

const galleryItemSchema = z.object({
  src: z.string().min(1).meta({ label: 'Photo', media: 'photos' }),
  alt: z.string().min(1).meta({ label: 'Description' }),
});

const heroMediaSchema = z.object({
  type: z.enum(['image', 'video']).meta({ label: 'Type' }),
  src: z.string().min(1).meta({ label: 'File', media: 'hero' }),
});

export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

/**
 * Ready-made content a design may draw. A design lists the blocks it uses in
 * its own schema; it never inherits one it did not ask for.
 *
 * KEYS ARE PERMANENT. Stored invitations are keyed by these names, so a block
 * may gain optional fields but is never renamed.
 */
export const BLOCKS = {
  headline: z.string().optional().meta({
    label: 'Headline',
    ask: 'A line above your names, if you want one (for example "Together with their families")',
  }),
  message: z
    .string()
    .optional()
    .meta({ label: 'Message', multiline: true, ask: 'A short message to your guests' }),
  schedule: z
    .array(scheduleItemSchema)
    .default([])
    .meta({ label: 'Schedule', ask: 'The order of the evening: each moment and its time' }),
  gallery: z.array(galleryItemSchema).default([]).meta({
    label: 'Gallery',
    ask: 'Photos for the gallery, sent on WhatsApp as documents so they keep full quality',
  }),
  heroMedia: heroMediaSchema.optional().meta({
    label: 'Opening photo or video',
    ask: 'A photo or short video for the opening screen, sent as a document',
  }),
  registryMessage: z.string().optional().meta({
    label: 'Gifts note',
    multiline: true,
    ask: 'A note about gifts or bank details, if you want one',
  }),
} as const;
