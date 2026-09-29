import { ActionForm } from '@/components/admin/ActionForm';
import { TextareaField } from '@/components/admin/fields';
import { approveOnBehalf, publishInvitation } from '@/lib/admin/invitation-actions';
import type { EditorInvitation } from '@/lib/admin/invitations';

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function ReviewPanel({ invitation }: { invitation: EditorInvitation }) {
  return (
    <section className="grid gap-4">
      <h2 className="font-medium">Approval</h2>

      {invitation.invitation_reviews.length ? (
        <ul className="grid gap-1">
          {invitation.invitation_reviews.map((review) => (
            <li key={review.id}>
              {review.decision === 'approved' ? 'Approved' : 'Changes requested'}
              {review.on_behalf ? ' (recorded by Rêve)' : ''} ·{' '}
              {when.format(new Date(review.created_at))}
              {review.note ? (
                <span className="text-muted-foreground"> · {review.note}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No decision yet.</p>
      )}

      <ActionForm
        action={approveOnBehalf}
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

      <ActionForm
        action={publishInvitation}
        submitLabel={invitation.published_at ? 'Publish again' : 'Publish'}
        successMessage="Live."
      >
        <input name="invitationId" type="hidden" value={invitation.id} />
      </ActionForm>
    </section>
  );
}
