import Link from 'next/link';
import { EVENTS } from '@/lib/events';

/**
 * Reached when a URL names an occasion Rêve does not design for.
 *
 * Rather than a dead end, it lists the occasions that do exist, since someone
 * here was looking for something specific and may still find it.
 */
export default function EventNotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center bg-bone px-6 text-center text-ink">
      <div>
        <p className="reve-eyebrow text-cocoa">Not found</p>

        <h1 className="reve-display mt-6 text-4xl">
          We do not have a page for that
        </h1>

        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-cocoa">
          Weddings are on the home page. These are the others we design for.
          If yours is not here, ask us anyway.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="reve-crisp rounded-full bg-wine px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
            href="/"
          >
            Weddings
          </Link>

          {EVENTS.map((event) => (
            <Link
              className="reve-crisp rounded-full border border-taupe px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href={`/${event.slug}`}
              key={event.slug}
            >
              {event.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
