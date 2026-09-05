'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getEnvelope } from '@/lib/envelopes';
import './envelope.css';

type EnvelopeGateProps = {
  initials: string;
  /** Which envelope to open. Falls back to the default design. */
  envelope?: string;
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

/**
 * Matches the longest animation in envelope.css.
 *
 * The sequence is deliberately unhurried. An invitation opening is the one
 * moment of the product a guest will actually remember, and rushing it makes
 * the envelope feel like a loading screen in front of the page.
 */
const REVEAL_MS = 4600;

/**
 * Wraps an invitation with its opening ceremony.
 *
 * The envelope plays every time. It is the thing that makes a digital
 * invitation feel like a received object rather than a link, and a guest who
 * returns is usually showing it to someone else — so replaying it is the point,
 * not friction. Skipping is always one tap away for anyone who came back only
 * to check the address.
 *
 * THE CARD IS THE INVITATION.
 *
 * `children` render INSIDE the card, scaled down, and the card grows until it
 * is the viewport. They are never rendered twice and never cross-faded. The
 * card's final geometry and the page's resting geometry are the same, so when
 * the gate unmounts nothing moves: the thing the guest watched come out of the
 * envelope is the thing they then read.
 *
 * The earlier version rendered the invitation as a sibling UNDERNEATH and rose
 * a blank cream rectangle in front of it, then cross-faded the whole gate away.
 * The card you watched emerge was not the card you ended up reading, which is
 * what made the handover feel like a slide transition rather than an opening.
 */
export function EnvelopeGate({
  initials,
  envelope,
  contained = false,
  children,
}: EnvelopeGateProps) {
  const [state, setState] = useState<GateState>('sealed');
  const spec = getEnvelope(envelope);

  useEffect(() => {
    if (state !== 'opening') return;

    const id = window.setTimeout(() => setState('open'), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  /* The invitation is inert while it is still inside the envelope: it must not
     scroll away under the ceremony. A contained demo skips this — the page
     around it is still the visitor's to scroll. */
  useEffect(() => {
    if (contained || state === 'open') return;

    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previous;
    };
  }, [contained, state]);

  /* Once open, the gate is gone entirely and the invitation is simply the page.
     No wrapper survives the ceremony, so nothing here can affect scrolling,
     stacking or layout for the rest of the visit. */
  if (state === 'open') return <>{children}</>;

  return (
    <div
      className="envelope-gate"
      data-state={state}
      style={
        {
          '--envelope-body': `url(${spec.layers.body})`,
          '--envelope-interior': `url(${spec.layers.interior})`,
          '--envelope-pocket': `url(${spec.layers.pocket})`,
          '--envelope-flap': `url(${spec.layers.flap})`,
          '--envelope-flap-inner': `url(${spec.layers.flapInner})`,
          '--envelope-seal': `url(${spec.layers.seal})`,
          '--envelope-seal-y': spec.sealY,
          '--envelope-seal-x': spec.sealX,
          '--envelope-flap-top': spec.flapTop,
          '--envelope-seal-size': spec.sealSize,
        } as React.CSSProperties
      }
    >
      <div className="envelope">
        {/* The back panel, then the cavity in front of it. The cavity is
            drawn, not photographed: a second photograph of the same envelope
            never registers with the flap animating above it, which is what
            made the two-envelope composite in the first attempt. */}
        <div className="envelope-body" />
        <div className="envelope-interior" />

        {/* The card: the real invitation, scaled into the envelope's mouth. */}
        <div className="envelope-card">
          <div className="envelope-card-page">{children}</div>
        </div>

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
  );
}
