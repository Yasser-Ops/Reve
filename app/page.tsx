import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroEnvelope } from '@/components/store/HeroEnvelope';

export const metadata: Metadata = {
  title: 'Rêve — Digital wedding invitations',
  description:
    'A live invitation page with your own link, RSVP collection, and a guest list. Designed by hand, delivered on WhatsApp.',
};

const TIERS = [
  {
    name: 'Basic',
    price: '$50',
    summary: 'A live invitation page at your own link.',
    includes: [
      'Your own web address',
      'Animated envelope and wax seal',
      'Countdown to the day',
      'Photo gallery',
      'Share on WhatsApp',
    ],
    cta: 'Start with Basic',
    href: '/templates',
    featured: false,
  },
  {
    name: 'Managed',
    price: '$100',
    summary: 'Everything in Basic, plus replies you can actually track.',
    includes: [
      'Everything in Basic',
      'RSVP collection',
      'Guest list with headcount',
      'Private dashboard link',
      'Export your list',
    ],
    cta: 'Start with Managed',
    href: '/templates',
    featured: true,
  },
  {
    name: 'Custom',
    price: '$200',
    summary: 'A design made for you, from scratch.',
    includes: [
      'Everything in Managed',
      'Original art direction',
      'Your colours and typography',
      'Direct line to the designer',
      'Unlimited revisions',
    ],
    cta: 'Talk to us',
    href: '/custom',
    featured: false,
  },
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
    title: 'We build it, you approve',
    body: 'Your invitation arrives as a link, ready to share with everyone.',
  },
];

export default function HomePage() {
  return (
    <main className="bg-bone text-ink">
      {/* The envelope is the product's first three seconds, so it opens the
          page too: the hero sells the moment a guest taps the seal. */}
      <section className="px-6 pb-24 pt-16 md:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-[1.05fr_0.95fr] md:gap-20">
          <div className="text-center md:text-start">
            <p className="reve-eyebrow text-cocoa">Digital wedding invitations</p>

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
                href="/templates"
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
          </div>

          <HeroEnvelope />
        </div>
      </section>

      {/* Numbered because the order genuinely matters: each step waits on the
          one before it. */}
      <section className="border-t border-taupe/40 bg-sand px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="reve-eyebrow text-cocoa">How it works</p>

          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <p className="reve-display text-[13px] tracking-[0.2em] text-wine">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="reve-display mt-4 text-2xl">{step.title}</h2>
                <p className="mt-3 text-[14px] leading-relaxed text-cocoa">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-24">
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
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 ${
                  tier.featured
                    ? 'border-wine bg-sand'
                    : 'border-taupe/50 bg-transparent'
                }`}
              >
                {tier.featured ? (
                  <p className="reve-crisp absolute -top-3 start-8 rounded-full bg-wine px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-bone">
                    Most chosen
                  </p>
                ) : null}

                <h3 className="reve-display text-2xl">{tier.name}</h3>

                <p className="reve-numeral mt-4 text-4xl text-ink">{tier.price}</p>

                <p className="mt-4 min-h-12 text-[14px] leading-relaxed text-cocoa">
                  {tier.summary}
                </p>

                <ul className="mt-7 space-y-2.5 border-t border-taupe/40 pt-7">
                  {tier.includes.map((item) => (
                    <li key={item} className="text-[13.5px] text-cocoa">
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  className={`reve-crisp mt-8 block rounded-full px-6 py-3 text-center text-[12px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine ${
                    tier.featured
                      ? 'bg-wine text-bone hover:bg-wine-deep'
                      : 'border border-taupe text-ink hover:bg-sand'
                  }`}
                  href={tier.href}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-taupe/40 px-6 py-14">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <p className="reve-display text-xl">Rêve</p>
          <p className="text-[12.5px] text-cocoa">
            Designed by hand. Delivered on WhatsApp.
          </p>
        </div>
      </footer>
    </main>
  );
}
