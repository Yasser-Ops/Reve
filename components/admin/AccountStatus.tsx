import { ActionForm } from '@/components/admin/ActionForm';
import { accountState } from '@/lib/admin/invite-state';
import { inviteClient } from '@/lib/admin/invite';
import { STUDIO_TIME_ZONE } from '@/lib/constants';

type AccountStatusProps = {
  clientId: string;
  userId: string | null;
  termsAcceptedAt: string | null;
  /** Whether any of the client's orders has reached Paid. */
  paid: boolean;
};

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: STUDIO_TIME_ZONE });

/** The portal account line on the client page, with the invite button. */
export function AccountStatus({ clientId, userId, termsAcceptedAt, paid }: AccountStatusProps) {
  const state = accountState({ user_id: userId, terms_accepted_at: termsAcceptedAt });

  if (state === 'active' && termsAcceptedAt) {
    return <span>Active since {dateFormat.format(new Date(termsAcceptedAt))}</span>;
  }

  const invited = state === 'invited';
  const blocked = !invited && !paid;

  return (
    <span className="grid gap-2">
      <span>{invited ? 'Invited, has not set a password' : 'Not invited yet'}</span>
      <ActionForm
        action={inviteClient}
        className="grid gap-2"
        disabled={blocked}
        submitLabel={invited ? 'Send the invite again' : 'Invite to portal'}
        successMessage={invited ? 'Invite sent again.' : 'Invite sent.'}
        variant="outline"
      >
        <input name="clientId" type="hidden" value={clientId} />
        {blocked ? <span>Invite them once their payment is in.</span> : null}
      </ActionForm>
    </span>
  );
}
