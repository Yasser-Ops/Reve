import Link from 'next/link';
import {
  type CatalogueEntry,
  templatesForOccasion,
} from '@/components/invitation/registry';
import { Reveal } from '@/components/store/Reveal';
import { TemplateCard } from '@/components/store/TemplateCard';
import { TemplatePlaceholder } from '@/components/store/TemplatePlaceholder';
import { whatsappLink } from '@/lib/contact';
import { catalogueJsonLd } from '@/lib/json-ld';

/**
 * One half of the catalogue, rendered.
 *
 * Both halves are the same page with different contents and a different
 * accent, so they are one component rather than two files that would drift.
 * Everything that distinguishes them — heading, sections, accent, the message
 * that opens WhatsApp — comes from the CatalogueEntry it is handed.
 *
 * ACCENT CLASSES ARE WRITTEN OUT, NOT INTERPOLATED. Tailwind reads class names
 * statically, so `text-${accent}` would compile to nothing and the page would
 * render unaccented. The lookup below is what keeps both halves' colours real.
 */
const ACCENT = {
  wine: {
    text: 'text-wine',
    button: 'bg-wine hover:bg-wine-deep',
    outline: 'focus-visible:outline-wine',
  },
  gilt: {
    text: 'text-gilt',
    button: 'bg-gilt hover:bg-gilt-deep',
    outline: 'focus-visible:outline-gilt',
  },
} as const;

export function CataloguePage({
  entry,
  startMessage,
}: {
  entry: CatalogueEntry;
  /** Prefilled WhatsApp message, named for this half of the catalogue. */
  startMessage: string;
}) {
  const accent = ACCENT[entry.accent];

  return (
    <main className="bg-bone text-ink">
      {/* Structured data built by lib/json-ld.ts, never user input. */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogueJsonLd(entry)) }}
        type="application/ld+json"
      />

      <section className="px-6 pb-16 pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="reve-eyebrow text-cocoa">{entry.title}</p>

          <h1 className="reve-display mt-7 text-5xl md:text-6xl">
            {entry.heading}
            <span
              className={`ms-3 ${accent.text}`}
              style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
            >
              {entry.headingAccent}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-cocoa">
            {entry.standfirst}
          </p>

          {/* The picker moves within this page rather than leaving it, and is
              rendered only where there is somewhere to move to: a single
              section is already on screen, so a control to reach it is noise. */}
          {entry.sections.length > 1 ? (
            <ul className="mt-10 flex flex-wrap justify-center gap-2">
              {entry.sections.map((section) => (
                <li key={section.occasion}>
                  <a
                    className={`reve-crisp inline-block rounded-full border border-taupe/60 px-4 py-2 text-[12px] text-cocoa transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 ${accent.outline}`}
                    href={`#${section.occasion}`}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* Four across on a wide screen, at a narrow gutter, in a container wide
          enough that each card carries real size. A chooser wants the designs
          comparable in one glance, and generous gutters buy nothing here — the
          photograph already carries its own margin of plaster, so space
          between cards only shrinks the thing being chosen.

          Centred with flex-wrap rather than a plain grid: until a section
          divides evenly by four, a final short row would otherwise hang
          against the left edge. */}
      {entry.sections.map((section) => {
        const designs = templatesForOccasion(section.occasion);

        /* A section with neither a design nor a placeholder is an empty shelf
           and is not rendered at all. */
        if (designs.length === 0 && section.placeholders === 0) return null;

        return (
          <section
            className="scroll-mt-28 px-6 pb-20"
            id={section.occasion}
            key={section.occasion}
          >
            <div className="mx-auto max-w-[88rem]">
              <p className="reve-eyebrow text-cocoa">{entry.title}</p>

              <h2 className="reve-display mt-4 text-3xl md:text-4xl">
                {section.title}
              </h2>

              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-cocoa">
                {section.blurb}
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-x-3 gap-y-12">
                {designs.map((template, index) => (
                  <Reveal
                    className="w-[15rem] max-w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
                    delay={index * 90}
                    key={template.slug}
                  >
                    <TemplateCard entry={template} />
                  </Reveal>
                ))}

                {Array.from({ length: section.placeholders }).map((_, index) => (
                  <div
                    className="w-[15rem] max-w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(25%-0.5625rem)]"
                    key={`${section.occasion}-placeholder-${index}`}
                  >
                    <TemplatePlaceholder />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

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
              className={`reve-crisp rounded-full px-9 py-4 text-[13px] uppercase tracking-[0.16em] text-bone transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone ${accent.button}`}
              href={whatsappLink(startMessage)}
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
