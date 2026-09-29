import type { Metadata } from 'next';
import { ActionForm } from '@/components/admin/ActionForm';
import { Field, OrderFields } from '@/components/admin/fields';
import { createClientWithOrder } from '@/lib/admin/client-actions';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-medium">New client</h1>
      <p className="mt-1 text-muted-foreground">
        The client and their first order. They get no account until you invite them.
      </p>

      <ActionForm
        action={createClientWithOrder}
        className="mt-6 grid gap-4"
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
