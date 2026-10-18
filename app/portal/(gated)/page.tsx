import type { Metadata } from 'next';
import { OrderPanel } from '@/components/portal/OrderPanel';
import { ReviewForm } from '@/components/portal/ReviewForm';
import { requireClient } from '@/lib/auth/guards';
import { getPortalOrders } from '@/lib/portal/orders';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false, follow: false },
};

export default async function PortalHomePage() {
  const client = await requireClient();
  const orders = await getPortalOrders();

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl">Welcome, {client.fullName}</h1>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Your order will appear here once we set it up.</p>
      ) : (
        orders.map((order) => (
          <OrderPanel
            key={order.id}
            order={order}
            review={
              order.invitation ? (
                <ReviewForm
                  invitationId={order.invitation.id}
                  latestReview={order.invitation.latestReview}
                />
              ) : null
            }
          />
        ))
      )}
    </main>
  );
}
