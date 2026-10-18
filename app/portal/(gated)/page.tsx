import type { Metadata } from 'next';
import { OrderPanel } from '@/components/portal/OrderPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { requireClient } from '@/lib/auth/guards';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';
import { getPortalOrders } from '@/lib/portal/orders';
import { NOTICE_PARAM, PORTAL_NOTICE } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
};

/* Only the known notice renders, so the query string cannot put arbitrary
   text on the page. */
export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requireClient();
  const orders = await getPortalOrders();
  const othersKept = (await searchParams)[NOTICE_PARAM] === PORTAL_NOTICE.OTHERS_KEPT;

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl">Welcome, {client.fullName}</h1>

      {othersKept ? (
        <Alert>
          <AlertDescription>{PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT}</AlertDescription>
        </Alert>
      ) : null}

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Your order will appear here once we set it up.</p>
      ) : (
        orders.map((order) => <OrderPanel key={order.id} order={order} />)
      )}
    </main>
  );
}
