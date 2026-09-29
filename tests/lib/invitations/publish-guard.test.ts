import { describe, expect, it } from 'vitest';
import { PUBLISH_BLOCK, canPublish, sameContent } from '@/lib/invitations/publish-guard';

const content = { coupleFirstName: 'Maya', schedule: [{ time: '19:00', title: 'Dinner' }] };

describe('canPublish', () => {
  it('refuses an invitation nobody approved', () => {
    expect(canPublish(content, null)).toEqual({ ok: false, reason: PUBLISH_BLOCK.NO_APPROVAL });
  });

  it('refuses when the latest word was a request for changes', () => {
    expect(
      canPublish(content, { decision: 'changes_requested', contentSnapshot: content }),
    ).toEqual({ ok: false, reason: PUBLISH_BLOCK.CHANGES_REQUESTED });
  });

  /* Review Focus 1: approval covers exactly what the client saw. */
  it('refuses content edited after the approval', () => {
    const edited = { ...content, coupleFirstName: 'Mayya' };
    expect(canPublish(edited, { decision: 'approved', contentSnapshot: content })).toEqual({
      ok: false,
      reason: PUBLISH_BLOCK.CONTENT_CHANGED,
    });
  });

  it('allows exactly what was approved', () => {
    expect(canPublish(content, { decision: 'approved', contentSnapshot: content })).toEqual({
      ok: true,
    });
  });
});

describe('sameContent', () => {
  /* jsonb does not keep key order, so equality must not depend on it. */
  it('ignores key order', () => {
    expect(sameContent({ a: 1, b: [{ c: 2, d: 3 }] }, { b: [{ d: 3, c: 2 }], a: 1 })).toBe(true);
  });

  it('respects array order', () => {
    expect(sameContent([1, 2], [2, 1])).toBe(false);
  });
});
