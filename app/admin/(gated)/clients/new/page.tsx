import type { Metadata } from 'next';
import { ActionForm } from '@/components/admin/ActionForm';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { Field, OrderFields } from '@/components/admin/fields';
import { createClientWithOrder } from '@/lib/admin/client-actions';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <main className="mx-auto grid max-w-xl gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: 'Clients', href: ROUTES.ADMIN }, { label: 'New client' }]} />

      <header>
        <Eyebrow>Studio</Eyebrow>
        <h1 className="mt-2 font-heading text-[34px] leading-tight">New client</h1>
        <p className="mt-2 text-muted-foreground">
          The client and their first order. They get no account until you invite them.
        </p>
      </header>

      <ActionForm
        action={createClientWithOrder}
        className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6"
        submitLabel="Create client"
      >
        <Field label="Full name" name="fullName" required />
        <Field label="Email" name="email" required type="email" />
        <Field label="Phone (WhatsApp)" name="phone" required />
        <OrderFields />
      </ActionForm>
    </main>
  );
}
