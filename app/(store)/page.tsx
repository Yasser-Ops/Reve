import type { Metadata } from 'next';
import Link from 'next/link';
import { CapBlanc } from '@/components/invitation/templates/cap-blanc';
import { Nuit } from '@/components/invitation/templates/nuit';
import { FaqList, type FaqItem } from '@/components/store/FaqList';
import { HeroEnvelope } from '@/components/store/HeroEnvelope';
import { InvitationDemo } from '@/components/store/InvitationDemo';
import { PhoneFrame } from '@/components/store/PhoneFrame';
import { Reveal } from '@/components/store/Reveal';
import { RsvpPanel } from '@/components/store/RsvpPanel';
import { TemplateCompare } from '@/components/store/TemplateCompare';
import { TemplateThumbnail } from '@/components/store/TemplateThumbnail';
import { WhatsappThread } from '@/components/store/WhatsappThread';
import { CONTACT, whatsappLink } from '@/lib/contact';
import { EVENTS } from '@/lib/events';
import { OFFER_TIERS } from '@/lib/offer';
import {
  SAMPLE_CONTENT,
  SAMPLE_ENTITLEMENTS,
  SAMPLE_THEME,
} from '@/lib/sample-invitation';

export const metadata: Metadata = {
  // Absolute, so the root layout's "%s · Rêve" template does not append the
  // brand name to a title that already carries it.
  title: { absolute: 'Rêve — Digital wedding invitations in Lebanon' },
  description:
    'A live invitation page with your own link, RSVP collection, and a guest list. Designed by hand in English and Arabic for weddings and engagements, delivered on WhatsApp.',
  alternates: { canonical: '/' },
};

const START_MESSAGE = "Hello Rêve, I'd like to create a wedding invitation.";


/* ---------------------------------------------------------------------------
 * Content
 *
 * Everything here is true today. Rêve is pre-launch, so the page earns trust
 * through craft and transparency — a live demo anyone can open, a named
 * process, a real phone number — rather than review counts it has not earned.
 * ------------------------------------------------------------------------- */

const TRUST_POINTS = [
  'Designed by hand, never generated',
  'English and Arabic',
  'A real person on WhatsApp',
];

/*
 * The rest of what an invitation carries.
 *
 * Deliberately excludes the envelope, the RSVP, the guest list, and WhatsApp
 * sharing: each of those has a section of its own that shows the thing
 * working, and listing them here as well made the page say everything twice.
 * If a feature earns a demonstration, it comes out of this list.
 */
const INCLUDED = [
  { title: 'Your own link', body: 'reve.lb/your-names, yours alone.' },
  { title: 'Countdown', body: 'Counts down to the hour of the ceremony.' },
  { title: 'Photo gallery', body: 'Your photographs, full width.' },
  { title: 'Venue and map', body: 'Directions in one tap.' },
  { title: 'Schedule', body: 'Ceremony, dinner, and everything after.' },
  { title: 'Works everywhere', body: 'Any phone, any browser, no app.' },
];

const STEPS = [
  {
    title: 'Choose a design',
    body: 'Browse the collection and pick the one that feels like your day.',
  },
  {
    title: 'Send us your details',
    body: 'Names, date, venue, photos. A message on WhatsApp is enough.',
  },
  {
    title: 'We design it',
    body: 'We build your invitation and send it back for you to review.',
  },
  {
    title: 'Share your link',
    body: 'Approve it, and send the link to everyone you are inviting.',
  },
];

const QUESTIONS: FaqItem[] = [
  {
    question: 'How long does it take?',
    answer:
      'Two days for a design from the collection. The artwork is already drawn, so there is no design phase to wait through — we set your details into it and send you the link. A Custom design is drawn from scratch and takes longer; we agree the timing with you before you pay. If your date is close, tell us on WhatsApp and we will say honestly whether we can meet it.',
  },
  {
    question: 'How do I pay?',
    answer:
      'Through Whish. You send us your details, we confirm the design and the price, and you transfer. We start once the payment lands. There is no card form on this site.',
  },
  {
    question: 'Can I change something after it is live?',
    answer:
      'Yes. Send us the change on WhatsApp and we will update the page. The link stays the same, so anything you have already shared keeps working.',
  },
  {
    question: 'Do you only do weddings?',
    answer:
      'Weddings and engagements are most of what we do, and what the collection is designed around. We also take birthdays and anniversaries, in a lighter register that suits the evening. If you are planning something else, ask, and we will tell you honestly whether we are the right studio for it.',
  },
  {
    question: 'Do you design in Arabic?',
    answer:
      'Yes. We work in English and Arabic, including bilingual invitations where the wording appears in both. Arabic calligraphy is available on the Custom tier.',
  },
  {
    question: 'What do you need from me?',
    answer:
      'Both names, the date and time, the venue with its address, and any photographs you want included. Anything else — a schedule, a dress code, directions — is welcome but optional.',
  },
  {
    question: 'How do guests reply?',
    answer:
      'On the Managed and Custom tiers there is an RSVP form inside the invitation. Guests fill it in on the page, and you see every reply in a private dashboard we send you.',
  },
  {
    question: 'How long does the page stay online?',
    answer:
      'Through your wedding and well past it. We keep invitations online as a keepsake, and we will tell you before anything changes.',
  },
  {
    question: 'Do guests need an app or an account?',
    answer:
      'No. They tap the link, the envelope opens, and the invitation is there. It works on any phone with a browser.',
  },
  {
    question: 'Can I see one before I buy?',
    answer:
      'Yes, and you should. There is a live example on this page — open it on your phone, tap the seal, and see exactly what your guests would receive.',
  },
  {
    question: 'What if I do not like the design?',
    answer:
      'We revise it. You see the invitation before it goes anywhere, and we keep working on it until it is right. Nothing is shared with your guests until you approve it.',
  },
];

/* Placeholder testimonials. Rêve has not delivered invitations yet, so these
 * are clearly marked as examples rather than presented as real reviews.
 * Replace with genuine quotes, with permission, once couples have been served. */
const TESTIMONIAL_PLACEHOLDERS = 3;

export default function HomePage() {
  return (
    <main className="bg-bone text-ink">
      {/* Hero */}
      <section className="px-6 pb-20 pt-10 md:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-[1.05fr_0.95fr] md:gap-20">
          <div className="text-center md:text-start">
            <p className="reve-eyebrow text-cocoa">
              Digital wedding invitations · Lebanon
            </p>

            <h1 className="reve-display mt-7 text-5xl md:text-6xl lg:text-7xl">
              The invitation is the first thing they
              <span
                className="ms-3 text-wine"
                style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
              >
                feel
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-cocoa md:mx-0">
              A live page at your own link. Guests tap the seal, the envelope
              opens, and everything they need is there. You see every reply as
              it arrives.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link
                className="reve-crisp rounded-full bg-wine px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
                href="/collection"
              >
                See the collection
              </Link>
              <Link
                className="reve-crisp rounded-full border border-taupe px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
                href="/i/sarah-and-amine"
              >
                Open a live example
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
              {TRUST_POINTS.map((point) => (
                <li
                  className="reve-crisp text-[12px] text-cocoa before:me-2 before:text-wine before:content-['·']"
                  key={point}
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <HeroEnvelope />
        </div>
      </section>

      {/* Live demo. For a studio with no reviews yet, the product itself is
          the strongest argument available. */}
      <section className="border-y border-taupe/40 bg-ink px-6 py-20 text-bone">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2">
          <Reveal>
  <div>
              <p className="reve-eyebrow text-taupe">See it for yourself</p>
              <h2 className="reve-display mt-6 text-4xl md:text-5xl">
                Do not take our word for it
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-sand">
                What you are watching is the whole thing: the seal tapped, the
                envelope opening, the invitation scrolled through. That is
                exactly what lands in your guests&apos; hands, and you can open
                the real one on your own phone right now.
              </p>

              <Link
                className="reve-crisp mt-9 inline-block rounded-full bg-bone px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
                href="/i/sarah-and-amine"
              >
                Open the live invitation
              </Link>
            </div>

          </Reveal>
          <PhoneFrame>
            <InvitationDemo />
          </PhoneFrame>
        </div>
      </section>

      {/* Design comparison. Both halves are the real templates rendered from
          one content object, so the seam separates art direction from data. */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2 md:gap-20">
          <Reveal>
            <div>
              <p className="reve-eyebrow text-cocoa">The same wedding</p>
              <h2 className="reve-display mt-6 text-4xl md:text-5xl">
                Your details, in a
                <span
                  className="ms-3 text-wine"
                  style={{
                    fontFamily: 'var(--font-accent)',
                    fontStyle: 'italic',
                  }}
                >
                  different hand
                </span>
              </h2>
              <p className="mt-7 max-w-md text-[15px] leading-relaxed text-cocoa">
                Drag the divider. Both sides carry the same names, the same
                date, the same venue and the same schedule. What changes is the
                design around them.
              </p>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-cocoa">
                Choosing a design never changes what your invitation says, and
                it never changes the price. Every design is available on every
                tier.
              </p>

              <Link
                className="reve-crisp mt-9 inline-block rounded-full border border-taupe px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
                href="/collection"
              >
                See all designs
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <TemplateCompare
              base={
                <TemplateThumbnail>
                  <CapBlanc
                    content={SAMPLE_CONTENT}
                    entitlements={SAMPLE_ENTITLEMENTS}
                    theme={SAMPLE_THEME}
                  />
                </TemplateThumbnail>
              }
              baseLabel="Cap Blanc"
              overlay={
                <TemplateThumbnail>
                  <Nuit
                    content={SAMPLE_CONTENT}
                    entitlements={SAMPLE_ENTITLEMENTS}
                    theme={SAMPLE_THEME}
                  />
                </TemplateThumbnail>
              }
              overlayLabel="Nuit"
            />
          </Reveal>
        </div>
      </section>

      {/* How it arrives. The site says "built to be forwarded" in several
          places; this is the only one that shows it. */}
      <section className="border-t border-taupe/40 bg-sand px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2 md:gap-20">
          <Reveal>
            <div>
              <p className="reve-eyebrow text-cocoa">How it arrives</p>

              <h2 className="reve-display mt-6 text-balance text-4xl md:text-5xl">
                One link, endlessly
                <span
                  className="ms-3 text-wine"
                  style={{
                    fontFamily: 'var(--font-accent)',
                    fontStyle: 'italic',
                  }}
                >
                  forwarded
                </span>
              </h2>

              <p className="mt-7 max-w-md text-[15px] leading-relaxed text-cocoa">
                You send the link once. It carries your names and the envelope
                with it, so every guest who receives it sees the invitation
                before they even tap.
              </p>

              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-cocoa">
                Nothing to download, no account to make, and no attachment to
                lose. Guests forward it to their own families, and it keeps
                working.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <WhatsappThread />
          </Reveal>
        </div>
      </section>

      {/* And what comes back. Pairs with the block above: that one sends the
          invitation out, this one is the replies arriving. Reversed on desktop
          so the two sections do not read as one column of identical layouts. */}
      <section className="border-t border-taupe/40 px-6 py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2 md:gap-20">
          <Reveal>
            <div className="md:order-2">
              <p className="reve-eyebrow text-cocoa">And what comes back</p>

              <h2 className="reve-display mt-6 text-balance text-4xl md:text-5xl">
                You stop counting on
                <span
                  className="ms-3 text-wine"
                  style={{
                    fontFamily: 'var(--font-accent)',
                    fontStyle: 'italic',
                  }}
                >
                  paper
                </span>
              </h2>

              <p className="mt-7 max-w-md text-[15px] leading-relaxed text-cocoa">
                Guests reply inside the invitation itself. You get a private
                link showing every answer as it lands, who is bringing whom, and
                a headcount that adds itself up.
              </p>

              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-cocoa">
                Dietary notes and messages arrive with the reply, so the number
                you give the venue is one you can trust. Export the list to
                Excel whenever you need it.
              </p>

              <p className="reve-crisp mt-7 text-[12.5px] text-taupe">
                Included on Managed and Custom.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="md:order-1">
              <RsvpPanel />
            </div>
          </Reveal>
        </div>
      </section>

      {/* What is included */}
      <section className="border-t border-taupe/40 bg-sand px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
  <div className="text-center">
              <p className="reve-eyebrow text-cocoa">In every invitation</p>
              <h2 className="reve-display mt-6 text-4xl md:text-5xl">
                And everything else the day needs
              </h2>
            </div>

          </Reveal>
          <ul className="mt-14 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map((feature) => (
              <li
                className="group border-t border-taupe/40 pt-5 transition-transform duration-300 hover:-translate-y-1"
                key={feature.title}
              >
                <h3 className="reve-display text-lg transition-colors duration-300 group-hover:text-wine">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-cocoa">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works. Numbered because the order genuinely matters: each step
          waits on the one before it. */}
      <section
        className="border-t border-taupe/40 px-6 py-20"
        id="how-it-works"
      >
        <div className="mx-auto max-w-5xl">
          <Reveal>
  <p className="reve-eyebrow text-cocoa">How it works</p>
            <h2 className="reve-display mt-6 max-w-xl text-4xl md:text-5xl">
              Four steps, and one of them is ours
            </h2>

          </Reveal>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Reveal delay={index * 90} key={step.title}>
                <li>
                <p className="reve-display text-[13px] tracking-[0.2em] text-wine">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="reve-display mt-4 text-2xl">{step.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-cocoa">
                  {step.body}
                </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Studio note. Being small and new is stated plainly and turned into
          the reason to choose Rêve rather than something to hide. */}
      <section className="px-6 py-24" id="studio">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="reve-eyebrow text-cocoa">Who you are talking to</p>
            <h2 className="reve-display mt-6 text-4xl">A small studio</h2>
          </div>

          <div>
            <p className="text-[16px] leading-relaxed text-ink">
              Rêve is a small team in Lebanon. We are new, and we would rather
              say so than invent a number of weddings we have not designed.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-cocoa">
              What that means for you: every invitation is drawn by a person,
              not produced by a template filler. You message a human on
              WhatsApp, and the same person designs your page. We work in
              English and Arabic, and we would rather make something specific to
              your family than sell you a generic card.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-cocoa">
              Because we are starting out, our first couples get more of our
              attention than anyone who comes later. That is the trade.
            </p>

            <a
              className="reve-crisp mt-8 inline-block rounded-full border border-taupe px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href={CONTACT.instagramUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              See our work on Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Other occasions. Deliberately quiet and placed low: weddings are the
          pitch, and this exists so the answer to "do you do anything else" is
          findable rather than prominent. */}
      <section className="border-t border-taupe/40 px-6 py-16">
        <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-6">
          <div>
            <p className="reve-eyebrow text-cocoa">Not a wedding</p>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-cocoa">
              We design for engagements in the same hand, and for birthdays and
              anniversaries in a lighter one.
            </p>
          </div>

          <ul className="flex flex-wrap gap-3">
            {EVENTS.map((event) => (
              <li key={event.slug}>
                <Link
                  className="reve-crisp inline-block rounded-full border border-taupe px-6 py-2.5 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
                  href={`/${event.slug}`}
                >
                  {event.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials — placeholders, clearly marked. */}
      <section className="border-y border-taupe/40 bg-sand px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="reve-eyebrow text-cocoa">Couples</p>
          <h2 className="reve-display mt-6 max-w-xl text-4xl md:text-5xl">
            The first words here will be real ones
          </h2>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-cocoa">
            We have not designed enough weddings to fill this section honestly
            yet. When we have, the couples&apos; own words go here, with their
            permission.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {Array.from({ length: TESTIMONIAL_PLACEHOLDERS }).map((_, index) => (
              <div
                className="rounded-2xl border border-dashed border-taupe/70 p-7"
                key={index}
              >
                <div className="space-y-2.5" aria-hidden="true">
                  <div className="h-2.5 w-full rounded-full bg-taupe/30" />
                  <div className="h-2.5 w-11/12 rounded-full bg-taupe/30" />
                  <div className="h-2.5 w-8/12 rounded-full bg-taupe/30" />
                </div>
                <p className="reve-eyebrow mt-7 text-[10px] text-taupe">
                  Reserved for a real couple
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24" id="pricing">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="reve-eyebrow text-cocoa">Pricing</p>
            <h2 className="reve-display mt-6 text-4xl md:text-5xl">
              One payment, one invitation
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-cocoa">
              No subscription. You pay once for the day you are planning.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {OFFER_TIERS.map((tier, index) => (
              <Reveal delay={index * 110} key={tier.name}>
              <div
                className={`relative rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1.5 ${
                  tier.featured
                    ? 'border-wine bg-sand shadow-[0_18px_40px_-24px_rgba(111,34,51,0.5)]'
                    : 'border-taupe/50 bg-transparent hover:border-taupe'
                }`}
              >
                {tier.featured ? (
                  <p className="reve-crisp absolute -top-3 start-8 rounded-full bg-wine px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-bone">
                    Most chosen
                  </p>
                ) : null}

                <h3 className="reve-display text-2xl">{tier.name}</h3>

                <p className="reve-numeral mt-4 text-4xl text-ink">
                  {tier.price}
                </p>

                <p className="mt-4 min-h-12 text-[14px] leading-relaxed text-cocoa">
                  {tier.summary}
                </p>

                <ul className="mt-7 space-y-2.5 border-t border-taupe/40 pt-7">
                  {tier.includes.map((item) => (
                    <li className="text-[13.5px] text-cocoa" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>

                <a
                  className={`reve-crisp mt-8 block rounded-full px-6 py-3 text-center text-[12px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine ${
                    tier.featured
                      ? 'bg-wine text-bone hover:bg-wine-deep'
                      : 'border border-taupe text-ink hover:bg-sand'
                  }`}
                  href={whatsappLink(
                    `Hello Rêve, I'm interested in the ${tier.name} invitation (${tier.price}).`,
                  )}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {tier.cta}
                </a>
              </div>
              </Reveal>
            ))}
          </div>

          <p className="mt-10 text-center text-[13px] text-cocoa">
            Payment by Whish. We confirm your details on WhatsApp before
            anything is due.
          </p>
        </div>
      </section>

      {/* Questions */}
      <section
        className="border-t border-taupe/40 px-6 py-24"
        id="questions"
      >
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="reve-eyebrow text-cocoa">Questions</p>
            <h2 className="reve-display mt-6 text-4xl">
              Everything couples ask
            </h2>
            <p className="mt-6 text-[14px] leading-relaxed text-cocoa">
              If yours is not here, message us. We answer honestly, including
              when the answer is no.
            </p>
          </div>

          <FaqList items={QUESTIONS} />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-ink px-6 py-24 text-bone">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="reve-display text-4xl md:text-5xl">
            Start with a message
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-sand">
            Tell us the names and the date. We will tell you what we can make,
            what it costs, and how long it takes. No form, no account.
          </p>

          <a
            className="reve-crisp mt-10 inline-block rounded-full bg-wine px-9 py-4 text-[13px] uppercase tracking-[0.16em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
            href={whatsappLink(START_MESSAGE)}
            rel="noreferrer noopener"
            target="_blank"
          >
            Message us on WhatsApp
          </a>

          <p className="mt-5 text-[13px] text-taupe">
            {CONTACT.whatsappNumber}
          </p>
        </div>
      </section>
    </main>
  );
}
