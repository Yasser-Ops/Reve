import type { Metadata } from 'next';
import { LIVE_TABLE, LiveRefresh } from '@/components/LiveRefresh';
import { OrderPanel } from '@/components/portal/OrderPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { requireClient } from '@/lib/auth/guards';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';
import { getPortalOrders } from '@/lib/portal/orders';
import { getGuestList } from '@/lib/rsvp/read';
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
  /* Only invitations that include replies are read; RLS would refuse the rest anyway. */
  const guestLists = new Map(
    await Promise.all(
      orders.flatMap((order) =>
        order.invitation?.entitlements.rsvp
          ? [getGuestList(order.invitation.id).then((list) => [order.id, list] as const)]
          : [],
      ),
    ),
  );
  const othersKept = (await searchParams)[NOTICE_PARAM] === PORTAL_NOTICE.OTHERS_KEPT;

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      {/* A save, a stage move, a publish or a new reply shows without a reload. */}
      <LiveRefresh
        tables={[LIVE_TABLE.INVITATIONS, LIVE_TABLE.ORDERS, LIVE_TABLE.REVIEWS, LIVE_TABLE.RSVPS]}
      />
      <h1 className="font-heading text-2xl">Welcome, {client.fullName}</h1>

      {othersKept ? (
        <Alert>
          <AlertDescription>{PASSWORD_MESSAGES.CHANGED_OTHERS_KEPT}</AlertDescription>
        </Alert>
      ) : null}

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Your order will appear here once we set it up.</p>
      ) : (
        orders.map((order) => (
          <OrderPanel guestList={guestLists.get(order.id)} key={order.id} order={order} />
        ))
      )}
    </main>
  );
}
