import { loadTemplate, type TemplateProps } from '@/components/invitation/registry';

type TemplateRendererProps = TemplateProps & {
  templateSlug: string;
  content: unknown;
};

/**
 * Renders the template registered under `templateSlug`.
 *
 * The component is awaited, not built, during render: `defineTemplate`
 * memoises each design, so `loadTemplate` resolves to the same reference for a
 * given slug for the life of the process and React never sees a new type that
 * would remount the invitation.
 *
 * Returns null for an unregistered slug; callers decide whether that is a 404.
 */
export async function TemplateRenderer({
  templateSlug,
  content,
  theme,
  entitlements,
}: TemplateRendererProps) {
  const Template = await loadTemplate(templateSlug);

  if (!Template) return null;

  return <Template content={content} entitlements={entitlements} theme={theme} />;
}
