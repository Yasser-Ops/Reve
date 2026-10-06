import { TIERS, type Tier } from '@/lib/constants';
import type { Database } from '@/lib/supabase/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  BRIEF: 'brief',
  CONCEPT: 'concept',
  IN_DESIGN: 'in_design',
  REVIEW: 'review',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, OrderStatus>;

const READY_DRAWN: readonly OrderStatus[] = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.IN_DESIGN,
  ORDER_STATUS.REVIEW,
  ORDER_STATUS.DELIVERED,
];

/**
 * The stages an order passes through, per tier. Custom is a design drawn
 * from scratch, so it gathers a brief and shows a concept before design.
 */
const FLOWS: Record<Tier, readonly OrderStatus[]> = {
  [TIERS.BASIC]: READY_DRAWN,
  [TIERS.MANAGED]: READY_DRAWN,
  [TIERS.CUSTOM]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.PAID,
    ORDER_STATUS.BRIEF,
    ORDER_STATUS.CONCEPT,
    ORDER_STATUS.IN_DESIGN,
    ORDER_STATUS.REVIEW,
    ORDER_STATUS.DELIVERED,
  ],
};

export function flowFor(tier: Tier): readonly OrderStatus[] {
  return FLOWS[tier];
}

/**
 * Where an order may go next: one stage forward, one back, or cancelled.
 *
 * DELIVERED is never offered: an order is delivered by publishing its
 * invitation, which checks the client's approval first.
 */
export function allowedMoves(tier: Tier, from: OrderStatus): OrderStatus[] {
  if (from === ORDER_STATUS.DELIVERED || from === ORDER_STATUS.CANCELLED) return [];

  const flow = FLOWS[tier];
  const at = flow.indexOf(from);
  if (at === -1) return [ORDER_STATUS.CANCELLED];

  const moves: OrderStatus[] = [];
  const next = flow[at + 1];
  if (next && next !== ORDER_STATUS.DELIVERED) moves.push(next);
  const previous = flow[at - 1];
  if (previous) moves.push(previous);
  moves.push(ORDER_STATUS.CANCELLED);

  return moves;
}

/** The forward move an order's primary button offers, or null. */
export function nextMove(tier: Tier, from: OrderStatus): OrderStatus | null {
  const flow = FLOWS[tier];
  const at = flow.indexOf(from);
  const next = at === -1 ? undefined : flow[at + 1];
  return next && allowedMoves(tier, from).includes(next) ? next : null;
}

/** The one step back an order may take, or null. */
export function previousMove(tier: Tier, from: OrderStatus): OrderStatus | null {
  const flow = FLOWS[tier];
  const at = flow.indexOf(from);
  const previous = at > 0 ? flow[at - 1] : undefined;
  return previous && allowedMoves(tier, from).includes(previous) ? previous : null;
}

export function canMove(tier: Tier, from: OrderStatus, to: OrderStatus): boolean {
  return allowedMoves(tier, from).includes(to);
}

/** Whether `status` is at or past `target` in the tier's flow. */
export function hasReached(tier: Tier, status: OrderStatus, target: OrderStatus): boolean {
  const flow = FLOWS[tier];
  const at = flow.indexOf(status);
  return at !== -1 && at >= flow.indexOf(target);
}

/** One wording per stage, so the admin and the portal cannot disagree. */
export const STATUS_LABELS: Record<OrderStatus, { admin: string; client: string }> = {
  pending_payment: { admin: 'Awaiting payment', client: 'Awaiting payment' },
  paid: { admin: 'Paid', client: 'Payment received' },
  brief: { admin: 'Brief', client: 'Gathering your brief' },
  concept: { admin: 'Concept', client: 'Drawing your concept' },
  in_design: { admin: 'In design', client: 'We are setting your invitation' },
  review: { admin: 'Awaiting approval', client: 'Ready for your approval' },
  delivered: { admin: 'Delivered', client: 'Live' },
  cancelled: { admin: 'Cancelled', client: 'Cancelled' },
};
