'use client';

import Link from 'next/link';

/**
 * Segment error boundary for the collection.
 *
 * The page renders live templates, so a fault in any one of them would
 * otherwise take the whole route down with a blank screen. This keeps the way
 * out visible and offers the one thing that always works: a message to a human.
 */
export default function TemplatesError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center bg-bone px-6 text-center text-ink">
      <div>
        <p className="reve-eyebrow text-cocoa">Something went wrong</p>

        <h1 className="reve-display mt-6 text-4xl">
          The collection did not load
        </h1>

        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-cocoa">
          Try again, and if it keeps happening, message us and we will send you
          the designs directly.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            className="reve-crisp rounded-full bg-wine px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="reve-crisp rounded-full border border-taupe px-7 py-3 text-[12px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
            href="/"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
