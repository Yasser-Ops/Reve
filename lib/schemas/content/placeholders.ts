import type { z } from 'zod';
import type { CoreContent, DesignSchema } from '@/lib/schemas/content/core';

/**
 * What a draft shows where the core is still empty, so a client can watch
 * their invitation take shape before every detail is in. Neutral on purpose:
 * no one else's names, and each is replaced the moment the operator saves
 * the real value.
 *
 * The date must be a real datetime for the design to draw it; the preview's
 * banner says it is still a placeholder.
 */
export const CORE_PLACEHOLDERS: CoreContent = {
  coupleFirstName: 'Your name',
  couplePartnerName: 'Your partner',
  initials: '··',
  eventDate: '2030-06-15T17:00:00.000Z',
  venue: { name: 'Your venue', addressLine: 'Its address' },
};

export type FilledDraft<C> = {
  content: C;
  /** The editor labels of the fields shown as placeholders, in schema order. */
  placeholders: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The parts of a nested object that are already valid, over its placeholder. */
function mergeValid(
  field: z.ZodType,
  value: unknown,
  placeholder: Record<string, unknown>,
): Record<string, unknown> {
  const given = asRecord(value);
  const shape = (field as Partial<z.ZodObject>).shape;
  if (!given || !shape) return placeholder;

  const merged = { ...placeholder };
  for (const [key, inner] of Object.entries(shape)) {
    if (given[key] !== undefined && inner.safeParse(given[key]).success) merged[key] = given[key];
  }
  return merged;
}

/**
 * A draft with its gaps filled, ready to render, or null when the design asks
 * for something required that has no placeholder.
 *
 * A field that already holds a valid value is kept as is. An invalid optional
 * field is dropped, so the design draws it as absent. A required core field
 * takes its placeholder, keeping whatever nested parts are already valid (a
 * venue with a name but no address keeps the name).
 */
export function fillPlaceholders<S extends DesignSchema>(
  schema: S,
  content: unknown,
): FilledDraft<z.infer<S>> | null {
  const values = asRecord(content) ?? {};
  const filled: Record<string, unknown> = {};
  const placeholders: string[] = [];
  const known: Record<string, unknown> = CORE_PLACEHOLDERS;

  for (const [key, field] of Object.entries(schema.shape)) {
    const value = values[key];
    if (field.safeParse(value).success) {
      if (value !== undefined) filled[key] = value;
      continue;
    }

    const placeholder = known[key];
    if (placeholder === undefined) continue;

    const nested = asRecord(placeholder);
    filled[key] = nested ? mergeValid(field, value, nested) : placeholder;
    placeholders.push(field.meta()?.label ?? key);
  }

  const parsed = schema.safeParse(filled);
  return parsed.success ? { content: parsed.data, placeholders } : null;
}
