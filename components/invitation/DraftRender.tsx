import { TemplateRenderer } from '@/components/invitation/TemplateRenderer';
import { getTemplateEntry } from '@/components/invitation/registry';
import { entitlementsSchema, themeSchema } from '@/lib/schemas/invitation';

type DraftRenderProps = {
  templateSlug: string;
  content: unknown;
  theme: unknown;
  entitlements: unknown;
  /** Shown when the content does not yet satisfy the design's schema. */
  incompleteMessage: string;
};

/**
 * A draft rendered exactly as a guest will see it. Callers place it OUTSIDE
 * AppSurface: shadcn's base styles would repaint the design.
 */
export function DraftRender({
  templateSlug,
  content,
  theme,
  entitlements,
  incompleteMessage,
}: DraftRenderProps) {
  const design = getTemplateEntry(templateSlug);
  const parsed = design?.schema.safeParse(content);

  if (!parsed?.success) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 24, fontSize: 14 }}>
        <p>{incompleteMessage}</p>
      </main>
    );
  }

  return (
    <TemplateRenderer
      content={parsed.data}
      entitlements={entitlementsSchema.parse(entitlements)}
      templateSlug={templateSlug}
      theme={themeSchema.parse(theme)}
    />
  );
}
