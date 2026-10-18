import { createHash } from 'node:crypto';
import { ORDER_STATUS, type OrderStatus } from '@/lib/orders/status';

export const PUBLISH_BLOCK = {
  NOT_IN_REVIEW: 'Send the order for review before publishing.',
  NO_APPROVAL: 'The client has not approved this invitation yet.',
  CHANGES_REQUESTED: 'The client asked for changes. Send it back for review once they are made.',
  CONTENT_CHANGED:
    'The content changed after the client approved it. Send it for review again, or record their approval of this version.',
} as const;

export type PublishBlock = (typeof PUBLISH_BLOCK)[keyof typeof PUBLISH_BLOCK];

export type LatestReview = {
  decision: 'approved' | 'changes_requested';
  contentSnapshot: unknown;
} | null;

/** Only exactly what the client approved may go live. */
export function canPublish(
  content: unknown,
  latest: LatestReview,
): { ok: true } | { ok: false; reason: PublishBlock } {
  if (!latest) return { ok: false, reason: PUBLISH_BLOCK.NO_APPROVAL };
  if (latest.decision !== 'approved') {
    return { ok: false, reason: PUBLISH_BLOCK.CHANGES_REQUESTED };
  }
  if (!sameContent(content, latest.contentSnapshot)) {
    return { ok: false, reason: PUBLISH_BLOCK.CONTENT_CHANGED };
  }
  return { ok: true };
}

/**
 * Everything publishing checks, in one place, so the Publish button and the
 * action cannot disagree: the order is in review (or delivered, to put an
 * approved edit live), and the content is exactly what was approved.
 */
export function publishReadiness(
  orderStatus: OrderStatus | null,
  content: unknown,
  latest: LatestReview,
): { ok: true } | { ok: false; reason: PublishBlock } {
  if (orderStatus !== ORDER_STATUS.REVIEW && orderStatus !== ORDER_STATUS.DELIVERED) {
    return { ok: false, reason: PUBLISH_BLOCK.NOT_IN_REVIEW };
  }
  return canPublish(content, latest);
}

/** Deep equality for JSON values, blind to object key order. */
export function sameContent(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/** What a form carries to say which version of the content its reader was shown. */
export function contentFingerprint(content: unknown): string {
  return createHash('sha256').update(canonical(content)).digest('hex');
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
