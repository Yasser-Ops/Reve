import { z } from 'zod';
import { PREVIEW_VIEW, type PreviewView } from '@/lib/routes';

/** Wider than this, the preview opens in the phone; at or below it, full screen. */
export const PHONE_VIEW_MIN_WIDTH = 641;
export const WIDE_VIEWPORT_QUERY = `(min-width: ${PHONE_VIEW_MIN_WIDTH}px)`;

const previewViewSchema = z.enum([PREVIEW_VIEW.PHONE, PREVIEW_VIEW.FULL]);

/**
 * The view the URL asks for, or null when it asks for none or for something
 * unknown. Null means "the default for this viewport", decided by the caller,
 * so a bad link falls back exactly as a bare one does.
 */
export function parsePreviewView(raw: unknown): PreviewView | null {
  const parsed = previewViewSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** The view a viewport gets when the URL does not choose one. */
export function defaultPreviewView(wide: boolean): PreviewView {
  return wide ? PREVIEW_VIEW.PHONE : PREVIEW_VIEW.FULL;
}
