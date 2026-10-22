import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';
import { ReveCredit } from '@/components/invitation/ReveCredit';
import { TemplateRenderer } from '@/components/invitation/TemplateRenderer';
import { getPublishedInvitation } from '@/lib/invitations/get-published';
import { envelopeOgImage, socialMetadata } from '@/lib/metadata';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  /* A couple's names, date and venue are theirs to share, not a search
     result: the page is for the people who were sent the link. Also sent as
     a header from next.config.ts, for crawlers that never parse the page. */
  const robots = { index: false, follow: true };

  if (!invitation) return { title: 'Invitation', robots };

  const { coupleFirstName, couplePartnerName } = invitation.content;
  const title = `${coupleFirstName} & ${couplePartnerName}`;
  const description = `You are invited to celebrate with ${coupleFirstName} and ${couplePartnerName}.`;

  return {
    title,
    description,
    robots,
    /* The preview a guest sees in WhatsApp before tapping: the design's
       sealed envelope, the same one the link opens on. */
    ...socialMetadata({
      title,
      description,
      image: envelopeOgImage(invitation.templateSlug),
      alt: 'A sealed invitation envelope',
    }),
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

  /* The design's own envelope, so a guest opens the one the invitation was
     drawn against rather than the house default. */
  return (
    <EnvelopeGate envelope={invitation.templateSlug}>
      <TemplateRenderer
        content={invitation.content}
        entitlements={invitation.entitlements}
        rsvpSlug={slug}
        templateSlug={invitation.templateSlug}
        theme={invitation.theme}
      />
      <ReveCredit slug={slug} />
    </EnvelopeGate>
  );
}
