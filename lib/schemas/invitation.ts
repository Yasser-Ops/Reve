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

const venueSchema = z.object({
  name: z.string().min(1),
  addressLine: z.string().min(1),
  mapUrl: z.url().optional(),
});

const scheduleItemSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const galleryItemSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

export const invitationContentSchema = z.object({
  coupleFirstName: z.string().min(1),
  couplePartnerName: z.string().min(1),
  initials: z.string().min(2).max(4),
  eventDate: z.iso.datetime(),
  headline: z.string().optional(),
  message: z.string().optional(),
  venue: venueSchema,
  schedule: z.array(scheduleItemSchema).default([]),
  gallery: z.array(galleryItemSchema).default([]),
});

export type InvitationContent = z.infer<typeof invitationContentSchema>;
