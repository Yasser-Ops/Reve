import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getTemplateEntry,
  TEMPLATES,
  TEMPLATE_SLUGS,
} from '@/components/invitation/registry';
import { OfferTabs } from '@/components/store/OfferTabs';
import { PhoneFrame } from '@/components/store/PhoneFrame';
import { Reveal } from '@/components/store/Reveal';
import { TemplateFrame } from '@/components/store/TemplateFrame';
import { whatsappLink } from '@/lib/contact';
import { DELIVERY, ENTRY_TIER, OFFER_TIERS } from '@/lib/offer';
import {
  SAMPLE_CONTENT,
  SAMPLE_ENTITLEMENTS,
  SAMPLE_THEME,
} from '@/lib/sample-invitation';

/** The registry is known at build time, so every design prerenders. */
export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getTemplateEntry(slug);

  if (!entry) return {};

  return {
    title: entry.name,
    description: entry.story,
    alternates: { canonical: `/collection/${slug}` },
    openGraph: {
      title: `${entry.name} · Rêve`,
      description: entry.story,
      type: 'website',
    },
  };
}

/**
 * One design, sold.
 *
 * The argument this page makes is deliberately the opposite of a bespoke
 * studio's. A studio has to justify a wait and a large fee, so its product page
 * is a stack of reassurance. A Rêve design is already drawn, so the page leads
 * with the finished thing, quotes the price early, and treats "you can read the
 * whole invitation before paying" as the offer rather than a concession.
 *
 * Every claim comes from lib/offer.ts. There are no ratings or couple counts
 * here because Rêve is pre-launch and has none.
 */
export default async function DesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getTemplateEntry(slug);

  if (!entry) notFound();

  const Template = entry.component;
  const others = TEMPLATES.filter((other) => other.slug !== slug);

  return (
    <main className="bg-bone text-ink">
      <section className="px-6 pb-14 pt-10 md:pt-14">
        <div className="mx-auto max-w-3xl">
          <Link
            className="reve-crisp text-[11px] uppercase tracking-[0.14em] text-cocoa underline-offset-4 hover:underline"
            href="/collection"
          >
            ← The collection
          </Link>

          <div className="mt-10 text-center">
            <h1 className="reve-display text-5xl md:text-6xl">{entry.name}</h1>

            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-cocoa">
              {entry.story}
            </p>

            <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {entry.character.map((trait) => (
                <li
                  className="reve-crisp text-[11px] uppercase tracking-[0.12em] text-taupe"
                  key={trait}
                >
                  {trait}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The demo, not a picture of one. A design that is already drawn can be
          read in full before anyone pays, which is the whole pitch. */}
      <section className="px-6 pb-6">
        <Reveal>
          <div className="mx-auto max-w-3xl">
            <PhoneFrame>
              <TemplateFrame>
                <Template
                  content={SAMPLE_CONTENT}
                  entitlements={SAMPLE_ENTITLEMENTS}
                  theme={SAMPLE_THEME}
                />
              </TemplateFrame>
            </PhoneFrame>

            <p className="mt-8 text-center">
              <Link
                className="reve-crisp rounded-full border border-ink/25 px-7 py-3 text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink/50"
                href={`/preview/${slug}`}
              >
                Open the full invitation
              </Link>
            </p>

            <p className="reve-crisp mt-4 text-center text-[12px] text-taupe">
              The real thing, with a sample wedding in it. Read all of it before
              you decide.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <OfferTabs />
        </div>
      </section>

      {/* The honest advantage over a studio: no design phase to wait through. */}
      <section className="bg-sand/50 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="reve-eyebrow text-cocoa">Delivery</p>
          <p className="reve-display mt-5 text-4xl">{DELIVERY.headline}</p>
          <p className="mx-auto mt-5 max-w-md text-[14.5px] leading-relaxed text-cocoa">
            {DELIVERY.detail}
          </p>
        </div>
      </section>

      <section className="px-6 py-16" id="plans">
        <div className="mx-auto max-w-3xl">
          <p className="reve-eyebrow text-cocoa">Choose your plan</p>

          <p className="reve-display mt-4 text-4xl">
            <span className="reve-crisp me-2 align-middle text-[12px] uppercase tracking-[0.14em] text-taupe">
              From
            </span>
            {ENTRY_TIER.price}
          </p>

          <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-cocoa">
            Every design is available on every plan at the same price. What
            changes is whether you collect replies, not how the invitation looks.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {OFFER_TIERS.map((tier) => (
              <li
                className="rounded-2xl border border-taupe/50 p-6"
                key={tier.tier}
              >
                <p className="reve-display text-2xl">{tier.name}</p>
                <p className="reve-crisp mt-2 text-[15px] tabular-nums text-wine">
                  {tier.price}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-cocoa">
                  {tier.summary}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-10">
            <Link
              className="reve-crisp inline-block rounded-full bg-wine px-8 py-3.5 text-[11px] uppercase tracking-[0.16em] text-bone transition-opacity hover:opacity-90"
              href={whatsappLink(
                `Hello Rêve, I would like to order the ${entry.name} invitation.`,
              )}
              rel="noreferrer noopener"
              target="_blank"
            >
              Order {entry.name}
            </Link>
          </p>

          <p className="reve-crisp mt-4 text-[12px] text-taupe">
            We start on WhatsApp. Nothing is charged until you have agreed what
            you are buying.
          </p>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="border-t border-taupe/30 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="reve-display text-3xl">Other designs</h2>

            <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => {
                const Other = other.component;

                return (
                  <li key={other.slug}>
                    <Link className="group block" href={`/collection/${other.slug}`}>
                      <div className="overflow-hidden rounded-[1.25rem] border border-taupe/50 transition-transform duration-300 group-hover:-translate-y-1">
                        <TemplateFrame>
                          <Other
                            content={SAMPLE_CONTENT}
                            entitlements={SAMPLE_ENTITLEMENTS}
                            theme={SAMPLE_THEME}
                          />
                        </TemplateFrame>
                      </div>

                      <p className="reve-display mt-4 text-xl">{other.name}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-cocoa">
                        {other.summary}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
