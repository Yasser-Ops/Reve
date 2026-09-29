'use client';

import Image from 'next/image';
import { useCountdown } from '@/lib/hooks/useCountdown';

const UNITS = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
] as const;

/**
 * Jardin's countdown: four figures on one baseline over a drawn rose garland.
 *
 * NAMED FOR A FOUNTAIN IT NO LONGER DRAWS. The basin this began as could not
 * be made to read — see the note on the garland below — and the name is kept
 * only because it is the import site in `index.tsx` and renaming a component
 * to match an ornament is how the next ornament change earns a needless diff.
 * What the section is called on the page is "The Countdown", which is what it
 * has always actually been.
 *
 * Lin stands its numbers side by side like a departures board; Jardin hangs a
 * garland under them so the count belongs to the garden it sits in. The
 * numerals take the body serif, not the script: Pinyon Script has a single
 * weight and very fine hairlines, and a figure that changes every second in
 * that face flickers.
 */
/* No `accent`: the garland carries its own colour now that it is painted.
   The prop went with the drawn swag it tinted. */
export function FountainCount({
  eventDate,
  ink,
}: {
  eventDate: string;
  ink: string;
}) {
  const parts = useCountdown(eventDate);

  if (!parts) return null;

  return (
    /* `pb-24` reserves the PLATE'S OWN HEIGHT, which is the thing that has to
       be measured rather than assumed. A 1024x304 garland at 72% of a 390px
       column renders 83px tall; reserving the 40px that suited a drawn swag
       let the roses ride up over the labels. */
    <div className="relative mx-auto w-full max-w-md px-6 pb-24">
      {/*
        THE GARLAND IS PAINTED, NOT DRAWN — and the change is the diagnosis.

        Three arrangements of two concentric outlined ellipses failed here as
        a fountain basin: overlapping the row it read as a strike-through,
        separated from it as a stray oval, and no third position exists where
        thin outlines resolve into a basin. A basin reads through an INTERIOR
        it did not have. Rebuilt as a drawn swag of roses it was legible but
        thin — five-petal marks at a size where a painted rose has depth and a
        vector one has none.

        So it is a plate, in the hand of the arch and dusk scenes: heavy at
        both ends, delicate across the middle, keyed off its black ground to
        transparency so the paper shows through the gaps between stems.

        WHY A PLATE IS SAFE HERE AND WAS NOT UNDER THE NUMERALS. The earlier
        objection to painting this was contrast: a plate under four figures
        that change every second is a surface no measurement pins down. This
        one sits BELOW the row rather than behind it, so nothing is set over
        it and the objection does not apply.
      */}
      <Image
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-auto w-[72%]"
        height={304}
        src="/invitation/jardin/garland.webp"
        width={1024}
      />

      {/* No bottom padding: the container reserves the plate's height
          instead, so adding it here would double the gap. */}
      <ul
        className="relative flex justify-center gap-6 pt-14 md:gap-9"
        style={{
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}
      >
        {/*
          ONE BASELINE. No per-item offset.

          Two arrangements were tried and both read as four numbers that
          failed to line up, because that is what they were. The first dropped
          the outer pair 10px on the reasoning that a row following an ellipse
          dips at its ends; an ellipse does the opposite, so the second
          dropped the inner pair 6px to trace the near rim instead.

          The correction was right about the geometry and wrong about the
          premise. This basin is 27 units deep across 400 of width — far too
          shallow at the size it actually renders for a 6px step to read as
          CURVE. It reads as error. A drawn ellipse behind a row already
          places the row in the basin; the numerals do not have to bend to
          prove it, and four figures on one baseline are what a countdown is
          legible as. */}
        {UNITS.map((unit) => (
          <li key={unit.key} className="text-center">
            <p
              className="text-[2.6rem] leading-none"
              style={{
                color: ink,
                fontFamily: 'var(--font-jardin-body)',
                fontVariantNumeric: 'lining-nums tabular-nums',
              }}
            >
              {parts[unit.key]}
            </p>
            <p
              className="mt-2 text-[10px] uppercase tracking-[0.2em]"
              style={{ color: `${ink}99` }}
            >
              {unit.label}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
