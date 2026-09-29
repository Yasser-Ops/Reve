import { z } from 'zod';

const scheduleItemSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const galleryItemSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

const heroMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  src: z.string().min(1),
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
    ask: 'A line above your names, if you want one (for example "Together with their families")',
  }),
  message: z.string().optional().meta({ ask: 'A short message to your guests' }),
  schedule: z
    .array(scheduleItemSchema)
    .default([])
    .meta({ ask: 'The order of the evening: each moment and its time' }),
  gallery: z.array(galleryItemSchema).default([]).meta({
    ask: 'Photos for the gallery, sent on WhatsApp as documents so they keep full quality',
  }),
  heroMedia: heroMediaSchema.optional().meta({
    ask: 'A photo or short video for the opening screen, sent as a document',
  }),
  registryMessage: z.string().optional().meta({
    ask: 'A note about gifts or bank details, if you want one',
  }),
} as const;
