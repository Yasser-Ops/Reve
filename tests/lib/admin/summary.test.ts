import { describe, expect, it } from 'vitest';
import { isDueSoon, isOverdue, summarize } from '@/lib/admin/summary';

const now = new Date('2026-10-06T12:00:00.000Z');
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

describe('order summary', () => {
  it('counts active, due within 48 hours, overdue and awaiting approval', () => {
    expect(
      summarize(
        [
          { status: 'paid', due_at: hours(10) },
          { status: 'in_design', due_at: hours(-1) },
          { status: 'review', due_at: null },
          { status: 'pending_payment', due_at: hours(72) },
          { status: 'delivered', due_at: hours(-50) },
          { status: 'cancelled', due_at: hours(-50) },
        ],
        now,
      ),
    ).toEqual({ active: 4, due: 1, overdue: 1, review: 1 });
  });

  it('never calls a delivered or cancelled order overdue', () => {
    expect(isOverdue({ status: 'delivered', due_at: hours(-5) }, now)).toBe(false);
    expect(isOverdue({ status: 'cancelled', due_at: hours(-5) }, now)).toBe(false);
  });

  it('treats the 48-hour edge as due and anything past it as not yet', () => {
    expect(isDueSoon({ status: 'paid', due_at: hours(48) }, now)).toBe(true);
    expect(isDueSoon({ status: 'paid', due_at: hours(49) }, now)).toBe(false);
  });
});
