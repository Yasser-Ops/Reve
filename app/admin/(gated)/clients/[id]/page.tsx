import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { DeleteClientDialog } from '@/components/admin/DeleteClientDialog';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { Field, OrderFields, TextareaField } from '@/components/admin/fields';
import { OrderCard } from '@/components/admin/OrderCard';
import { addOrder, updateClient } from '@/lib/admin/client-actions';
import { getClient } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { INVITATION_STATUS } from '@/lib/constants';
import { whatsappChat } from '@/lib/contact';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Client' };

const PANEL = 'rounded-2xl border bg-card p-5 sm:p-6';
const SUMMARY = 'cursor-pointer select-none font-medium marker:text-muted-foreground';

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const client = await getClient(id.data);
  if (!client) notFound();

  const chat = whatsappChat(client.phone);
  const invitations = client.orders.flatMap((order) =>
    order.invitations ? [order.invitations] : [],
  );
  const blocked = invitations.some(
    (invitation) => invitation.status === INVITATION_STATUS.PUBLISHED,
  );

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: 'Clients', href: ROUTES.ADMIN }, { label: client.full_name }]} />

      <header>
        <Eyebrow>Client</Eyebrow>
        <h1 className="mt-2 font-heading text-[34px] leading-tight">{client.full_name}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span>{client.email}</span>
          {chat ? (
            <a className="text-wine hover:underline" href={chat} rel="noreferrer" target="_blank">
              {client.phone} · WhatsApp
            </a>
          ) : (
            <span>{client.phone}</span>
          )}
          <span>{client.user_id ? 'Has an account' : 'Not invited yet'}</span>
        </p>
        {client.notes ? <p className="mt-3 max-w-prose">{client.notes}</p> : null}
      </header>

      {/* <details>: closed by default, no JavaScript needed. */}
      <details className={PANEL}>
        <summary className={SUMMARY}>Edit details</summary>
        <ActionForm
          action={updateClient}
          className="mt-5 grid gap-4"
          submitLabel="Save"
          successMessage="Saved."
        >
          <input name="clientId" type="hidden" value={client.id} />
          <Field defaultValue={client.full_name} label="Full name" name="fullName" required />
          <Field defaultValue={client.phone} label="Phone" name="phone" required />
          <TextareaField defaultValue={client.notes} label="Notes" name="notes" />
        </ActionForm>
      </details>

      <section className="grid gap-4">
        <h2 className="font-heading text-[24px]">Orders</h2>
        {client.orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        <details className={PANEL}>
          <summary className={SUMMARY}>Add an order</summary>
          <ActionForm
            action={addOrder}
            className="mt-5 grid gap-4"
            submitLabel="Add order"
            successMessage="Order added."
          >
            <input name="clientId" type="hidden" value={client.id} />
            <OrderFields />
          </ActionForm>
        </details>
      </section>

      <section className="grid gap-3 rounded-2xl border border-wine/30 p-5 sm:p-6">
        <h2 className="font-heading text-[20px]">Delete client</h2>
        <p className="text-muted-foreground">
          Removes the client with their orders, invitations and uploaded files. Use it for test
          records and clients who never went ahead.
        </p>
        <div>
          <DeleteClientDialog
            blocked={blocked}
            clientId={client.id}
            fullName={client.full_name}
            invitations={invitations.length}
            orders={client.orders.length}
          />
        </div>
      </section>
    </main>
  );
}
