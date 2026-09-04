import { notFound } from 'next/navigation';
import { getTemplate } from '@/components/invitation/registry';
import {
  SAMPLE_CONTENT,
  SAMPLE_ENTITLEMENTS,
  SAMPLE_THEME,
} from '@/lib/sample-invitation';

/**
 * Renders one registered template at full size against the sample wedding.
 *
 * The collection scales templates into thumbnails, which is the wrong lens for
 * judging a drawn sheet: artwork and spacing only read at the size a guest
 * actually holds. This route is that view.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const Template = getTemplate(slug);

  if (!Template) notFound();

  return (
    /* Same reasoning as TemplateRenderer: the registry is a module-level
       constant map, so this is a stable reference, not a component built
       during render. */
    // eslint-disable-next-line react-hooks/static-components
    <Template
      content={SAMPLE_CONTENT}
      entitlements={SAMPLE_ENTITLEMENTS}
      theme={SAMPLE_THEME}
    />
  );
}
