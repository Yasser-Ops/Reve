import { getTemplate, type TemplateProps } from '@/components/invitation/registry';

type TemplateRendererProps = TemplateProps & {
  templateSlug: string;
};

/**
 * Renders the template registered under `templateSlug`.
 *
 * react-hooks/static-components fires on any component resolved during render,
 * because a freshly created component type would remount its subtree on every
 * render. That cannot happen here: the registry is a module-level constant map,
 * so `getTemplate` returns the same reference for a given slug for the lifetime
 * of the process. Selecting a template by slug is the seam that makes templates
 * pluggable, so the lookup stays and the rule is suppressed at the usage site.
 *
 * Returns null for an unregistered slug; callers decide whether that is a 404.
 */
export function TemplateRenderer({
  templateSlug,
  content,
  theme,
  entitlements,
}: TemplateRendererProps) {
  const Template = getTemplate(templateSlug);

  if (!Template) return null;

  return (
    // eslint-disable-next-line react-hooks/static-components
    <Template content={content} entitlements={entitlements} theme={theme} />
  );
}
