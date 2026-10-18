import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { changePassword } from '@/lib/auth/actions';
import { requireAdmin } from '@/lib/auth/guards';
import { PASSWORD_RULES } from '@/lib/auth/messages';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const admin = await requireAdmin();

  return (
    <main className="mx-auto grid max-w-xl gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: 'Clients', href: ROUTES.ADMIN }, { label: 'Settings' }]} />

      <header>
        <Eyebrow>Account</Eyebrow>
        <h1 className="mt-2 font-heading text-[34px] leading-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Signed in as {admin.email}</p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-[22px]">Password</h2>
          <p className="mt-1 text-muted-foreground">
            At least {PASSWORD_RULES.MIN} characters. Changing it signs out every other device.
          </p>
        </div>
        <ChangePasswordForm action={changePassword} />
      </section>
    </main>
  );
}
