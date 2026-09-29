import { describe, expect, it } from 'vitest';
import { TIERS } from '@/lib/constants';
import {
  ORDER_STATUS,
  STATUS_LABELS,
  allowedMoves,
  canMove,
  flowFor,
  hasReached,
} from '@/lib/orders/status';

describe('order stages', () => {
  it('runs a ready-drawn design straight into design once paid', () => {
    expect(flowFor(TIERS.MANAGED)).toEqual([
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PAID,
      ORDER_STATUS.IN_DESIGN,
      ORDER_STATUS.REVIEW,
      ORDER_STATUS.DELIVERED,
    ]);
  });

  it('gives Custom its brief and concept stages', () => {
    expect(flowFor(TIERS.CUSTOM)).toEqual([
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PAID,
      ORDER_STATUS.BRIEF,
      ORDER_STATUS.CONCEPT,
      ORDER_STATUS.IN_DESIGN,
      ORDER_STATUS.REVIEW,
      ORDER_STATUS.DELIVERED,
    ]);
  });

  it('moves one stage forward or back, or cancels', () => {
    expect(allowedMoves(TIERS.BASIC, ORDER_STATUS.PAID)).toEqual([
      ORDER_STATUS.IN_DESIGN,
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.CANCELLED,
    ]);
  });

  /* Delivery is what publishing does. A button that skipped the publish
     guard would ship an unapproved invitation. */
  it('never moves to delivered directly', () => {
    expect(allowedMoves(TIERS.MANAGED, ORDER_STATUS.REVIEW)).not.toContain(
      ORDER_STATUS.DELIVERED,
    );
    expect(canMove(TIERS.MANAGED, ORDER_STATUS.REVIEW, ORDER_STATUS.DELIVERED)).toBe(false);
  });

  it('refuses a Custom stage on a ready-drawn order', () => {
    expect(canMove(TIERS.BASIC, ORDER_STATUS.PAID, ORDER_STATUS.BRIEF)).toBe(false);
  });

  it('ends at delivered and cancelled', () => {
    expect(allowedMoves(TIERS.BASIC, ORDER_STATUS.DELIVERED)).toEqual([]);
    expect(allowedMoves(TIERS.BASIC, ORDER_STATUS.CANCELLED)).toEqual([]);
  });

  it('knows whether an order has been paid for', () => {
    expect(hasReached(TIERS.BASIC, ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PAID)).toBe(false);
    expect(hasReached(TIERS.BASIC, ORDER_STATUS.REVIEW, ORDER_STATUS.PAID)).toBe(true);
    expect(hasReached(TIERS.BASIC, ORDER_STATUS.CANCELLED, ORDER_STATUS.PAID)).toBe(false);
  });

  it('labels every stage for both audiences, without em-dashes', () => {
    for (const status of Object.values(ORDER_STATUS)) {
      expect(STATUS_LABELS[status].admin.length).toBeGreaterThan(0);
      expect(STATUS_LABELS[status].client).not.toContain('—');
    }
  });
});
