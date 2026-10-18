'use client';

import Link from 'next/link';
import { useRef, useState, useTransition, type CSSProperties } from 'react';
import type { ActionResult } from '@/lib/admin/action-result';
import { STUDIO_TIME_ZONE } from '@/lib/constants';
import { REVIEW_MESSAGES, REVIEW_RULES } from '@/lib/portal/messages';
import { submitReview } from '@/lib/portal/review-actions';
import { ROUTES } from '@/lib/routes';

type Decision = 'approved' | 'changes_requested';

type ReviewFormProps = {
  invitationId: string;
  /** Which version of the content the client was shown; the action refuses a mismatch. */
  fingerprint: string;
  /** The client's newest decision; `current` is false once the content moved on. */
  latest: {
    decision: Decision;
    createdAt: string;
    note: string;
    current: boolean;
  } | null;
};

/* Studio time, not the browser's. */
const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: STUDIO_TIME_ZONE });

/* Inline styles on purpose: this bar sits on the draft preview, outside
   AppSurface, where shadcn's tokens are absent and a stylesheet would leak
   into the design underneath. */
const WINE = '#6f2233';
const bar: CSSProperties = {
  position: 'fixed',
  insetInline: 0,
  bottom: 0,
  zIndex: 50,
  display: 'grid',
  gap: 10,
  padding: '12px 16px',
  background: 'rgba(255, 255, 255, 0.96)',
  borderTop: '1px solid rgba(0, 0, 0, 0.12)',
  boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
  color: '#1c1917',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  WebkitFontSmoothing: 'antialiased',
  textRendering: 'optimizeLegibility',
};
const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  maxWidth: 720,
  width: '100%',
  margin: '0 auto',
};
const button: CSSProperties = {
  font: 'inherit',
  padding: '8px 14px',
  borderRadius: 8,
  border: `1px solid ${WINE}`,
  cursor: 'pointer',
};
const primary: CSSProperties = { ...button, background: WINE, color: '#fff' };
const secondary: CSSProperties = { ...button, background: '#fff', color: WINE };

/** Spacer height so the fixed bar never hides the end of the design. */
export const REVIEW_BAR_SPACE = 120;

/**
 * Approve the draft on screen or ask for changes. The buttons send the
 * decision themselves rather than submitting the form: React resets a form
 * after an action, which would wipe the note when the server refuses it. The
 * bar opens on the client's latest decision: an approval of what is on
 * screen offers only "Withdraw approval"; any other state offers Approve and
 * Request changes.
 */
export function ReviewForm({ invitationId, fingerprint, latest: initial }: ReviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [sent, setSent] = useState<Decision | null>(null);
  const [latest, setLatest] = useState(initial);
  const [pending, startTransition] = useTransition();

  /* An approval of content that has since changed counts for nothing. */
  const approved = latest?.decision === 'approved' && latest.current;
  const stale = latest?.decision === 'approved' && !latest.current;

  function send(decision: Decision) {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set('decision', decision);
    /* Withdrawing needs no reason from the client; the action still wants a note. */
    const typed = String(formData.get('note') ?? '').trim();
    const note = approved && !typed ? REVIEW_MESSAGES.WITHDRAWN_NOTE : typed;
    if (approved) formData.set('note', note);
    startTransition(async () => {
      const next = await submitReview(result, formData);
      setResult(next);
      setSent(next.ok ? decision : null);
      /* Fields clear only on success, so a refused note is not lost. */
      if (next.ok) {
        setAsking(false);
        setLatest({ decision, createdAt: new Date().toISOString(), note, current: true });
      }
    });
  }

  return (
    <form
      aria-label="Your review"
      onSubmit={(event) => event.preventDefault()}
      ref={formRef}
      style={bar}
    >
      <input name="invitationId" type="hidden" value={invitationId} />
      <input name="fingerprint" type="hidden" value={fingerprint} />

      {asking ? (
        <div style={{ ...row, display: 'grid', gap: 6 }}>
          <label htmlFor="review-note">What should we change?</label>
          <textarea
            id="review-note"
            maxLength={REVIEW_RULES.NOTE_MAX}
            name="note"
            placeholder="The date, a spelling, a photo..."
            rows={3}
            style={{ font: 'inherit', padding: 8, borderRadius: 8, border: '1px solid #d6d3d1' }}
          />
        </div>
      ) : null}

      {approved && latest ? (
        <p style={{ ...row, margin: '0 auto' }}>
          {REVIEW_MESSAGES.APPROVED_ON} {when.format(new Date(latest.createdAt))}.
        </p>
      ) : null}
      {latest?.decision === 'changes_requested' ? (
        <p style={{ ...row, margin: '0 auto' }}>
          {REVIEW_MESSAGES.CHANGES_ON} {when.format(new Date(latest.createdAt))}: {latest.note}
        </p>
      ) : null}
      {stale ? (
        <p style={{ ...row, margin: '0 auto' }}>{REVIEW_MESSAGES.UPDATED_SINCE_APPROVAL}</p>
      ) : null}

      {sent ? (
        <p style={{ ...row, margin: '0 auto' }}>
          {sent === 'approved' ? REVIEW_MESSAGES.THANKS_APPROVED : REVIEW_MESSAGES.THANKS_CHANGES}
        </p>
      ) : null}

      {result && !result.ok ? (
        <p role="alert" style={{ ...row, margin: '0 auto', color: '#b91c1c' }}>
          {result.message}
        </p>
      ) : null}

      <div style={row}>
        {asking ? (
          <>
            <button
              disabled={pending}
              onClick={() => send('changes_requested')}
              style={primary}
              type="button"
            >
              {approved ? 'Confirm withdrawal' : 'Send my changes'}
            </button>
            <button
              disabled={pending}
              onClick={() => setAsking(false)}
              style={secondary}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : approved ? (
          <button
            disabled={pending}
            onClick={() => setAsking(true)}
            style={secondary}
            type="button"
          >
            {REVIEW_MESSAGES.WITHDRAW}
          </button>
        ) : (
          <>
            <button
              disabled={pending}
              onClick={() => send('approved')}
              style={primary}
              type="button"
            >
              Approve
            </button>
            <button
              disabled={pending}
              onClick={() => setAsking(true)}
              style={secondary}
              type="button"
            >
              Request changes
            </button>
          </>
        )}
        <Link href={ROUTES.PORTAL} style={{ marginInlineStart: 'auto', color: WINE }}>
          Back to your orders
        </Link>
      </div>
    </form>
  );
}
