import type { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { coreContentSchema } from '@/lib/schemas/content/core';

/** Jardin draws the core and every shared block. It has no fields of its own yet. */
export const jardinContentSchema = coreContentSchema.extend({
  headline: BLOCKS.headline,
  message: BLOCKS.message,
  schedule: BLOCKS.schedule,
  gallery: BLOCKS.gallery,
  heroMedia: BLOCKS.heroMedia,
  registryMessage: BLOCKS.registryMessage,
});

export type JardinContent = z.infer<typeof jardinContentSchema>;
