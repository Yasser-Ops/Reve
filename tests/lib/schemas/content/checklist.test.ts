import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { checklistFor, checklistMessage, checklistProgress } from '@/lib/schemas/content/checklist';
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

describe('checklistProgress', () => {
  const doneByKey = (content: unknown) =>
    Object.fromEntries(checklistProgress(schema, content).map((item) => [item.key, item.done]));

  it('marks nothing done for empty content', () => {
    expect(Object.values(doneByKey({})).every((done) => !done)).toBe(true);
  });

  it('marks a filled field done and leaves the rest', () => {
    const done = doneByKey({ coupleFirstName: 'Maya' });
    expect(done.coupleFirstName).toBe(true);
    expect(done.venue).toBe(false);
  });

  it('does not count an empty string or an empty array', () => {
    const done = doneByKey({ coupleFirstName: '', schedule: [] });
    expect(done.coupleFirstName).toBe(false);
    expect(done.schedule).toBe(false);
  });

  it('does not count a value the field rejects', () => {
    expect(doneByKey({ eventDate: 12 }).eventDate).toBe(false);
  });

  it('marks nothing done when the content is not an object', () => {
    for (const content of [null, undefined, 'text', 4, ['a']]) {
      expect(Object.values(doneByKey(content)).every((done) => !done)).toBe(true);
    }
  });
});
