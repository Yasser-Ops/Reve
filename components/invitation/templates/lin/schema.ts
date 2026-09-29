import type { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { coreContentSchema } from '@/lib/schemas/content/core';

/** Lin draws the core and every shared block. It has no fields of its own. */
export const linContentSchema = coreContentSchema.extend({
  headline: BLOCKS.headline,
  message: BLOCKS.message,
  schedule: BLOCKS.schedule,
  gallery: BLOCKS.gallery,
  heroMedia: BLOCKS.heroMedia,
  registryMessage: BLOCKS.registryMessage,
});

export type LinContent = z.infer<typeof linContentSchema>;
