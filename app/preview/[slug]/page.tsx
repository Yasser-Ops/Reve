import { notFound } from 'next/navigation';
import { loadTemplate } from '@/components/invitation/registry';
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
  const Template = await loadTemplate(slug);

  if (!Template) notFound();

  return (
    <Template
      content={SAMPLE_CONTENT}
      entitlements={SAMPLE_ENTITLEMENTS}
      theme={SAMPLE_THEME}
    />
  );
}
