import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';
import { TemplateRenderer } from '@/components/invitation/TemplateRenderer';
import { getTemplate } from '@/components/invitation/registry';
import { getPublishedInvitation } from '@/lib/invitations/get-published';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  if (!invitation) return { title: 'Invitation' };

  const { coupleFirstName, couplePartnerName } = invitation.content;

  return {
    title: `${coupleFirstName} & ${couplePartnerName}`,
    description: invitation.content.headline ?? 'You are invited.',
  };
}

/**
 * The live invitation. Entitlements resolve here, once, and travel down as a
 * prop: no component below this point ever asks which tier was purchased.
 *
 * A missing invitation, an unpublished one, and an unregistered template all
 * produce the same 404 — never a blank page.
 */
export default async function InvitationPage({ params }: PageProps) {
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  if (!invitation) notFound();

  if (!getTemplate(invitation.templateSlug)) notFound();

  return (
    <EnvelopeGate initials={invitation.content.initials}>
      <TemplateRenderer
        content={invitation.content}
        entitlements={invitation.entitlements}
        templateSlug={invitation.templateSlug}
        theme={invitation.theme}
      />
    </EnvelopeGate>
  );
}
