import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  backToCatalogue,
  getTemplateEntry,
  LISTED_TEMPLATES,
  TEMPLATE_SLUGS,
} from '@/components/invitation/registry';
import { LiveInvitationDemo } from '@/components/store/LiveInvitationDemo';
import { OfferTabs } from '@/components/store/OfferTabs';
import { Reveal } from '@/components/store/Reveal';
import { TemplateFrame } from '@/components/store/TemplateFrame';
import { whatsappLink } from '@/lib/contact';
import { designJsonLd } from '@/lib/json-ld';
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
    alternates: { canonical: `/weddings/${slug}` },
    /* A draft opens by URL for review and must not be indexed before it
       carries its own artwork. */
    ...(entry.draft ? { robots: { index: false, follow: false } } : {}),
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

  const Template = await entry.load();
  const others = await Promise.all(
    LISTED_TEMPLATES.filter((other) => other.slug !== slug).map(
      async (other) => ({ entry: other, Design: await other.load() }),
    ),
  );
  const jsonLd = designJsonLd({
    name: entry.name,
    story: entry.story,
    href: `/weddings/${entry.slug}`,
  });
  const back = backToCatalogue(entry.occasion);

  /* Built once: the page asks for the order in two places, and the two must
     open the same conversation. */
  const orderLink = whatsappLink(
    `Hello Rêve, I would like to order the ${entry.name} invitation.`,
  );

  return (
    <main className="bg-bone text-ink">
      {/* Structured data built by lib/json-ld.ts, never user input. */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />

      <section className="px-6 pb-14 pt-10 md:pt-14">
        <div className="mx-auto max-w-3xl">
          {/* WHERE "BACK" GOES IS COMPUTED, NOT HARDCODED. Lin is shelved
              under weddings today, but backToCatalogue reads that off the
              registry rather than assuming /weddings — so a visitor who opened
              a design from the engagement section lands back on that section,
              not at the top of the wedding one, once a design lives in more
              than one place. Flashes to ink on hover: a deliberate flip
              rather than a fade, since this is the one exit off the page and
              wants to read as immediate. */}
          <Link
            className="reve-crisp text-[11px] uppercase tracking-[0.14em] text-cocoa transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
            href={back.href}
          >
            ← {back.label}
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

            {/* THE PRICE IS QUOTED BEFORE THE DEMO, NOT AFTER IT. A visitor who
                has to scroll three screens to find out what a design costs
                assumes the worst and leaves. Quoting it here also frames the
                demo as something already affordable rather than something
                being sold up to. */}
            <p className="reve-crisp mt-7 text-[12px] uppercase tracking-[0.14em] text-cocoa">
              <span className="text-taupe">From</span>{' '}
              <span className="text-[15px] tabular-nums text-wine">
                {ENTRY_TIER.price}
              </span>{' '}
              <span className="text-taupe">· {DELIVERY.headline}</span>
            </p>
          </div>
        </div>
      </section>

      {/* The demo, not a picture of one. A design that is already drawn can be
          read in full before anyone pays, which is the whole pitch. */}
      <section className="px-6 pb-6">
        <Reveal>
          <div className="mx-auto max-w-3xl">
            {/* The design's OWN envelope, not the house default. Every design
                is paired with the envelope it was rendered against, so a demo
                that let this fall through showed Jardin's blush watercolour
                page arriving inside Lin's cream linen. */}
            <LiveInvitationDemo envelope={entry.slug}>
              <Template
                content={SAMPLE_CONTENT}
                entitlements={SAMPLE_ENTITLEMENTS}
                theme={SAMPLE_THEME}
              />
            </LiveInvitationDemo>

            {/* The instruction carries more weight than the disclaimer: a
                visitor who never taps the seal never sees the product, so the
                thing to do comes first and in the darker ink. */}
            <p className="reve-crisp mt-8 text-center text-[13px] text-cocoa">
              Tap the seal, then scroll the phone.
            </p>

            <p className="reve-crisp mt-2 text-center text-[12px] text-taupe">
              This is the real invitation with a sample wedding in it, not a
              picture of one.
            </p>

            {/* ASK FOR THE ORDER WHERE THE DEMO CONVINCES, NOT ONLY AT THE
                FOOT OF THE PAGE. This is the moment a visitor has just read the
                whole product; sending them three screens further to act on it
                loses the ones who were ready here. */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                className="reve-crisp inline-block rounded-full bg-wine px-8 py-3.5 text-[11px] uppercase tracking-[0.16em] text-bone transition-opacity hover:opacity-90"
                href={orderLink}
                rel="noreferrer noopener"
                target="_blank"
              >
                Order {entry.name} · from {ENTRY_TIER.price}
              </Link>

              <Link
                className="reve-crisp rounded-full border border-ink/25 px-7 py-3 text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:border-ink/50"
                href={`/preview/${slug}`}
              >
                Open it full screen
              </Link>
            </div>

            <p className="reve-crisp mt-4 text-center text-[12px] text-taupe">
              Opens WhatsApp. Nothing is charged until you have agreed what you
              are buying.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <OfferTabs />
        </div>
      </section>

      {/* DELIVERY IS A SUPPORTING FACT, NOT A SECTION. As a full-width band
          with a display headline it had the weight of an ending, and a visitor
          who reads an ending stops before the prices. Folded in here it still
          answers "how long?" at the moment the question is actually being
          asked, without standing between the demo and the plans. */}
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

          <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-cocoa">
            <span className="text-ink">{DELIVERY.headline}.</span>{' '}
            {DELIVERY.detail}
          </p>

          {/* Three unweighted cards make the eye stop at the cheapest one.
              `featured` already names the tier Rêve wants chosen, on the same
              data the home page reads, so the lift here cannot drift from the
              pricing table's. */}
          <ul className="mt-10 grid items-start gap-4 sm:grid-cols-3">
            {OFFER_TIERS.map((tier) => (
              <li
                className={
                  tier.featured
                    ? 'relative rounded-2xl border border-wine/40 bg-sand/40 p-6 shadow-[0_18px_40px_-28px_rgb(var(--reve-shadow-rgb)/0.7)]'
                    : 'rounded-2xl border border-taupe/50 p-6'
                }
                key={tier.tier}
              >
                {tier.badge ? (
                  <p className="reve-crisp absolute -top-2.5 start-6 rounded-full bg-wine px-3 py-1 text-[9.5px] uppercase tracking-[0.14em] text-bone">
                    {tier.badge}
                  </p>
                ) : null}

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

          {/* The reassurance sits ABOVE the button. Hesitation happens before
              the click, not after it, and a caution printed underneath is read
              only by people who have already decided. */}
          <p className="reve-crisp mt-10 text-[12.5px] text-cocoa">
            We start on WhatsApp. Nothing is charged until you have agreed what
            you are buying.
          </p>

          <p className="mt-4">
            <Link
              className="reve-crisp inline-block rounded-full bg-wine px-8 py-3.5 text-[11px] uppercase tracking-[0.16em] text-bone transition-opacity hover:opacity-90"
              href={orderLink}
              rel="noreferrer noopener"
              target="_blank"
            >
              Order {entry.name}
            </Link>
          </p>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="border-t border-taupe/30 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="reve-display text-3xl">Other designs</h2>

            <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {others.map(({ entry: other, Design: Other }) => {
                return (
                  <li key={other.slug}>
                    <Link className="group block" href={`/weddings/${other.slug}`}>
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
