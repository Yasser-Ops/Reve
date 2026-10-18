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

/**
 * The checklist with what the client has already given. A field is done when
 * it holds a value its own schema accepts; an empty string or list is the
 * blank a draft starts with, not an answer.
 */
export function checklistProgress(
  schema: z.ZodObject,
  content: unknown,
): (ChecklistItem & { done: boolean })[] {
  const values: Record<string, unknown> =
    typeof content === 'object' && content !== null && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};

  return checklistFor(schema).map((item) => {
    const value = values[item.key];
    const filled =
      value !== undefined &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0) &&
      schema.shape[item.key].safeParse(value).success;

    return { ...item, done: filled };
  });
}
