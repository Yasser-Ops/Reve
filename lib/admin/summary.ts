import { ORDER_STATUS, type OrderStatus } from '@/lib/orders/status';

/** The list's quick views, carried in `?view=`. */
export const CLIENT_VIEWS = {
  ACTIVE: 'active',
  DUE: 'due',
  OVERDUE: 'overdue',
  REVIEW: 'review',
} as const;

export type ClientView = (typeof CLIENT_VIEWS)[keyof typeof CLIENT_VIEWS];

/** "Due soon" means due within this window from now. */
export const DUE_WINDOW_MS = 48 * 60 * 60 * 1000;

export const CLOSED_STATUSES: readonly OrderStatus[] = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
];

type SummaryOrder = { status: OrderStatus; due_at: string | null };

export function isActive(status: OrderStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}

export function isOverdue(order: SummaryOrder, now: Date): boolean {
  return (
    isActive(order.status) &&
    order.due_at !== null &&
    new Date(order.due_at).getTime() < now.getTime()
  );
}

export function isDueSoon(order: SummaryOrder, now: Date): boolean {
  if (!isActive(order.status) || order.due_at === null) return false;
  const due = new Date(order.due_at).getTime();
  return due >= now.getTime() && due <= now.getTime() + DUE_WINDOW_MS;
}

export function summarize(
  orders: readonly SummaryOrder[],
  now: Date,
): Record<ClientView, number> {
  return {
    active: orders.filter((order) => isActive(order.status)).length,
    due: orders.filter((order) => isDueSoon(order, now)).length,
    overdue: orders.filter((order) => isOverdue(order, now)).length,
    review: orders.filter((order) => order.status === ORDER_STATUS.REVIEW).length,
  };
}
