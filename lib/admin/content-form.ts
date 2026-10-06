import { z } from 'zod';
import type { MediaKind } from '@/lib/admin/media-paths';

type Base = { key: string; label: string; required: boolean };

/** One field of a design's content, as the editor draws it. Plain data: it crosses to the client. */
export type FormField =
  | (Base & { kind: 'text' | 'textarea' | 'datetime' | 'url' })
  | (Base & { kind: 'choice'; options: string[] })
  | (Base & { kind: 'media'; media: MediaKind })
  | (Base & { kind: 'group'; fields: FormField[] })
  | (Base & { kind: 'list'; item: FormField[] });

/** Uploaded file URLs per kind, offered by media fields. */
export type MediaOptions = Record<MediaKind, string[]>;

function unwrap(schema: z.ZodType): z.ZodType {
  let inner = schema;
  while (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault) {
    /* unwrap() is typed as zod's core type; every classic schema is a ZodType. */
    const next = inner.unwrap();
    if (!(next instanceof z.ZodType)) break;
    inner = next;
  }
  return inner;
}

function describe(key: string, path: string, schema: z.ZodType): FormField {
  const inner = unwrap(schema);
  /* `.meta()` may sit on the wrapper (`.optional().meta()`) or on the inner type. */
  const meta = { ...inner.meta(), ...schema.meta() };
  if (!meta.label) {
    throw new Error(
      `Content field "${path}" has no label. Add .meta({ label }) so the editor can show it.`,
    );
  }

  const base: Base = { key, label: meta.label, required: !schema.safeParse(undefined).success };

  if (meta.media) return { ...base, kind: 'media', media: meta.media };
  if (inner instanceof z.ZodISODateTime) return { ...base, kind: 'datetime' };
  if (inner instanceof z.ZodURL) return { ...base, kind: 'url' };
  if (inner instanceof z.ZodString) return { ...base, kind: meta.multiline ? 'textarea' : 'text' };
  if (inner instanceof z.ZodEnum) {
    return { ...base, kind: 'choice', options: inner.options.map(String) };
  }
  if (inner instanceof z.ZodObject) return { ...base, kind: 'group', fields: fieldsOf(inner, path) };
  if (inner instanceof z.ZodArray && inner.element instanceof z.ZodObject) {
    return { ...base, kind: 'list', item: fieldsOf(inner.element, path) };
  }

  throw new Error(
    `Content field "${path}" has a type the editor cannot show. Teach formModel about it.`,
  );
}

function fieldsOf(schema: z.ZodObject, prefix: string): FormField[] {
  return Object.entries(schema.shape).map(([key, field]) =>
    describe(key, prefix ? `${prefix}.${key}` : key, field),
  );
}

/** The editor's form for a design, read off the design's own schema. */
export function formModel(schema: z.ZodObject): FormField[] {
  return fieldsOf(schema, '');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pruneField(field: FormField, current: unknown): unknown {
  if (field.kind === 'group') {
    if (!isRecord(current)) return current;
    const inner = pruneContent(field.fields, current);
    return !field.required && Object.keys(inner).length === 0 ? undefined : inner;
  }
  if (field.kind === 'list') {
    return Array.isArray(current)
      ? current.map((row) => (isRecord(row) ? pruneContent(field.item, row) : row))
      : current;
  }
  if (!field.required && typeof current === 'string' && current.trim() === '') return undefined;
  return current;
}

/**
 * The form's value as it should be saved: emptied optional fields are
 * removed, never stored as "". Required fields stay, even empty, so the
 * server's check names what is missing. Keys the form does not know are kept.
 */
export function pruneContent(
  fields: readonly FormField[],
  value: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...value };
  for (const field of fields) {
    if (!(field.key in out)) continue;
    const pruned = pruneField(field, out[field.key]);
    if (pruned === undefined) delete out[field.key];
    else out[field.key] = pruned;
  }
  return out;
}

/** A fresh value for a group or list row: required fields empty, optional ones absent. */
export function emptyValue(fields: readonly FormField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.required) continue;
    if (field.kind === 'group') out[field.key] = emptyValue(field.fields);
    else if (field.kind === 'list') out[field.key] = [];
    else if (field.kind === 'choice') out[field.key] = field.options[0] ?? '';
    else out[field.key] = '';
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A stored instant as a `datetime-local` value in the browser's zone. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A `datetime-local` value (browser zone) as the stored ISO instant. */
export function localInputToIso(local: string): string {
  if (!local) return '';
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** The Advanced tab's text, read back for the form. */
export function parseContentText(
  text: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unreadable';
    return { ok: false, message: `Not valid JSON: ${detail}` };
  }
  return isRecord(value)
    ? { ok: true, value }
    : { ok: false, message: 'The content must be one JSON object.' };
}
