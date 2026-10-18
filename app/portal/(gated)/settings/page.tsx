import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { getClientForUser } from '@/lib/auth/client-membership';
import { requireClient } from '@/lib/auth/guards';
import { PASSWORD_RULES } from '@/lib/auth/messages';
import { changeClientPassword } from '@/lib/auth/portal-actions';
import { whatsappLink } from '@/lib/contact';
import { createClient } from '@/lib/supabase/server';

/* robots: noindex is inherited from app/portal/layout.tsx. */
export const metadata: Metadata = { title: 'Settings' };

const UPDATE_DETAILS_MESSAGE = 'Hi, I would like to update my details.';

export default async function PortalSettingsPage() {
  const identity = await requireClient();
  /* The guard's identity carries no phone; RLS lets a client read their own row. */
  const client = await getClientForUser(await createClient(), identity.userId);

  const details = [
    { label: 'Name', value: identity.fullName },
    { label: 'Email', value: identity.email },
    { label: 'Phone', value: client?.phone ?? '' },
  ];

  return (
    <main className="mx-auto grid max-w-xl gap-8 px-4 py-10 sm:px-6">
      <h1 className="font-heading text-[34px] leading-tight">Settings</h1>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-[22px]">Your details</h2>
        <dl className="grid gap-3">
          {details.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd>{value || 'Not provided'}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground">
          To change these,{' '}
          <a
            className="underline underline-offset-4"
            href={whatsappLink(UPDATE_DETAILS_MESSAGE)}
            rel="noreferrer"
            target="_blank"
          >
            message us on WhatsApp
          </a>
          .
        </p>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-[22px]">Password</h2>
          <p className="mt-1 text-muted-foreground">
            At least {PASSWORD_RULES.MIN} characters. Changing it signs out every other device.
          </p>
        </div>
        <ChangePasswordForm action={changeClientPassword} />
      </section>
    </main>
  );
}
