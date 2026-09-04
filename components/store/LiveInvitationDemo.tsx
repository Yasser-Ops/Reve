'use client';

import type { ReactNode } from 'react';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';
import { RENDER_WIDTH } from '@/components/store/TemplateThumbnail';

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
  children,
}: {
  initials: string;
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="rounded-[2.5rem] border border-taupe/60 bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgb(var(--reve-shadow-rgb)/0.6)]">
        {/* envelope-scope contains the gate, which is `fixed` on a real
            invitation. The gate is a sibling of the scroller, never inside it,
            or the ceremony would scroll away with the invitation behind it. */}
        <div
          className="envelope-scope aspect-9/16 rounded-[2rem] bg-bone"
          style={{ containerType: 'inline-size' }}
        >
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-[60] h-5 w-20 -translate-x-1/2 rounded-full bg-ink"
          />

          <EnvelopeGate contained initials={initials}>
            <div
              className="h-full w-full overscroll-contain"
              style={{ overflowX: 'hidden', overflowY: 'auto' }}
            >
              {/* A transform does not change the layout box: the unscaled child
                  still reserves its full width, and `overflow-x: hidden` only
                  clips it — the scroller can still be dragged sideways to 152px
                  of nothing. `zoom` resizes the box itself, so there is no
                  surplus width to scroll to and the frame has one axis. */}
              <div style={{ width: `${RENDER_WIDTH}px`, zoom: `calc((100cqw / 1px) / ${RENDER_WIDTH})` }}>
                {children}
              </div>
            </div>
          </EnvelopeGate>
        </div>
      </div>
    </div>
  );
}
