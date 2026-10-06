import { ActionForm } from '@/components/admin/ActionForm';
import { TextareaField } from '@/components/admin/fields';
import { approveOnBehalf, publishInvitation } from '@/lib/admin/invitation-actions';
import type { EditorInvitation } from '@/lib/admin/invitations';
import { STUDIO_TIME_ZONE } from '@/lib/constants';
import { publishReadiness } from '@/lib/invitations/publish-guard';
import { cn } from '@/lib/utils';

/* Studio time, not the server's. */
const when = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: STUDIO_TIME_ZONE,
});

/** The approval history, and Publish held shut (with the reason) until it can succeed. */
export function ReviewPanel({ invitation }: { invitation: EditorInvitation }) {
  const latest = invitation.invitation_reviews[0];
  const readiness = publishReadiness(
    invitation.orders?.status ?? null,
    invitation.content,
    latest ? { decision: latest.decision, contentSnapshot: latest.content_snapshot } : null,
  );

  return (
    <section className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-[22px]">Approval and publishing</h2>

      {invitation.invitation_reviews.length ? (
        <ol className="grid gap-3 border-l pl-5">
          {invitation.invitation_reviews.map((review) => (
            <li className="relative" key={review.id}>
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1.5 -left-[25px] size-2.5 rounded-full',
                  review.decision === 'approved' ? 'bg-ink' : 'bg-wine',
                )}
              />
              <p className="font-medium">
                {review.decision === 'approved' ? 'Approved' : 'Changes requested'}
                {review.on_behalf ? ' (recorded by Rêve)' : ''}
              </p>
              <p className="text-muted-foreground">
                {when.format(new Date(review.created_at))}
                {review.note ? ` · ${review.note}` : ''}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">No decision yet.</p>
      )}

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">Record the client’s approval</summary>
        <ActionForm
          action={approveOnBehalf}
          className="mt-4 grid gap-3"
          submitLabel="Record approval of this version"
          successMessage="Approval recorded."
          variant="outline"
        >
          <input name="invitationId" type="hidden" value={invitation.id} />
          <TextareaField
            label="Where they approved it"
            name="note"
            placeholder="Approved on WhatsApp, 1 October"
          />
        </ActionForm>
      </details>

      <div className="grid gap-2">
        <ActionForm
          action={publishInvitation}
          className="flex flex-wrap items-center gap-3"
          disabled={!readiness.ok}
          submitLabel={invitation.published_at ? 'Publish again' : 'Publish'}
          successMessage="Live."
        >
          <input name="invitationId" type="hidden" value={invitation.id} />
        </ActionForm>
        {readiness.ok ? null : <p className="text-muted-foreground">{readiness.reason}</p>}
      </div>
    </section>
  );
}
