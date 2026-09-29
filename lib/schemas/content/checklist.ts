import type { z } from 'zod';

export type ChecklistItem = {
  key: string;
  ask: string;
  required: boolean;
};

/**
 * What to ask a client for, read off a design's schema.
 *
 * `required` is whether the field rejects `undefined`: optional and defaulted
 * fields both accept it, and both are things a client may skip.
 */
export function checklistFor(schema: z.ZodObject): ChecklistItem[] {
  return Object.entries(schema.shape).map(([key, field]) => {
    const ask = field.meta()?.ask;

    if (!ask) {
      throw new Error(
        `Content field "${key}" has no ask. Every field a design draws must say how to request it: add .meta({ ask }).`,
      );
    }

    return { key, ask, required: !field.safeParse(undefined).success };
  });
}

/** The checklist as one WhatsApp-ready message. */
export function checklistMessage(items: readonly ChecklistItem[]): string {
  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.ask}${item.required ? '' : ' (optional)'}`,
    )
    .join('\n');
}
