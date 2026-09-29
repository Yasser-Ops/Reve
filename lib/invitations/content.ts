import { z } from 'zod';
import { getTemplateEntry } from '@/components/invitation/registry';
import type { Json } from '@/lib/supabase/database.types';

export type ContentIssue = { path: string; message: string };

/**
 * A value as a jsonb column accepts it. Validated rather than asserted: a
 * design's parsed content is JSON by construction, and this proves it to the
 * type system without a cast.
 */
export function toJson(value: unknown): Json {
  return z.json().parse(value);
}

/**
 * The operator's JSON, checked against the design it is for. On success the
 * content comes back PARSED (defaults applied), which is what gets stored.
 */
export function checkContent(
  templateSlug: string,
  raw: string,
): { ok: true; content: Json } | { ok: false; issues: ContentIssue[] } {
  const design = getTemplateEntry(templateSlug);
  if (!design) {
    return { ok: false, issues: [{ path: '', message: `Unknown design "${templateSlug}"` }] };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unreadable';
    return { ok: false, issues: [{ path: '', message: `Not valid JSON: ${detail}` }] };
  }

  const parsed = design.schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  return { ok: true, content: toJson(parsed.data) };
}
