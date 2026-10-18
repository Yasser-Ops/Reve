import type { CSSProperties, ReactNode } from 'react';
import { frameAspect, getEnvelope } from '@/lib/envelopes';

/** The design page's phone width, and the default everywhere else. */
export const PHONE_MAX_WIDTH = 300;

/*
 * THE SCREEN IS THE SHAPE OF THE ENVELOPE RENDER. Every envelope is drawn on
 * the same tall frame, and the frames fill the screen with `object-fit:
 * cover`, so a screen of any other shape crops the envelope's top and foot.
 * Fixed here rather than per caller, so no preview can draw a shorter, wider
 * phone than the design page does.
 */
export const PHONE_SCREEN_ASPECT = frameAspect(getEnvelope(undefined).frames);

type PhoneShellProps = {
  children: ReactNode;
  /** Widest the phone grows, in CSS pixels; below that it fills its column. */
  maxWidth?: number;
  /** Added to the screen, the box inside the bezel that holds the content.
      Its shape is fixed; content fills it with `h-full`. */
  screenClassName?: string;
  screenStyle?: CSSProperties;
};

/**
 * The one phone the site draws: black bezel, side buttons, dynamic island.
 * The design page's live demo, the homepage loop, the admin editor preview and
 * the client's draft preview all sit inside it, so a visitor never sees two
 * different devices. Decorative chrome only; the content inside is the real
 * thing.
 *
 * The screen clips its content and is positioned, so an absolutely placed
 * child (the envelope gate in a contained demo) stays on the glass.
 */
export function PhoneShell({
  children,
  maxWidth = PHONE_MAX_WIDTH,
  screenClassName,
  screenStyle,
}: PhoneShellProps) {
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth }}>
      {/* The device's side buttons. Purely decorative, and drawn on the shell
          rather than the screen: they sit just outside the bezel's rounded
          edge, half-tucked behind it, which is how a phone's hardware reads
          from the front. Percentages, not pixels, so they keep their place as
          the frame scales with the column. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[3px] top-[26%] z-10 h-[7.5%] w-[3px] rounded-l-sm bg-ink/85"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[3px] top-[35.5%] z-10 h-[7.5%] w-[3px] rounded-l-sm bg-ink/85"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[3px] top-[29%] z-10 h-[11%] w-[3px] rounded-r-sm bg-ink/85"
      />

      <div className="rounded-[2.5rem] border border-taupe/60 bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgb(var(--reve-shadow-rgb)/0.6)]">
        <div
          className={`relative overflow-hidden rounded-[2rem] bg-bone ${screenClassName ?? ''}`}
          style={{ ...screenStyle, aspectRatio: PHONE_SCREEN_ASPECT }}
        >
          {/* Above the envelope gate, which stacks at 50 inside the screen. */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-[60] h-5 w-20 -translate-x-1/2 rounded-full bg-ink"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
