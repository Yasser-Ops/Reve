import { z } from 'zod';

export const entitlementsSchema = z.object({
  rsvp: z.boolean().default(false),
  portal: z.boolean().default(false),
  gallery: z.boolean().default(false),
});

export type Entitlements = z.infer<typeof entitlementsSchema>;

export const themeSchema = z.object({
  palette: z.string().min(1).default('default'),
  motion: z.enum(['full', 'reduced']).default('full'),
});

export type Theme = z.infer<typeof themeSchema>;
