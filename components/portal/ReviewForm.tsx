'use client';

import { startTransition, useActionState, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/lib/admin/action-result';
import { STUDIO_TIME_ZONE } from '@/lib/constants';
import { REVIEW_MESSAGES, REVIEW_RULES } from '@/lib/portal/messages';
import type { PortalOrder } from '@/lib/portal/orders';
import { submitReview } from '@/lib/portal/review-actions';

type Decision = 'approved' | 'changes_requested';

type ReviewFormProps = {
  invitationId: string;
  latestReview: NonNullable<PortalOrder['invitation']>['latestReview'];
};

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: STUDIO_TIME_ZONE });

/**
 * Approve the draft or ask for changes. The buttons send the decision
 * themselves rather than submitting the form: React resets a form after an
 * action, which would wipe the note when the server refuses it.
 */
export function ReviewForm({ invitationId, latestReview }: ReviewFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState<Decision | null>(null);
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await submitReview(previous, formData);
      if (next.ok) setSent(formData.get('decision') as Decision);
      return next;
    },
    null,
  );

  function send(decision: Decision) {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set('decision', decision);
    startTransition(() => run(formData));
  }

  if (sent) {
    return (
      <p>
        {sent === 'approved' ? REVIEW_MESSAGES.THANKS_APPROVED : REVIEW_MESSAGES.THANKS_CHANGES}
      </p>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => event.preventDefault()} ref={formRef}>
      <input name="invitationId" type="hidden" value={invitationId} />

      {latestReview ? (
        <p className="text-muted-foreground">
          {latestReview.decision === 'approved'
            ? REVIEW_MESSAGES.LAST_APPROVED
            : REVIEW_MESSAGES.LAST_CHANGES}
          {` on ${when.format(new Date(latestReview.createdAt))}`}
          {latestReview.note ? `: ${latestReview.note}` : '.'}
        </p>
      ) : null}

      {asking ? (
        <div className="grid gap-2">
          <Label htmlFor="review-note">What should we change?</Label>
          <Textarea
            id="review-note"
            maxLength={REVIEW_RULES.NOTE_MAX}
            name="note"
            placeholder="The date, a spelling, a photo..."
          />
        </div>
      ) : null}

      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {asking ? (
          <Button disabled={pending} onClick={() => send('changes_requested')} type="button">
            Send my changes
          </Button>
        ) : (
          <>
            <Button disabled={pending} onClick={() => send('approved')} type="button">
              Approve
            </Button>
            <Button onClick={() => setAsking(true)} type="button" variant="outline">
              Request changes
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
