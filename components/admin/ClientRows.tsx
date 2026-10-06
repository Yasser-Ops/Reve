import Link from 'next/link';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { ClientListRow } from '@/lib/admin/clients';
import { isOverdue } from '@/lib/admin/summary';
import { TIER_LABELS } from '@/lib/constants';
import { adminRoutes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type ListOrder = ClientListRow['orders'][number];

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function latestOrder(client: ClientListRow): ListOrder {
  return [...client.orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

function Due({ order, now }: { order: ListOrder; now: Date }) {
  if (!order.due_at) return <span className="text-muted-foreground">No date</span>;
  const late = isOverdue(order, now);
  return (
    <span className={cn(late && 'font-medium text-wine')}>
      {late ? 'Overdue · ' : ''}
      {dateFormat.format(new Date(order.due_at))}
    </span>
  );
}

/** A table from md up, stacked cards below it. Same data, same links. */
export function ClientRows({ clients, now }: { clients: readonly ClientListRow[]; now: Date }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="hidden w-full text-left md:table">
        <thead className="border-b text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-normal">Client</th>
            <th className="px-5 py-3 font-normal">Latest order</th>
            <th className="px-5 py-3 font-normal">Stage</th>
            <th className="px-5 py-3 font-normal">Due</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const latest = latestOrder(client);
            return (
              <tr className="border-b last:border-b-0 hover:bg-muted/50" key={client.id}>
                <td className="px-5 py-4">
                  <Link className="font-medium hover:underline" href={adminRoutes.client(client.id)}>
                    {client.full_name}
                  </Link>
                  <div className="text-muted-foreground">{client.phone}</div>
                </td>
                <td className="px-5 py-4">
                  {latest.reference} · {TIER_LABELS[latest.tier]}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={latest.status} />
                </td>
                <td className="px-5 py-4">
                  <Due now={now} order={latest} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="md:hidden">
        {clients.map((client) => {
          const latest = latestOrder(client);
          return (
            <li className="border-b last:border-b-0" key={client.id}>
              <Link className="grid gap-2 p-4" href={adminRoutes.client(client.id)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{client.full_name}</span>
                  <StatusBadge status={latest.status} />
                </span>
                <span className="flex justify-between gap-3 text-muted-foreground">
                  <span>
                    {latest.reference} · {TIER_LABELS[latest.tier]}
                  </span>
                  <Due now={now} order={latest} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
