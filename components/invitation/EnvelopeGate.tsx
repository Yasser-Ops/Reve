'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { hasOpened, markOpened } from '@/lib/envelope-storage';
import './envelope.css';

type EnvelopeGateProps = {
  slug: string;
  initials: string;
  children: ReactNode;
};

type GateState = 'sealed' | 'opening' | 'open';

/** Matches the longest animation in envelope.css. */
const REVEAL_MS = 1400;

/** localStorage never changes underneath us here, so no subscription is needed. */
const noopSubscribe = () => () => {};

/**
 * Wraps an invitation with its opening ceremony.
 *
 * The envelope plays once per guest per invitation: forcing someone to watch
 * it again when they return to check the address turns delight into friction.
 * Children render underneath from the start so the invitation is already
 * painted by the time the envelope clears.
 *
 * The already-opened flag is read through useSyncExternalStore rather than an
 * effect, so the server and the first client render agree (both treat the
 * envelope as sealed) without a cascading second render.
 */
export function EnvelopeGate({ slug, initials, children }: EnvelopeGateProps) {
  const alreadyOpened = useSyncExternalStore(
    noopSubscribe,
    () => hasOpened(slug),
    () => false,
  );

  const [interaction, setInteraction] = useState<'idle' | 'opening' | 'open'>('idle');

  const state: GateState =
    interaction === 'idle' ? (alreadyOpened ? 'open' : 'sealed') : interaction;

  useEffect(() => {
    if (interaction !== 'opening') return;

    const id = window.setTimeout(() => setInteraction('open'), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [interaction]);

  function open() {
    markOpened(slug);
    setInteraction('opening');
  }

  return (
    <>
      {state === 'sealed' || state === 'opening' ? (
        <div className="envelope-gate" data-state={state}>
          <div className="envelope">
            <div className="envelope-body" />

            <div className="envelope-card" />

            <div className="envelope-pocket" />

            <div className="envelope-flap">
              <svg
                aria-hidden="true"
                className="envelope-flap-shape"
                preserveAspectRatio="none"
                viewBox="0 0 300 124"
              >
                <path d="M0 0 H300 L150 124 Z" fill="var(--envelope-flap, #ded2c2)" />
                <path d="M0 0 H300 L150 124 Z" fill="none" stroke="rgb(43 33 24 / 0.08)" />
              </svg>
            </div>

            <button
              aria-label="Open your invitation"
              className="envelope-seal"
              onClick={open}
              type="button"
            >
              {initials}
            </button>

            <p className="envelope-hint">Tap the seal</p>
          </div>
        </div>
      ) : null}

      {children}
    </>
  );
}
