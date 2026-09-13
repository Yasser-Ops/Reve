'use client';

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { getEnvelope, openingDurationMs } from '@/lib/envelopes';
import { FrameSequence } from './FrameSequence';
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
 * How long the card keeps growing after the paper has finished leaving.
 *
 * The rendered opening and the card's growth are two clocks, not one. The
 * render's own length says when the envelope is done; this is the tail the
 * card still needs to reach viewport size afterwards, so the invitation
 * settles rather than snapping to full size the instant the paper clears.
 *
 * There is no intermediate state and no veil. The card ends on the identity
 * transform, which is exactly where an untransformed page sits, so unmounting
 * the gate changes not one pixel.
 */
const CARD_SETTLE_MS = 900;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

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
  /* The seal stays inert until every frame is decoded: see FrameSequence. */
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  /*
   * A rendered opening cannot be partially stilled the way the old CSS
   * transforms could — it plays or it does not — so a guest who asked for
   * reduced motion gets frame 1 held and an immediate cut to the invitation.
   */
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    /* The server cannot know the preference, so it renders the full ceremony
       and the client corrects on hydration. It only ever gates an animation,
       never what is on the page. */
    () => false,
  );

  useEffect(() => {
    if (state !== 'opening') return;

    /* One step. The handover waits for the render to finish AND for the card
       to settle after it, because the card is still growing to its resting
       size once the paper has left the frame. */
    const id = window.setTimeout(
      () => setState('open'),
      reducedMotion ? 400 : openingDurationMs(spec.frames) + CARD_SETTLE_MS,
    );
    return () => window.clearTimeout(id);
  }, [state, spec, reducedMotion]);

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

  /*
   * `children` NEVER MOVE IN THE TREE.
   *
   * This used to `return <>{children}</>` once open, which put them at a
   * different position in the React tree from where they had been rendering —
   * inside the card, inside the gate. React cannot reconcile that: it unmounts
   * the whole invitation and mounts a new copy. Images re-request, the
   * countdown restarts from scratch, any scroll position is lost. It reads as
   * the invitation refreshing the instant the envelope finishes leaving,
   * which is the worst possible moment for a flicker.
   *
   * So the wrappers stay for the life of the page and are neutralised instead:
   * once open they carry no position, no background and no transform, and the
   * paper is simply not rendered. See `[data-state='open']` in envelope.css.
   */
  return (
    <div
      className="envelope-gate"
      data-state={state}
      style={
        {
          '--envelope-seal-y': spec.sealY,
          '--envelope-seal-x': spec.sealX,
          '--envelope-seal-size': spec.sealSize,
          '--envelope-open-ms': `${openingDurationMs(spec.frames)}ms`,
        } as React.CSSProperties
      }
    >
      {/* THE INVITATION SITS BEHIND THE PAPER, NOT INSIDE IT.
          A sibling of `.envelope`, never a child: the paper has to slide away
          on its own, and anything inside it travels with it. What shows
          through the pocket's mouth is this — the real invitation — which is
          why there is no cavity layer any more. The envelope opens onto the
          thing it contains. */}
      <div className="envelope-card">
        <div className="envelope-card-page">{children}</div>
      </div>

      {state !== 'open' && (
      <div className="envelope">
        {/* THE WHOLE PAPER, AS ONE RENDERED SEQUENCE.
            Flap, pocket, the wax and its breaking are all in the render — the
            browser composites nothing. It sits in front of the card, so the
            card emerges from behind it exactly as it did when this was four
            hinged layers. */}
        <FrameSequence
          frames={spec.frames}
          onReady={handleReady}
          playing={state === 'opening' && !reducedMotion}
        />

        <span className="envelope-pulse" />

        {/* The wax is PART OF THE RENDER, so this button draws no seal: it is
            a transparent hit target sized and placed over the rendered wax,
            carrying the couple's initials. Initials change per invitation and
            so cannot be baked into a render every couple shares.

            Inert until the sequence is decoded — a seal that responds before
            the frames are ready buys a stutter in the one moment of the
            product a guest actually remembers. */}
        <button
          aria-label="Open your invitation"
          className="envelope-seal"
          disabled={!ready}
          onClick={() => setState('opening')}
          type="button"
        >
          {initials}
        </button>

        <p className="envelope-hint">{ready ? 'Tap the seal' : 'One moment'}</p>

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
      )}
    </div>
  );
}
