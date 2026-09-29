'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { checkContent } from '@/lib/invitations/content';
import { DELIVERY } from '@/lib/offer';
import { ORDER_STATUS, canMove } from '@/lib/orders/status';
import { planUpgrade } from '@/lib/orders/upgrade';
import { adminRoutes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const HOUR_MS = 3_600_000;

const moveSchema = z.object({
  orderId: z.uuid(),
  to: z.enum(ORDER_STATUS),
});

export async function moveOrder(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = moveSchema.safeParse({ orderId: formData.get('orderId'), to: formData.get('to') });
  if (!input.success) return { ok: false, message: 'Unknown stage.' };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, tier, status, due_at, client_id, invitations(id, template_slug, content)')
    .eq('id', input.data.orderId)
    .maybeSingle();
  if (error) return { ok: false, message: UNEXPECTED };
  if (!order) return { ok: false, message: 'That order no longer exists.' };

  const { to } = input.data;
  if (!canMove(order.tier, order.status, to)) {
    return { ok: false, message: 'That order cannot move to that stage from here.' };
  }

  /* Review needs something the client can actually approve. */
  if (to === ORDER_STATUS.REVIEW) {
    const invitation = order.invitations;
    if (!invitation) {
      return { ok: false, message: 'Create the invitation before sending it for review.' };
    }
    const check = checkContent(invitation.template_slug, JSON.stringify(invitation.content));
    if (!check.ok) {
      return {
        ok: false,
        message: 'The invitation content is not complete for its design yet.',
        issues: check.issues,
      };
    }
  }

  /* The delivery promise starts when payment lands. Custom makes no promise. */
  const dueAt =
    to === ORDER_STATUS.PAID && !order.due_at && order.tier !== DELIVERY.excludesTier
      ? new Date(Date.now() + DELIVERY.hours * HOUR_MS).toISOString()
      : order.due_at;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: to, due_at: dueAt, updated_at: new Date().toISOString() })
    .eq('id', order.id);
  if (updateError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(order.client_id));
  return { ok: true };
}

const upgradeSchema = z.object({
  orderId: z.uuid(),
  tier: z.enum(TIERS),
  amount: z.coerce.number().min(0).max(100_000),
});

export async function applyUpgrade(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = upgradeSchema.safeParse({
    orderId: formData.get('orderId'),
    tier: formData.get('tier'),
    amount: formData.get('amount'),
  });
  if (!input.success) return { ok: false, message: 'Check the upgrade details.' };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, tier, client_id')
    .eq('id', input.data.orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, message: UNEXPECTED };

  const plan = planUpgrade(order.tier, input.data.tier);
  if (!plan) return { ok: false, message: 'An upgrade must be to a higher tier.' };

  const { error: orderError } = await supabase
    .from('orders')
    .update({ tier: plan.tier, amount: input.data.amount })
    .eq('id', order.id);
  if (orderError) return { ok: false, message: UNEXPECTED };

  const { error: invitationError } = await supabase
    .from('invitations')
    .update({ entitlements: plan.entitlements })
    .eq('order_id', order.id);
  if (invitationError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(order.client_id));
  return { ok: true };
}
