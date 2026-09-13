'use client';

import type { ReactNode } from 'react';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';
import { frameAspect, getEnvelope } from '@/lib/envelopes';

/**
 * The real invitation, playing inside a phone, scrollable by the visitor.
 *
 * Not a mock and not a video: the envelope is the same component a guest taps,
 * and the invitation behind it is the same renderer. Tapping the seal plays the
 * ceremony, and afterwards the whole invitation can be scrolled through inside
 * the frame — which is the closest thing to handing someone the product before
 * they have bought it.
 *
 * The invitation is rendered at real phone width and scaled to fit, never
 * reflowed, so what the visitor scrolls is proportioned exactly as a guest's
 * screen will be.
 */
export function LiveInvitationDemo({
  initials,
  envelope,
  children,
}: {
  initials: string;
  /** Which envelope opens over the invitation. Defaults to the house design. */
  envelope?: string;
  children: ReactNode;
}) {
  const spec = getEnvelope(envelope);

  /* The scroller is identical under either rig, so it is built once and handed
     to whichever gate is playing. */
  const scroller = (
    <div
      className="reve-no-scrollbar h-full w-full overscroll-contain"
      style={{ overflowX: 'hidden', overflowY: 'auto' }}
    >
      <div style={{ width: `${RENDER_WIDTH}px`, zoom: `calc((100cqw / 1px) / ${RENDER_WIDTH})` }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
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
        {/* envelope-scope contains the gate, which is `fixed` on a real
            invitation. The gate is a sibling of the scroller, never inside it,
            or the ceremony would scroll away with the invitation behind it. */}
        {/* THE SCREEN IS THE SHAPE OF THE ENVELOPE IT SHOWS. Taken from the
            render rather than fixed at 9/16: the frames fill this box with
            `object-fit: cover`, so a box of a different shape crops the
            envelope's top and foot off. */}
        <div
          className="envelope-scope rounded-[2rem] bg-bone"
          style={{
            aspectRatio: frameAspect(spec.frames),
            containerType: 'inline-size',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-[60] h-5 w-20 -translate-x-1/2 rounded-full bg-ink"
          />

          {/* `reve-no-scrollbar` on the scroller: this is a picture of a
              phone, and phones do not paint a scrollbar down the side of the
              screen. And `zoom` rather than a transform, because a transform
              does not change the layout box — the unscaled child would still
              reserve its full width and the frame would drag sideways to 152px
              of nothing. */}
          <EnvelopeGate contained envelope={spec.slug} initials={initials}>
            {scroller}
          </EnvelopeGate>
        </div>
      </div>
    </div>
  );
}
