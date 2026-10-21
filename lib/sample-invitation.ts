import { BLOCKS } from '@/lib/schemas/content/blocks';
import { coreContentSchema } from '@/lib/schemas/content/core';
import { entitlementsSchema, themeSchema } from '@/lib/schemas/invitation';

/* Core plus every shared block: the sample must carry whatever any design
   draws, and each design's own schema then takes only its part. */
const sampleContentSchema = coreContentSchema.extend(BLOCKS);

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
export const SAMPLE_CONTENT = sampleContentSchema.parse({
  coupleFirstName: 'Malik',
  couplePartnerName: 'Sara',
  initials: 'MS',
  /* Must stay in the future: the Countdown primitive correctly renders
     nothing once a date has passed, so a stale sample would quietly leave a
     gap in every preview on the storefront. */
  eventDate: '2027-05-27T18:30:00.000Z',
  headline: 'Welcome to the Wedding of',
  message:
    'We would be honoured to have you with us as we marry, and for the evening that follows.',
  venue: {
    name: 'Beit Al Qamar',
    addressLine: 'Broumana, Mount Lebanon',
  },
  /* The couple's running order. '6:30' and 'Buffet opening' correct evident
     typos in the client's reference file ('6:300', 'Openning'); confirm with
     them before this goes live. */
  schedule: [
    { time: '6:30 pm', title: 'Arrival of guests' },
    { time: '7:00 pm', title: 'Entrance of groom & bride' },
    { time: '7:30 pm', title: 'Buffet opening' },
    { time: '8:30 pm', title: 'Dance time' },
    { time: '9:00 pm', title: 'End of evening' },
  ],
  gallery: [],
  /* No heroMedia: a hero video is a couple's own footage, uploaded per
     invitation. The sample shows each design's plain ground instead. */
  registryMessage:
    'We are so happy to celebrate this day with you. Your presence means the most to us, however, for those who wish to honor us with a gift, our bank details are below. Thank you for being part of our beautiful journey.',
});

export const SAMPLE_THEME = themeSchema.parse({});

/* Gallery off: the sample carries no photographs, and an empty gallery would
   render an empty band on both sides of the comparison. */
export const SAMPLE_ENTITLEMENTS = entitlementsSchema.parse({
  rsvp: true,
  portal: false,
  gallery: false,
});
