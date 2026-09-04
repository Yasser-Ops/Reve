'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SHEET_GROUND } from '@/lib/sheet';
import './envelope.css';

type EnvelopeGateProps = {
  initials: string;
  /**
   * Playing inside a frame rather than as the guest's whole phone.
   *
   * A storefront demo shows the same ceremony inside a phone silhouette, so it
   * must not lock the page behind it: the visitor is still reading marketing
   * copy around it. The live invitation leaves this off and owns the screen.
   */
  contained?: boolean;
  children: ReactNode;
};

type GateState = 'sealed' | 'opening' | 'open';

/** Matches the longest animation in envelope.css. */
const REVEAL_MS = 3400;

/** The envelope's flap: cream cotton, embossed vines, deckled edge. */
const FLAP = '/envelope/flap-vine.webp';

/** The wax, champagne gold, blank centre for the couple's initials. */
const SEAL = '/envelope/seal.webp';

/** The same paper seen from behind, for once the flap passes vertical. */
const FLAP_OPEN = '/envelope/flap-vine-inner.webp';

/*
 * Where the flap's V comes to a point, measured off flap-vine.webp: the seam
 * reads as a dark line at 74% down the image. The seal sits on that point, and
 * the flap hinges from the top edge. Re-generating the flap art means
 * re-measuring this one value and nothing else.
 */
const SEAL_Y = '74%';
const SEAL_SIZE = '17%';

/**
 * Wraps an invitation with its opening ceremony.
 *
 * The envelope plays every time. It is the thing that makes a digital
 * invitation feel like a received object rather than a link, and a guest who
 * returns is usually showing it to someone else — so replaying it is the point,
 * not friction. Skipping is always one tap away for anyone who came back only
 * to check the address.
 *
 * Children render underneath from the start, so the invitation is already
 * painted by the time the envelope clears and nothing pops in behind it.
 */
export function EnvelopeGate({
  initials,
  contained = false,
  children,
}: EnvelopeGateProps) {
  const [state, setState] = useState<GateState>('sealed');

  useEffect(() => {
    if (state !== 'opening') return;

    const id = window.setTimeout(() => setState('open'), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  /* The invitation is inert behind the envelope: it must not scroll away under
     the ceremony. A contained demo skips this — the page around it is still
     the visitor's to scroll. */
  useEffect(() => {
    if (contained || state === 'open') return;

    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previous;
    };
  }, [contained, state]);

  return (
    <>
      {state === 'sealed' || state === 'opening' ? (
        <div
          className="envelope-gate"
          data-state={state}
          style={
            {
              '--envelope-flap': `url(${FLAP})`,
              '--envelope-flap-inner': `url(${FLAP_OPEN})`,
              '--envelope-seal': `url(${SEAL})`,
              '--envelope-seal-y': SEAL_Y,
              '--envelope-seal-size': SEAL_SIZE,
              '--envelope-card': SHEET_GROUND,
            } as React.CSSProperties
          }
        >
          <div className="envelope">
            {/* The envelope back, and the card that rises out of it. */}
            <div className="envelope-body" />
            <div className="envelope-card" />

            {/* The soft light at the envelope's mouth as the flap clears. */}
            <div className="envelope-glow" />

            {/* Front face, in front of the card so the card emerges behind it. */}
            <div className="envelope-pocket" />

            {/* The falling flap, and the shadow it casts on the way down. The
                two faces are backface-hidden siblings on one hinge: past
                vertical the embossed front turns away and the plain inner face
                turns toward the viewer, which is what a real flap does. */}
            <div className="envelope-flap-shadow" />
            <div className="envelope-hinge">
              <div className="envelope-flap envelope-flap-front" />
              <div className="envelope-flap envelope-flap-back" />
            </div>

            <span className="envelope-pulse" />

            <button
              aria-label="Open your invitation"
              className="envelope-seal"
              onClick={() => setState('opening')}
              type="button"
            >
              {initials}
            </button>

            <p className="envelope-hint">Tap the seal</p>

            {/* Always available, and it jumps straight to the invitation
                rather than fast-forwarding the animation. */}
            <button
              className="envelope-skip"
              onClick={() => setState('open')}
              type="button"
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}

      {children}
    </>
  );
}
