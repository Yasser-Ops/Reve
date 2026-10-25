import type { CSSProperties } from 'react';
import { TemplateRenderer } from '@/components/invitation/TemplateRenderer';
import { getTemplateEntry } from '@/components/invitation/registry';
import { fillPlaceholders } from '@/lib/schemas/content/placeholders';
import { entitlementsSchema, themeSchema } from '@/lib/schemas/invitation';

type DraftRenderProps = {
  templateSlug: string;
  content: unknown;
  theme: unknown;
  entitlements: unknown;
  /** Shown when the design asks for something no placeholder can stand in for. */
  incompleteMessage: string;
};

export const PLACEHOLDER_NOTE = 'Placeholders until we add them:';

/* Inline styles, like the review bar: this sits on the draft, outside
   AppSurface, where shadcn's tokens are absent. Top left, clear of the view
   switcher on the right. */
const note: CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  zIndex: 70,
  maxWidth: 'calc(100vw - 220px)',
  padding: '7px 12px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.94)',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  color: '#6f2233',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.3,
  WebkitFontSmoothing: 'antialiased',
  textRendering: 'optimizeLegibility',
};

/**
 * A draft rendered exactly as a guest will see it, with neutral placeholders
 * where the core is still empty and a note saying which. Callers place it
 * OUTSIDE AppSurface: shadcn's base styles would repaint the design.
 */
export function DraftRender({
  templateSlug,
  content,
  theme,
  entitlements,
  incompleteMessage,
}: DraftRenderProps) {
  const design = getTemplateEntry(templateSlug);
  const draft = design ? fillPlaceholders(design.schema, content) : null;

  if (!draft) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 24, fontSize: 14 }}>
        <p>{incompleteMessage}</p>
      </main>
    );
  }

  return (
    <>
      {/* Hides the window scrollbar (globals.css): a preview scrolls like a phone. */}
      <span data-bare-preview hidden />
      {draft.placeholders.length > 0 ? (
        <p role="status" style={note}>
          {`${PLACEHOLDER_NOTE} ${draft.placeholders.join(', ').toLowerCase()}.`}
        </p>
      ) : null}
      <TemplateRenderer
        content={draft.content}
        entitlements={entitlementsSchema.parse(entitlements)}
        templateSlug={templateSlug}
        theme={themeSchema.parse(theme)}
      />
    </>
  );
}
