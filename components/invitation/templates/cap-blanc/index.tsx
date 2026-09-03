import { Countdown } from '@/components/invitation/primitives/Countdown';
import { Details } from '@/components/invitation/primitives/Details';
import { Gallery } from '@/components/invitation/primitives/Gallery';
import { Hero } from '@/components/invitation/primitives/Hero';
import type {
  Entitlements,
  InvitationContent,
  Theme,
} from '@/lib/schemas/invitation';

type CapBlancProps = {
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

/**
 * Props are declared locally rather than imported from the registry: the
 * registry imports this component, so importing its types back would close a
 * cycle.
 *
 * Styling here is deliberately plain. The art direction pass comes once the
 * mechanics are proven.
 */
export function CapBlanc({ content, entitlements }: CapBlancProps) {
  return (
    <main className="min-h-dvh bg-[#f6f1ea] text-[#2b2118]">
      <Hero content={content} />
      <Countdown eventDate={content.eventDate} />
      <Details content={content} />
      <Gallery content={content} entitlements={entitlements} />
    </main>
  );
}
