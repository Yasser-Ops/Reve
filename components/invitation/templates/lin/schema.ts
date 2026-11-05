import type { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { coreContentSchema } from '@/lib/schemas/content/core';

/**
 * Lin draws the core and the shared blocks it shows. No `message`: the
 * approved mock's opening screen carries only the headline and the names.
 */
export const linContentSchema = coreContentSchema.extend({
  headline: BLOCKS.headline,
  schedule: BLOCKS.schedule,
  gallery: BLOCKS.gallery,
  heroMedia: BLOCKS.heroMedia,
  registryMessage: BLOCKS.registryMessage,
});

export type LinContent = z.infer<typeof linContentSchema>;
