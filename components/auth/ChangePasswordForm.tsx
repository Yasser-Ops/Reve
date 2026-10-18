import { ActionForm } from '@/components/admin/ActionForm';
import { Field } from '@/components/admin/fields';
import type { FormAction } from '@/lib/admin/action-result';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';

/** The change-password fields, shared by the admin and client settings pages. */
export function ChangePasswordForm({ action }: { action: FormAction }) {
  return (
    <ActionForm
      action={action}
      className="grid gap-4"
      pendingLabel="Changing"
      submitLabel="Change password"
      successMessage={PASSWORD_MESSAGES.CHANGED}
    >
      <Field
        autoComplete="current-password"
        label="Current password"
        name="current"
        required
        type="password"
      />
      <Field
        autoComplete="new-password"
        label="New password"
        name="next"
        required
        type="password"
      />
      <Field
        autoComplete="new-password"
        label="New password again"
        name="confirm"
        required
        type="password"
      />
    </ActionForm>
  );
}
