'use client';

import Link from 'next/link';

/**
 * Segment error boundary for the occasion landing pages.
 *
 * These pages are static and read only from lib/events.ts, so reaching this
 * is genuinely unexpected. It offers the way back rather than pretending to
 * diagnose something it cannot see.
 */
export default function EventError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center bg-bone px-6 text-center text-ink">
      <div>
        <p className="reve-eyebrow text-cocoa">Something went wrong</p>

        <h1 className="reve-display mt-6 text-4xl">This page did not load</h1>

        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-cocoa">
          Try again, and if it keeps happening, message us. Everything we
          design is still reachable from the home page.
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
