import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { clientFiltersSchema, listClients } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS } from '@/lib/orders/status';
import { ROUTES, adminRoutes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Clients' };

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filters = clientFiltersSchema.parse(await searchParams);
  const clients = await listClients(filters);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Clients</h1>
        <Link className={buttonVariants()} href={ROUTES.ADMIN_NEW_CLIENT}>
          New client
        </Link>
      </div>

      {/* A plain GET form: filtering needs no JavaScript and the URL is
          shareable. */}
      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <Input
          className="w-64"
          defaultValue={filters.q ?? ''}
          name="q"
          placeholder="Name, email or phone"
        />
        <NativeSelect defaultValue={filters.status ?? ''} name="status">
          <option value="">Any stage</option>
          {Object.values(ORDER_STATUS).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status].admin}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect defaultValue={filters.tier ?? ''} name="tier">
          <option value="">Any tier</option>
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {clients.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No clients match.</p>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Latest order</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const latest = [...client.orders].sort((a, b) =>
                b.created_at.localeCompare(a.created_at),
              )[0];

              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:underline"
                      href={adminRoutes.client(client.id)}
                    >
                      {client.full_name}
                    </Link>
                    <div className="text-muted-foreground">{client.email}</div>
                  </TableCell>
                  <TableCell>
                    {latest.reference} · {latest.tier}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={latest.status} />
                  </TableCell>
                  <TableCell>
                    {latest.due_at ? dateFormat.format(new Date(latest.due_at)) : ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
