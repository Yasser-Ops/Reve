'use client';

import { RsvpHoneypot } from '@/components/invitation/RsvpHoneypot';
import { RSVP_STATE, useRsvpSubmit } from '@/components/invitation/useRsvpSubmit';
import { RSVP_ATTENDING, RSVP_LIMITS } from '@/lib/schemas/rsvp';

type RsvpFormProps = {
  ink: string;
  accent: string;
  paper: string;
  rsvpSlug: string | null;
};

/**
 * Lin's reply card. Its own file so the client boundary stays here: the
 * section around it is a Server Component.
 *
 * A plain form would GET the same URL, reload the invitation and replay the
 * envelope, so the submit is intercepted. On the live page it sends the reply;
 * anywhere else (`rsvpSlug` null) it only says it is a preview. The palette
 * comes in as props because the template owns it.
 */
export function RsvpForm({ ink, accent, paper, rsvpSlug }: RsvpFormProps) {
  const { state, message, onSubmit, setChoice, isYes } = useRsvpSubmit(rsvpSlug);

  if (state === RSVP_STATE.SENT) {
    return (
      <p
        className="mx-auto mt-10 max-w-sm text-center text-[17px] italic"
        role="status"
        style={{ color: ink }}
      >
        {message}
      </p>
    );
  }

  const fieldClass =
    'rounded-md border bg-white/60 px-4 py-2 text-base normal-case tracking-normal';
  const fieldStyle = { borderColor: `${ink}33`, color: ink };
  const labelClass = 'flex flex-col gap-2 text-left text-[13px] uppercase tracking-[0.14em]';

  return (
    <form
      aria-label="Reply"
      className="mx-auto mt-10 flex max-w-sm flex-col gap-5"
      onSubmit={onSubmit}
    >
      <label className={labelClass} style={{ color: `${ink}b3` }}>
        Your name
        <input
          className={fieldClass}
          maxLength={RSVP_LIMITS.NAME_MAX}
          name="name"
          required
          style={fieldStyle}
          type="text"
        />
      </label>

      <fieldset
        className="text-left text-[13px] uppercase tracking-[0.14em]"
        style={{ color: `${ink}b3` }}
      >
        <legend>Will you be joining us?</legend>
        <div className="mt-3 flex gap-6 normal-case tracking-normal">
          <label className="flex items-center gap-2">
            <input
              name="attending"
              onChange={() => setChoice(RSVP_ATTENDING.YES)}
              required
              type="radio"
              value={RSVP_ATTENDING.YES}
            />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input
              name="attending"
              onChange={() => setChoice(RSVP_ATTENDING.NO)}
              required
              type="radio"
              value={RSVP_ATTENDING.NO}
            />
            No
          </label>
        </div>
      </fieldset>

      {isYes ? (
        <>
          <label className={labelClass} style={{ color: `${ink}b3` }}>
            How many of you
            <input
              className={fieldClass}
              defaultValue={1}
              max={RSVP_LIMITS.PARTY_MAX}
              min={1}
              name="partySize"
              style={fieldStyle}
              type="number"
            />
          </label>
          <label className={labelClass} style={{ color: `${ink}b3` }}>
            Dietary needs
            <input
              className={fieldClass}
              maxLength={RSVP_LIMITS.NOTE_MAX}
              name="dietaryNotes"
              style={fieldStyle}
              type="text"
            />
          </label>
        </>
      ) : null}

      <label className={labelClass} style={{ color: `${ink}b3` }}>
        A note for the couple
        <textarea
          className={fieldClass}
          maxLength={RSVP_LIMITS.NOTE_MAX}
          name="message"
          rows={3}
          style={fieldStyle}
        />
      </label>

      <RsvpHoneypot />

      <button
        className="mt-2 rounded-full px-6 py-3 text-[12px] uppercase tracking-[0.18em] disabled:opacity-60"
        disabled={state === RSVP_STATE.SENDING}
        style={{ backgroundColor: accent, color: paper }}
        type="submit"
      >
        Submit
      </button>

      {message ? (
        <p className="text-center text-[15px] italic" role="status" style={{ color: ink }}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
