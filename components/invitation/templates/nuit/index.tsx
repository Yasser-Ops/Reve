import { Countdown } from '@/components/invitation/primitives/Countdown';
import { Gallery } from '@/components/invitation/primitives/Gallery';
import type {
  Entitlements,
  InvitationContent,
  Theme,
} from '@/lib/schemas/invitation';

type NuitProps = {
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

/**
 * Nuit — an evening invitation.
 *
 * The counterpart to Cap Blanc, and deliberately its opposite in every
 * decision that art direction owns: a dark ground rather than a pale one,
 * names stacked and oversized rather than set on one line, details ruled in a
 * column rather than centred in a stack.
 *
 * What it is NOT is a recolouring. The two templates take identical
 * InvitationContent and differ only in how they present it, which is the whole
 * claim the storefront's comparison makes: same wedding, same details, a
 * different hand.
 *
 * Details are laid out here rather than through the shared Details primitive
 * because that primitive centres its content, and this template's column rule
 * is the thing that distinguishes it. Hero likewise.
 *
 * Props are declared locally rather than imported from the registry: the
 * registry imports this component, so importing its types back would close a
 * cycle.
 */
export function Nuit({ content, entitlements }: NuitProps) {
  return (
    <main className="min-h-dvh bg-[#14161c] text-[#ece7dd]">
      {/* Names, stacked and large. The ampersand is the only accent. */}
      {/* Matches the shared Section primitive's rhythm (px-6 py-20 md:py-28)
          that Cap Blanc composes, so both templates open at the same height. */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto w-full max-w-2xl">
          {content.headline ? (
            <p className="text-center text-[11px] uppercase tracking-[0.28em] text-[#9a9080]">
              {content.headline}
            </p>
          ) : null}

          {/* Names on one line, as Cap Blanc sets them. The templates differ in
              ground, rule, and typography rather than in where the couple's
              name falls, so the storefront's comparison can line them up and
              show art direction changing while the data holds still. */}
          <h1 className="mt-8 text-center text-5xl leading-tight md:text-6xl">
            {content.coupleFirstName}
            <span
              className="mx-3 align-middle text-3xl text-[#c2a36b]"
              style={{ fontStyle: 'italic' }}
            >
              &amp;
            </span>
            {content.couplePartnerName}
          </h1>

          {/* A rule under the names: Cap Blanc has none, and at a glance this
              is what tells the two apart before you read anything. */}
          <div className="mx-auto mt-8 h-px w-16 bg-[#c2a36b]" />

          {content.message ? (
            <p className="mx-auto mt-12 max-w-md text-center text-[15px] leading-relaxed text-[#b8b0a2]">
              {content.message}
            </p>
          ) : null}
        </div>
      </section>

      <Countdown eventDate={content.eventDate} />

      {/* Details as a ruled column: every line hangs off the same left edge,
          the opposite of Cap Blanc's centred stack. */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto w-full max-w-2xl">
          <div className="border-t border-[#3a3a42] pt-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a9080]">
              The venue
            </p>
            <h2 className="mt-4 text-3xl">{content.venue.name}</h2>
            <p className="mt-2 text-[14px] text-[#b8b0a2]">
              {content.venue.addressLine}
            </p>

            {content.venue.mapUrl ? (
              <a
                className="mt-5 inline-block border-b border-[#c2a36b] pb-0.5 text-[12px] uppercase tracking-[0.14em] text-[#c2a36b]"
                href={content.venue.mapUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                Directions
              </a>
            ) : null}
          </div>

          {content.schedule.length > 0 ? (
            <div className="mt-14 border-t border-[#3a3a42] pt-8">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a9080]">
                The evening
              </p>

              <ul className="mt-6">
                {content.schedule.map((item) => (
                  <li
                    className="flex gap-6 border-b border-[#2a2a32] py-4 last:border-b-0"
                    key={`${item.time}-${item.title}`}
                  >
                    <span className="w-16 shrink-0 pt-1 text-[13px] tabular-nums text-[#c2a36b]">
                      {item.time}
                    </span>
                    <span>
                      <span className="block text-xl">{item.title}</span>
                      {item.description ? (
                        <span className="mt-1 block text-[13px] text-[#b8b0a2]">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <Gallery content={content} entitlements={entitlements} />
    </main>
  );
}
