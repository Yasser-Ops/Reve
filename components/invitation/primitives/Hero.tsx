import { Section } from './Section';
import type { InvitationContent } from '@/lib/schemas/invitation';

type HeroProps = {
  content: InvitationContent;
};

export function Hero({ content }: HeroProps) {
  return (
    <Section className="text-center">
      {content.headline ? (
        <p className="text-sm uppercase tracking-[0.2em]">{content.headline}</p>
      ) : null}

      <h1 className="mt-6 text-5xl md:text-6xl">
        {content.coupleFirstName}
        <span className="mx-3 align-middle text-3xl">&amp;</span>
        {content.couplePartnerName}
      </h1>

      {content.message ? (
        <p className="mt-8 text-base leading-relaxed">{content.message}</p>
      ) : null}
    </Section>
  );
}
