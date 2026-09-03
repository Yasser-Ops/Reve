import Image from 'next/image';
import { Section } from './Section';
import type { Entitlements, InvitationContent } from '@/lib/schemas/invitation';

type GalleryProps = {
  content: InvitationContent;
  entitlements: Entitlements;
};

/**
 * Gated primitives render nothing at all when the capability is absent — no
 * placeholder, no upsell, no empty container. Every later gated primitive
 * follows this pattern.
 */
export function Gallery({ content, entitlements }: GalleryProps) {
  if (!entitlements.gallery) return null;
  if (content.gallery.length === 0) return null;

  return (
    <Section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {content.gallery.map((photo) => (
          <Image
            key={photo.src}
            alt={photo.alt}
            className="h-full w-full object-cover"
            height={800}
            src={photo.src}
            width={800}
          />
        ))}
      </div>
    </Section>
  );
}
