/**
 * The occasions Rêve designs for.
 *
 * Single source of truth for every event-specific surface: landing page copy,
 * metadata, JSON-LD, and the prefilled WhatsApp message that starts an order.
 * Adding an occasion is a new entry here plus a slug in generateStaticParams,
 * not a new page build.
 *
 * Weddings deliberately have no entry. The home page IS the wedding page: it
 * carries that copy, ranks for those terms, and a /weddings route would only
 * compete with it for the same queries.
 */

/**
 * How loudly an occasion is sold.
 *
 * `lead` occasions share the wedding art direction and are promoted in the
 * footer's main list. `secondary` ones are real, and answered honestly where
 * people look for them, but are kept out of the main pitch so they do not
 * dilute it.
 */
export const EVENT_PROMINENCE = {
  LEAD: 'lead',
  SECONDARY: 'secondary',
} as const;

export type EventProminence =
  (typeof EVENT_PROMINENCE)[keyof typeof EVENT_PROMINENCE];

export type EventEntry = {
  /** URL segment. The page lives at /{slug}. */
  slug: string;
  /** Nav and footer label. */
  label: string;
  /** Page title, without the brand suffix the root template appends. */
  title: string;
  /** Meta description and the page's own standfirst. */
  description: string;
  /** Eyebrow above the hero heading. */
  eyebrow: string;
  /** Hero heading. The final word is set in italic accent by the template. */
  heading: string;
  /** Emphasised final word of the heading. */
  headingAccent: string;
  /** Opening paragraph. */
  intro: string;
  /** What this occasion needs that the others do not. */
  points: readonly { title: string; body: string }[];
  /** Prefilled WhatsApp message for this occasion's calls to action. */
  startMessage: string;
  prominence: EventProminence;
};

export const EVENTS = [
  {
    slug: 'engagements',
    label: 'Engagements',
    title: 'Digital engagement invitations',
    description:
      'A live invitation page for your engagement, at your own link. Guests tap the seal, the envelope opens, and everything they need is there. Designed by hand in English and Arabic.',
    eyebrow: 'Digital engagement invitations · Lebanon',
    heading: 'Before the wedding, there is this',
    headingAccent: 'this',
    intro:
      'An engagement deserves its own invitation, not a wedding card with the words swapped. We design it the same way we design the wedding: by hand, at your own link, with the same envelope your guests will open again months later.',
    points: [
      {
        title: 'A shorter guest list',
        body: 'Engagements are smaller. The invitation is built for one room, not a hall.',
      },
      {
        title: 'The same hand, twice',
        body: 'Come back for the wedding and we design it to match. Your two invitations will look like a pair.',
      },
      {
        title: 'Replies you can count',
        body: 'The RSVP and the guest list work exactly as they do for a wedding.',
      },
      {
        title: 'English and Arabic',
        body: 'Including bilingual invitations where the wording appears in both.',
      },
    ],
    startMessage: "Hello Rêve, I'd like to create an engagement invitation.",
    prominence: EVENT_PROMINENCE.LEAD,
  },
  {
    slug: 'birthdays',
    label: 'Birthdays and anniversaries',
    title: 'Digital birthday and anniversary invitations',
    description:
      'A live invitation page for a birthday or an anniversary, at your own link. The same craft we bring to weddings, in a register that suits the evening.',
    eyebrow: 'Birthdays and anniversaries · Lebanon',
    heading: 'For the evenings that are not weddings',
    headingAccent: 'weddings',
    intro:
      'Most of what we design is for weddings and engagements, and we will say so plainly. But the same thing that makes those invitations work, a real page at a real link that opens like an envelope, works just as well for a fortieth birthday or a thirtieth anniversary.',
    points: [
      {
        title: 'A lighter hand',
        body: 'The formality dials down. Same craft, a register that suits the evening.',
      },
      {
        title: 'Milestones especially',
        body: 'The birthdays and anniversaries people actually send invitations for.',
      },
      {
        title: 'Headcount that holds',
        body: 'RSVP and guest list, so you know what to tell the restaurant.',
      },
      {
        title: 'One link, forwarded',
        body: 'Sent on WhatsApp, opened on any phone, no app and no account.',
      },
    ],
    startMessage:
      "Hello Rêve, I'd like to create an invitation for a birthday or anniversary.",
    prominence: EVENT_PROMINENCE.SECONDARY,
  },
] as const satisfies readonly EventEntry[];

export type EventSlug = (typeof EVENTS)[number]['slug'];

export function getEvent(slug: string): EventEntry | undefined {
  return EVENTS.find((event) => event.slug === slug);
}

export const LEAD_EVENTS = EVENTS.filter(
  (event) => event.prominence === EVENT_PROMINENCE.LEAD,
);
