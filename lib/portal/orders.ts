import 'server-only';
import type { Tier } from '@/lib/constants';
import { ORDER_STATUS, type OrderStatus } from '@/lib/orders/status';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

export type PortalOrder = {
  id: string;
  reference: string;
  tier: Tier;
  status: OrderStatus;
  invitation: {
    id: string;
    slug: string;
    status: Database['public']['Enums']['invitation_status'];
    templateSlug: string;
    content: unknown;
    latestReview: {
      decision: Database['public']['Enums']['review_decision'];
      note: string;
      createdAt: string;
    } | null;
  } | null;
};

/* No notes column anywhere: operator notes are admin-only and RLS hides them. */
const SELECT =
  'id, reference, tier, status, created_at, invitations(id, slug, status, template_slug, content, invitation_reviews(decision, note, created_at))';

/**
 * The signed-in client's orders. The user's own client does the reading, so
 * RLS is what scopes it to their orders; nothing here names the client.
 */
export async function getPortalOrders(): Promise<PortalOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(SELECT)
    .neq('status', ORDER_STATUS.CANCELLED)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((order) => {
    const invitation = order.invitations;
    /* ISO timestamps from one column sort as text. */
    const latest = invitation?.invitation_reviews
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
      .at(0);

    return {
      id: order.id,
      reference: order.reference,
      tier: order.tier,
      status: order.status,
      invitation: invitation
        ? {
            id: invitation.id,
            slug: invitation.slug,
            status: invitation.status,
            templateSlug: invitation.template_slug,
            content: invitation.content,
            latestReview: latest
              ? { decision: latest.decision, note: latest.note, createdAt: latest.created_at }
              : null,
          }
        : null,
    };
  });
}
