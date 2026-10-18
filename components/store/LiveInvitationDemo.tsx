'use client';

import type { ReactNode } from 'react';
import { PHONE_SCREEN_RATIO, PhoneShell } from '@/components/PhoneShell';
import { screenFor } from '@/components/invitation/screen';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';
import { getEnvelope } from '@/lib/envelopes';

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
  envelope,
  maxWidth,
  children,
}: {
  /** Which envelope opens over the invitation. Defaults to the house design. */
  envelope?: string;
  /** Widest the phone grows; PhoneShell's default otherwise. */
  maxWidth?: number;
  children: ReactNode;
}) {
  const spec = getEnvelope(envelope);

  /* The scroller is identical under either rig, so it is built once and handed
     to whichever gate is playing. */
  const scroller = (
    <div
      className="reve-no-scrollbar h-full w-full overscroll-contain"
      style={{
        overflowX: 'hidden',
        overflowY: 'auto',
        /*
         * THE CONTAINER IS THIS BOX, NOT THE PHONE SHELL.
         *
         * `100cqw` below resolves against the nearest ancestor that declares
         * a container, and it used to be `.envelope-scope` — two levels up,
         * outside the gate and the card, both of which the ceremony
         * re-positions as it hands over. A zoom factor measured against a box
         * whose geometry changes mid-animation is a zoom factor that changes
         * mid-animation: the invitation was scaled by one number while the
         * envelope covered it and a different one once the gate went static,
         * which is the jump that showed on first scroll and the mismatch that
         * left the page short of the bezel as the paper left.
         *
         * Declared here, the container is the scroller itself — the same box
         * the content has to fill, with a width that is settled before the
         * ceremony starts and unaffected by anything the gate does to its
         * ancestors.
         */
        containerType: 'inline-size',
      }}
    >
      {/*
       * Rendered at real phone width and scaled to fit, never reflowed, so
       * every proportion is the one a guest sees.
       *
       * `zoom` rather than a transform because a transform does not change
       * the layout box: the unscaled child would still reserve its full
       * RENDER_WIDTH and the frame would drag sideways to the difference.
       *
       * THE HALF PIXEL IS DELIBERATE. `100cqw / RENDER_WIDTH` is a fraction
       * that almost never lands on a whole device pixel, and a zoomed box
       * that rounds DOWN comes up a hair narrow — which showed as a pale
       * stripe of the shell's ground down the right edge of the screen, the
       * full height of the phone. Asking for half a pixel more than the
       * container makes the content round up instead: it overshoots into the
       * scroller's own `overflow: hidden` where nothing can see it, and the
       * artwork reaches the bezel on both sides at every width.
       */}
      <div
        style={{
          /* The hero fills the phone's screen, not the browser window. */
          ...screenFor(RENDER_WIDTH, PHONE_SCREEN_RATIO),
          width: `${RENDER_WIDTH}px`,
          zoom: `calc((100cqw + 0.5px) / 1px / ${RENDER_WIDTH})`,
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    /* envelope-scope contains the gate, which is `fixed` on a real
       invitation. The gate is a sibling of the scroller, never inside it, or
       the ceremony would scroll away with the invitation behind it. The
       screen's shape is PhoneShell's, which is the envelope frame's. */
    <PhoneShell
      maxWidth={maxWidth}
      screenClassName="envelope-scope"
      screenStyle={{ containerType: 'inline-size' }}
    >
      {/* `reve-no-scrollbar` on the scroller: this is a picture of a phone,
          and phones do not paint a scrollbar down the side of the screen.
          And `zoom` rather than a transform, because a transform does not
          change the layout box — the unscaled child would still reserve its
          full width and the frame would drag sideways to 152px of nothing. */}
      <EnvelopeGate contained envelope={spec.slug}>
        {scroller}
      </EnvelopeGate>
    </PhoneShell>
  );
}
