export const PUBLISH_BLOCK = {
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

/** Deep equality for JSON values, blind to object key order. */
export function sameContent(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
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
