import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { Field, OrderFields } from '@/components/admin/fields';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addOrder, updateClient } from '@/lib/admin/client-actions';
import { getClient } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { adminRoutes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Client' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const client = await getClient(id.data);
  if (!client) notFound();

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[1fr_2fr]">
      <section>
        <h1 className="text-xl font-medium">{client.full_name}</h1>
        <p className="text-muted-foreground">{client.email}</p>
        <p className="mt-1 text-muted-foreground">
          {client.user_id ? 'Has an account' : 'Not invited yet'}
        </p>

        <ActionForm
          action={updateClient}
          className="mt-6 grid gap-4"
          submitLabel="Save"
          successMessage="Saved."
        >
          <input name="clientId" type="hidden" value={client.id} />
          <Field defaultValue={client.full_name} label="Full name" name="fullName" required />
          <Field defaultValue={client.phone} label="Phone" name="phone" required />
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea defaultValue={client.notes} id="notes" name="notes" />
          </div>
        </ActionForm>
      </section>

      <section className="grid content-start gap-4">
        {client.orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {order.reference} · {order.tier} · ${order.amount}
                <StatusBadge status={order.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {order.invitations ? (
                <Link className="underline" href={adminRoutes.invitation(order.invitations.id)}>
                  Invitation /i/{order.invitations.slug} ({order.invitations.status})
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Add an order</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={addOrder}
              className="grid gap-4"
              submitLabel="Add order"
              successMessage="Order added."
            >
              <input name="clientId" type="hidden" value={client.id} />
              <OrderFields />
            </ActionForm>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
