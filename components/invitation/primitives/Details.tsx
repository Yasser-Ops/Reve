import { Section } from './Section';
import type { InvitationContent } from '@/lib/schemas/invitation';

type DetailsProps = {
  content: InvitationContent;
};

export function Details({ content }: DetailsProps) {
  return (
    <Section className="text-center">
      <h2 className="text-3xl">{content.venue.name}</h2>
      <p className="mt-3 text-sm">{content.venue.addressLine}</p>

      {content.venue.mapUrl ? (
        <a
          className="mt-4 inline-block text-sm underline"
          href={content.venue.mapUrl}
          rel="noreferrer noopener"
          target="_blank"
        >
          Directions
        </a>
      ) : null}

      {content.schedule.length > 0 ? (
        <ul className="mt-12 space-y-8">
          {content.schedule.map((item) => (
            <li key={`${item.time}-${item.title}`}>
              <p className="text-sm tracking-widest">{item.time}</p>
              <p className="mt-1 text-xl">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-sm">{item.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
