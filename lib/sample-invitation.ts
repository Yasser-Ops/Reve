import {
  entitlementsSchema,
  invitationContentSchema,
  themeSchema,
} from '@/lib/schemas/invitation';

/**
 * One wedding, used to demonstrate every template.
 *
 * The storefront's comparison claims that choosing a design changes how your
 * invitation looks and nothing about what it says. That claim is only honest
 * if both sides are rendered from a single content object, so this is it:
 * parsed through the same schema a real invitation is, so a schema change
 * breaks the sample rather than letting the marketing drift from the product.
 *
 * The couple matches the live example the storefront links to, so a visitor
 * comparing designs and then opening the real invitation sees the same names.
 */
export const SAMPLE_CONTENT = invitationContentSchema.parse({
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  /* Must stay in the future: the Countdown primitive correctly renders
     nothing once a date has passed, so a stale sample would quietly leave a
     gap in every preview on the storefront. */
  eventDate: '2027-07-12T16:30:00.000Z',
  headline: 'Together with their families',
  message:
    'We would be honoured to have you with us as we marry, and for the evening that follows.',
  venue: {
    name: 'Beit Al Qamar',
    addressLine: 'Broumana, Mount Lebanon',
  },
  schedule: [
    { time: '4:30', title: 'Ceremony' },
    { time: '6:00', title: 'Cocktails', description: 'On the terrace' },
    { time: '8:00', title: 'Dinner and dancing' },
  ],
  gallery: [],
});

export const SAMPLE_THEME = themeSchema.parse({});

/* Gallery off: the sample carries no photographs, and an empty gallery would
   render an empty band on both sides of the comparison. */
export const SAMPLE_ENTITLEMENTS = entitlementsSchema.parse({
  rsvp: true,
  portal: false,
  gallery: false,
});
