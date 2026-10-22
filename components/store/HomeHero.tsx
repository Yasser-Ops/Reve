import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackCta } from '@/lib/analytics';
import { DELIVERY, ENTRY_TIER } from '@/lib/offer';
import { LIVE_EXAMPLE_PATH } from '@/lib/site';

/* Jardin's own dusk scene, so the painting behind the phone is the world the
   invitation inside it is drawn in. */
const BACKDROP = '/invitation/jardin/dusk.webp';

/* The lanterns in the painting, borrowed for the glow behind the phone. */
const LANTERN_RGB = '243 168 107';

/* Shade in the painting's own wine-dark rather than grey, so darkening the
   scene deepens its colour instead of washing it out. */
const DUSK_RGB = '34 14 22';

const shade = (alpha: number) => `rgb(${DUSK_RGB} / ${alpha})`;

/**
 * The home page's opening: the dusk painting edge to edge, with the real
 * invitation standing in it.
 *
 * It runs up under the nav (pulled up by --reve-nav-h), and SiteNav answers by
 * switching to light type while it sits over the picture.
 *
 * Shade is laid only where type sits: the left for the words, a band along the
 * top for the nav, and the foot. The right half keeps the painting's own sky
 * and lantern light, which is what the phone stands against.
 *
 * The phone is the live product (`phone`), not a drawing of it. It is the only
 * thing in the hero that moves, and only when tapped.
 */
export function HomeHero({ phone }: { phone: ReactNode }) {
  return (
    <section className="relative isolate -mt-(--reve-nav-h) overflow-hidden bg-ink text-bone">
      <Image
        alt=""
        className="-z-20 object-cover object-[50%_70%]"
        fetchPriority="high"
        fill
        sizes="100vw"
        src={BACKDROP}
      />

      {/* On a phone the crop is a narrow slice through the arch, with a bright
          band of sky down its middle, so the words get an even shade from top
          to bottom instead. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 md:hidden"
        style={{
          background: `linear-gradient(180deg, ${shade(0.8)} 0%, ${shade(0.62)} 55%, ${shade(0.85)} 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden md:block"
        style={{
          background: [
            `linear-gradient(90deg, ${shade(0.9)} 0%, ${shade(0.74)} 30%, ${shade(0.34)} 52%, transparent 68%)`,
            `linear-gradient(180deg, ${shade(0.6)} 0%, transparent 22%)`,
            `linear-gradient(0deg, ${shade(0.65)} 0%, transparent 32%)`,
          ].join(', '),
        }}
      />

      <div className="mx-auto grid min-h-svh max-w-6xl items-center gap-14 px-6 pb-20 pt-[calc(var(--reve-nav-h)+3rem)] md:grid-cols-[1fr_auto] md:gap-10 md:px-12 lg:gap-20">
        <div className="max-w-2xl text-center md:text-start">
          <h1
            className="reve-display text-balance text-[2.75rem] leading-[1.04] md:text-6xl lg:text-[4.5rem]"
            style={{ textShadow: `0 2px 28px ${shade(0.5)}` }}
          >
            An invitation your guests open like a letter
          </h1>

          <p className="mx-auto mt-8 max-w-md text-[16px] leading-relaxed text-bone/90 md:mx-0">
            A live page at your own link, designed by hand in English and
            Arabic. Guests tap the seal, the envelope opens, and you see every
            reply as it arrives.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:justify-start">
            <Link
              className="reve-crisp rounded-full bg-bone px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              href="/weddings"
              {...trackCta('hero', 'collection')}
            >
              See the collection
            </Link>
            <Link
              className="reve-crisp text-[14px] text-bone underline decoration-bone/40 underline-offset-[6px] transition-colors hover:decoration-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              href={LIVE_EXAMPLE_PATH}
              {...trackCta('hero', 'live_example')}
            >
              Open a live example
            </Link>
          </div>

          {/* Price quoted from the offer so it cannot drift from the pricing
              table. Delivery rides with it: it is the reason to act now. */}
          <p className="reve-crisp mt-8 text-[13px] text-bone/80">
            From{' '}
            <span className="reve-numeral text-[15px] text-bone">
              {ENTRY_TIER.price}
            </span>
            , {DELIVERY.headline.toLowerCase()}.{' '}
            <Link
              className="text-bone underline decoration-bone/40 underline-offset-4 hover:decoration-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              href="/#pricing"
            >
              See what is included
            </Link>
          </p>
        </div>

        <div className="relative mx-auto w-[min(78vw,300px)]">
          <div
            aria-hidden="true"
            className="absolute -inset-16 -z-10 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(closest-side, rgb(${LANTERN_RGB} / 0.42), transparent)`,
            }}
          />

          {phone}

          {/* A note in the margin, not a label: the one instruction a visitor
              needs, set in the invitation's own italic. */}
          <p
            className="mt-5 text-center text-[22px] leading-none text-bone md:absolute md:-start-40 md:top-[46%] md:mt-0 md:w-32 md:text-end lg:-start-44"
            style={{
              fontFamily: 'var(--font-accent)',
              fontStyle: 'italic',
              textShadow: `0 1px 12px ${shade(0.6)}`,
            }}
          >
            Tap the seal
            <svg
              aria-hidden="true"
              className="ms-auto mt-2 hidden h-6 w-14 text-bone/80 md:block"
              fill="none"
              viewBox="0 0 56 24"
            >
              <path
                d="M2 4c14 0 26 4 34 12m0 0-1-8m1 8-8 1"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
            </svg>
          </p>
        </div>
      </div>

      <p className="reve-crisp absolute inset-x-0 bottom-6 hidden text-center text-[12px] text-bone/70 md:block">
        Digital wedding invitations, designed in Lebanon
      </p>
    </section>
  );
}
