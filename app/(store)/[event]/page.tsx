import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/store/Reveal';
import { whatsappLink } from '@/lib/contact';
import { EVENTS, getEvent } from '@/lib/events';

/**
 * Landing page for one occasion.
 *
 * Every occasion renders through this single template, driven entirely by
 * lib/events.ts, so a new event type is a data entry rather than a new page.
 * Weddings are not routed here on purpose: the home page carries that copy
 * and a /weddings route would compete with it for the same queries.
 *
 * Fully static. The set of occasions is known at build time, so both pages
 * ship as HTML with their JSON-LD on the initial response.
 */

type Params = { event: string };

export function generateStaticParams(): Params[] {
  return EVENTS.map((event) => ({ event: event.slug }));
}

/** No occasion outside the registry exists, so anything else is a 404. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { event: slug } = await params;
  const event = getEvent(slug);

  if (!event) return {};

  return {
    title: event.title,
    description: event.description,
    alternates: { canonical: `/${event.slug}` },
    openGraph: {
      title: `${event.title} · Rêve`,
      description: event.description,
      type: 'website',
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { event: slug } = await params;
  const event = getEvent(slug);

  if (!event) notFound();

  const start = whatsappLink(event.startMessage);

  /* Service rather than Product: nothing here is bought from a shelf, and the
     price varies by tier, so a fixed offer would misdescribe it. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: event.title,
    description: event.description,
    provider: {
      '@type': 'Organization',
      name: 'Rêve',
      url: 'https://reve.lb',
    },
    areaServed: { '@type': 'Country', name: 'Lebanon' },
    availableLanguage: ['en', 'ar'],
  };

  return (
    <main className="bg-bone text-ink">
      <script
        type="application/ld+json"
        // Content is authored in lib/events.ts, never user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="px-6 pb-16 pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="reve-eyebrow text-cocoa">{event.eyebrow}</p>

          <h1 className="reve-display mt-7 text-5xl md:text-6xl">
            {event.heading.slice(
              0,
              event.heading.lastIndexOf(event.headingAccent),
            )}
            <span
              className="text-wine"
              style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
            >
              {event.headingAccent}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-cocoa">
            {event.intro}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              className="reve-crisp rounded-full bg-wine px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href={start}
              rel="noreferrer noopener"
              target="_blank"
            >
              Start yours
            </a>
            <Link
              className="reve-crisp rounded-full border border-taupe px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href="/i/sarah-and-amine"
            >
              Open a live example
            </Link>
          </div>
        </div>
      </section>

      {/* What this occasion needs */}
      <section className="border-t border-taupe/40 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <ul className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
            {event.points.map((point, index) => (
              <Reveal delay={index * 90} key={point.title}>
                <li className="border-t border-taupe/40 pt-5">
                  <h2 className="reve-display text-lg">{point.title}</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-cocoa">
                    {point.body}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Everything else is identical across occasions, so this page does not
          restate it. It points at the pages that already say it well. */}
      <section className="border-t border-taupe/40 bg-sand px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="reve-display text-3xl md:text-4xl">
            The rest works the same way
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-cocoa">
            The envelope, your own link, the countdown, the gallery, the RSVP
            and the guest list are the same whatever you are celebrating. So is
            the pricing, and so are the four steps to get there.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="reve-crisp rounded-full border border-taupe px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href="/#how-it-works"
            >
              How it works
            </Link>
            <Link
              className="reve-crisp rounded-full border border-taupe px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href="/#pricing"
            >
              See pricing
            </Link>
            <Link
              className="reve-crisp rounded-full border border-taupe px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href="/#questions"
            >
              Questions
            </Link>
          </div>
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
            href={start}
            rel="noreferrer noopener"
            target="_blank"
          >
            Message us on WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
