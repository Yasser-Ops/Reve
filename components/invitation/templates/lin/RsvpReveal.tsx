'use client';

import { useState } from 'react';
import { LIN } from './palette';
import { RsvpForm } from './RsvpForm';

/**
 * The mock's single RSVP pill. The reply card opens in place on a tap, so the
 * band reads as one quiet line until a guest chooses to answer.
 */
export function RsvpReveal({ rsvpSlug }: { rsvpSlug: string | null }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <RsvpForm accent={LIN.GOLD} ink={LIN.INK} paper={LIN.PAPER} rsvpSlug={rsvpSlug} />;
  }

  return (
    <button
      aria-expanded={false}
      className="mt-6 rounded-full border px-12 py-2.5 text-[17px] tracking-[0.04em]"
      onClick={() => setOpen(true)}
      style={{
        backgroundColor: '#e8e8e2',
        borderColor: '#bdbdb5',
        color: LIN.GOLD,
        boxShadow: 'inset 0 1px 3px rgb(0 0 0 / 0.12), 0 1px 0 rgb(255 255 255 / 0.8)',
      }}
      type="button"
    >
      RSVP
    </button>
  );
}
