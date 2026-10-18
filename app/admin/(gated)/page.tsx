import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoSubmitForm } from '@/components/admin/AutoSubmitForm';
import { ClientRows } from '@/components/admin/ClientRows';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { LIVE_TABLE, LiveRefresh } from '@/components/LiveRefresh';
import { SummaryTiles } from '@/components/admin/SummaryTiles';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { clientFiltersSchema, getOrderSummary, listClients } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS, TIER_LABELS } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS } from '@/lib/orders/status';
import { ADMIN_NOTICE, NOTICE_PARAM, ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Clients' };

/* Only known notices render, so the query string cannot put arbitrary text
   on the page. */
const NOTICES: Record<string, string> = {
  [ADMIN_NOTICE.CLIENT_DELETED]: 'Client deleted.',
  [ADMIN_NOTICE.CLIENT_DELETED_FILES_LEFT]:
    'Client deleted. Some uploaded files could not be removed; they are harmless but take space.',
  [ADMIN_NOTICE.CLIENT_DELETED_ACCOUNT_LEFT]:
    'Client deleted. Their sign-in could not be removed; delete it under Supabase Auth.',
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filters = clientFiltersSchema.parse(params);
  const now = new Date();
  const [clients, counts] = await Promise.all([listClients(filters, now), getOrderSummary(now)]);
  const filtering = Boolean(filters.q || filters.status || filters.tier || filters.view);
  const raw = params[NOTICE_PARAM];
  const notice = typeof raw === 'string' && Object.hasOwn(NOTICES, raw) ? NOTICES[raw] : null;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <LiveRefresh tables={[LIVE_TABLE.ORDERS, LIVE_TABLE.REVIEWS]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Studio</Eyebrow>
          <h1 className="mt-2 font-heading text-[34px] leading-tight">Clients</h1>
        </div>
        <Link className={buttonVariants({ size: 'lg' })} href={ROUTES.ADMIN_NEW_CLIENT}>
          New client
        </Link>
      </header>

      {notice ? (
        <p className="rounded-xl border bg-card px-4 py-3" role="status">
          {notice}
        </p>
      ) : null}

      <SummaryTiles counts={counts} current={filters.view} />

      {/* A plain GET form: the URL is shareable and it works without
          JavaScript; selects apply on change. */}
      <AutoSubmitForm className="flex flex-wrap gap-2">
        {filters.view ? <input name="view" type="hidden" value={filters.view} /> : null}
        <Input
          aria-label="Search clients"
          className="w-full sm:w-64"
          defaultValue={filters.q ?? ''}
          name="q"
          placeholder="Name, email or phone"
        />
        <NativeSelect aria-label="Stage" defaultValue={filters.status ?? ''} name="status">
          <option value="">Any stage</option>
          {Object.values(ORDER_STATUS).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status].admin}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Tier" defaultValue={filters.tier ?? ''} name="tier">
          <option value="">Any tier</option>
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </NativeSelect>
        {filtering ? (
          <Link className={buttonVariants({ variant: 'ghost' })} href={ROUTES.ADMIN}>
            Clear
          </Link>
        ) : null}
      </AutoSubmitForm>

      {clients.length > 0 ? (
        <ClientRows clients={clients} now={now} />
      ) : filtering ? (
        <p className="text-muted-foreground">No clients match.</p>
      ) : (
        <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <p className="font-heading text-[24px]">No clients yet</p>
          <p className="max-w-sm text-muted-foreground">
            Add the first one when an order comes in on WhatsApp.
          </p>
          <Link className={buttonVariants()} href={ROUTES.ADMIN_NEW_CLIENT}>
            New client
          </Link>
        </div>
      )}
    </main>
  );
}
