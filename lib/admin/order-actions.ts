'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getTemplateEntry } from '@/components/invitation/registry';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { entitlementsForTier } from '@/lib/entitlements';
import { checkContent } from '@/lib/invitations/content';
import { proposeSlug, withSuffix } from '@/lib/invitations/slug';
import { DELIVERY } from '@/lib/offer';
import { ORDER_STATUS, canMove, hasReached } from '@/lib/orders/status';
import { planUpgrade } from '@/lib/orders/upgrade';
import { adminRoutes } from '@/lib/routes';
import { themeSchema } from '@/lib/schemas/invitation';
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

const provisionSchema = z.object({ orderId: z.uuid(), templateSlug: z.string().min(1) });

export async function provisionInvitation(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = provisionSchema.safeParse({
    orderId: formData.get('orderId'),
    templateSlug: formData.get('templateSlug'),
  });
  if (!input.success) return { ok: false, message: 'Choose a design.' };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, tier, status, client_id, clients(full_name), invitations(id)')
    .eq('id', input.data.orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, message: UNEXPECTED };

  if (!hasReached(order.tier, order.status, ORDER_STATUS.PAID)) {
    return { ok: false, message: 'Mark the order paid before creating its invitation.' };
  }
  if (order.invitations) return { ok: false, message: 'This order already has an invitation.' };
  if (!getTemplateEntry(input.data.templateSlug)) {
    return { ok: false, message: 'That design does not exist.' };
  }

  /* Proposed from the client's name; renamed in the editor until the first
     publish. Taken slugs are read up front so the insert does not collide. */
  const base = proposeSlug(order.clients?.full_name ?? '');
  const { data: taken, error: takenError } = await supabase
    .from('invitations')
    .select('slug')
    .like('slug', `${base}%`);
  if (takenError) return { ok: false, message: UNEXPECTED };

  const { data: created, error: insertError } = await supabase
    .from('invitations')
    .insert({
      order_id: order.id,
      slug: withSuffix(base, new Set((taken ?? []).map((row) => row.slug))),
      template_slug: input.data.templateSlug,
      status: 'draft',
      content: {},
      theme: themeSchema.parse({}),
      entitlements: entitlementsForTier(order.tier),
    })
    .select('id')
    .single();
  if (insertError) return { ok: false, message: UNEXPECTED };

  redirect(adminRoutes.invitation(created.id));
}
