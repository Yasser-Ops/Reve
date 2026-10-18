'use client';

import { useState, type FormEvent } from 'react';
import { RSVP_NOT_OPEN } from '@/components/invitation/rsvp';

type RsvpFormProps = {
  ink: string;
  accent: string;
  paper: string;
};

/**
 * Jardin's reply card. Its own file so the client boundary stays here: the
 * section around it is a Server Component.
 *
 * Nothing is stored yet, so a submit must not leave the page. A plain form
 * would GET the same URL, reload the invitation and replay the envelope; this
 * one stays put and tells the guest replies are not open, never that theirs
 * was received. The palette comes in as props because the template owns it.
 */
export function RsvpForm({ ink, accent, paper }: RsvpFormProps) {
  const [held, setHeld] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHeld(true);
  }

  return (
    <form
      aria-label="Reply"
      className="mx-auto mt-10 flex max-w-sm flex-col gap-5"
      onSubmit={onSubmit}
    >
      <label
        className="flex flex-col gap-2 text-left text-[11px] uppercase tracking-[0.18em]"
        style={{ color: `${ink}99` }}
      >
        Your name
        <input
          className="rounded-md border bg-white/50 px-4 py-2.5 text-base normal-case tracking-normal"
          name="name"
          style={{ borderColor: `${ink}2e`, color: ink }}
          type="text"
        />
      </label>

      <fieldset
        className="text-left text-[11px] uppercase tracking-[0.18em]"
        style={{ color: `${ink}99` }}
      >
        <legend>Will you be joining us?</legend>
        <div className="mt-3 flex gap-6 normal-case tracking-normal text-base">
          <label className="flex items-center gap-2">
            <input name="attending" type="radio" value="yes" />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input name="attending" type="radio" value="no" />
            No
          </label>
        </div>
      </fieldset>

      <button
        className="mt-2 rounded-full px-7 py-3 text-[11px] uppercase tracking-[0.2em]"
        style={{ backgroundColor: accent, color: paper }}
        type="submit"
      >
        Send word
      </button>

      {held ? (
        <p
          className="text-center text-[11px] uppercase leading-relaxed tracking-[0.2em]"
          role="status"
          style={{ color: ink }}
        >
          {RSVP_NOT_OPEN}
        </p>
      ) : null}
    </form>
  );
}
