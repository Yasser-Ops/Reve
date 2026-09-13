/**
 * The occasions Rêve designs for.
 *
 * These no longer own pages. Each is a section of a catalogue page, so an occasion
 * is a shelf in one catalogue rather than a landing page of its own: the copy
 * that used to carry a page now sits beside the designs it describes, and the
 * site has one route per idea instead of four routes for one product.
 *
 * `href` is where an occasion is reached. The catalogue is split in two —
 * formal work at /weddings, celebratory at /celebrations — so an occasion
 * points at its half, and at a section within it where that half holds more
 * than one. Weddings have no entry here because the home page carries that
 * pitch.
 */

export type EventEntry = {
  /** Identifier, and the collection section this occasion scrolls to. */
  slug: string;
  /** Where the occasion is reached: a section of the collection. */
  href: string;
  /** Nav and footer label. */
  label: string;
  /** Prefilled WhatsApp message for this occasion's calls to action. */
  startMessage: string;
};

export const EVENTS = [
  {
    slug: 'engagements',
    href: '/weddings#engagement',
    label: 'Engagements',
    startMessage:
      "Hello Rêve, I'd like to create an invitation for an engagement.",
  },
  {
    slug: 'birthdays',
    href: '/celebrations',
    label: 'Birthdays and anniversaries',
    startMessage:
      "Hello Rêve, I'd like to create an invitation for a birthday or anniversary.",
  },
] as const satisfies readonly EventEntry[];

export type EventSlug = (typeof EVENTS)[number]['slug'];

export function getEvent(slug: string): EventEntry | undefined {
  return EVENTS.find((event) => event.slug === slug);
}
