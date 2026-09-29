import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { checklistFor, checklistMessage } from '@/lib/schemas/content/checklist';
import { coreContentSchema } from '@/lib/schemas/content/core';

const schema = coreContentSchema.extend({
  message: BLOCKS.message,
  schedule: BLOCKS.schedule,
});

describe('checklistFor', () => {
  it('lists every field in declaration order, with its ask', () => {
    const items = checklistFor(schema);

    expect(items.map((item) => item.key)).toEqual([
      'coupleFirstName',
      'couplePartnerName',
      'initials',
      'eventDate',
      'venue',
      'message',
      'schedule',
    ]);
    for (const item of items) expect(item.ask.length).toBeGreaterThan(0);
  });

  it('marks optional and defaulted fields as not required', () => {
    const byKey = Object.fromEntries(
      checklistFor(schema).map((item) => [item.key, item.required]),
    );

    expect(byKey.coupleFirstName).toBe(true);
    expect(byKey.venue).toBe(true);
    expect(byKey.message).toBe(false);
    expect(byKey.schedule).toBe(false);
  });

  /* A field without an ask is a field the operator cannot request, so a
     design that forgets one must fail here rather than ship a checklist with
     a silent gap. */
  it('throws on a field with no ask', () => {
    const careless = coreContentSchema.extend({ dressCode: z.string() });
    expect(() => checklistFor(careless)).toThrow(/dressCode/);
  });
});

describe('checklistMessage', () => {
  it('numbers the asks and marks the optional ones', () => {
    const message = checklistMessage([
      { key: 'a', ask: 'Your names', required: true },
      { key: 'b', ask: 'A short message', required: false },
    ]);

    expect(message).toBe('1. Your names\n2. A short message (optional)');
  });
});
