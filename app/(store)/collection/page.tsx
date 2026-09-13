import type { Metadata } from 'next';
import Link from 'next/link';
import { TEMPLATES } from '@/components/invitation/registry';
import { Reveal } from '@/components/store/Reveal';
import { TemplateCard } from '@/components/store/TemplateCard';
import { whatsappLink } from '@/lib/contact';

export const metadata: Metadata = {
  title: 'The collection',
  description:
    'Every Rêve invitation design, shown with the same wedding so you are comparing art direction and nothing else. Each is available on every tier, at the same price.',
  alternates: { canonical: '/collection' },
  openGraph: {
    title: 'The collection · Rêve',
    description:
      'Every Rêve invitation design, shown with the same wedding so you are comparing art direction and nothing else.',
    type: 'website',
  },
};

const START_MESSAGE =
  "Hello Rêve, I'd like to create an invitation. I have been looking at the collection.";

/**
 * The collection.
 *
 * Cards come from the template registry, so adding a design makes it appear
 * here with no edit to this page. Each pairs the sealed envelope with the
 * invitation it opens into, because the envelope alone is identical across
 * every design and would leave the page's own claim — that what you are
 * choosing between is the art direction — visibly unsupported by the grid.
 *
 * Static: the registry is known at build time.
 */
export default function TemplatesPage() {
  return (
    <main className="bg-bone text-ink">
      <section className="px-6 pb-16 pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="reve-eyebrow text-cocoa">The collection</p>

          <h1 className="reve-display mt-7 text-5xl md:text-6xl">
            Designs, shown with
            <span
              className="ms-3 text-wine"
              style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
            >
              one wedding
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-cocoa">
            Every design carries the same names, the same date and the same
            evening, so what you are choosing between is the art direction and
            nothing else. Each is available on every tier, at the same price.
          </p>
        </div>
      </section>

      {/* Cards come from the template registry, so a new design appears here
          with no edit to this page, and the grid fills on its own.

          Four across on a wide screen, at a narrow gutter, in a container wide
          enough that each card carries real size. A chooser wants the designs
          comparable in one glance, and generous gutters buy nothing here — the
          photograph already carries its own margin of plaster, so space
          between cards only shrinks the thing being chosen.

          Centred with flex-wrap rather than a plain grid: until the collection
          divides evenly by four, a final short row would otherwise hang
          against the left edge. */}
      <section className="px-6 pb-24">
        <div className="mx-auto flex max-w-[88rem] flex-wrap justify-center gap-x-3 gap-y-12">
          {TEMPLATES.map((template, index) => (
            <Reveal
              className="w-[15rem] max-w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
              delay={index * 90}
              key={template.slug}
            >
              <TemplateCard entry={template} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-ink px-6 py-24 text-bone">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="reve-display text-4xl md:text-5xl">
            Found one you like?
          </h2>

          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-sand">
            Tell us which design and the names, and we will show you your own
            invitation in it before anything is due.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              className="reve-crisp rounded-full bg-wine px-9 py-4 text-[13px] uppercase tracking-[0.16em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              href={whatsappLink(START_MESSAGE)}
              rel="noreferrer noopener"
              target="_blank"
            >
              Message us on WhatsApp
            </a>

            <Link
              className="reve-crisp rounded-full border border-taupe px-9 py-4 text-[13px] uppercase tracking-[0.16em] text-bone transition-colors hover:bg-bone/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              href="/#pricing"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
