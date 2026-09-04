import type { Metadata } from 'next';
import Link from 'next/link';
import { TEMPLATES } from '@/components/invitation/registry';
import { Reveal } from '@/components/store/Reveal';
import { TemplatePreview } from '@/components/store/TemplatePreview';
import { TemplateThumbnail } from '@/components/store/TemplateThumbnail';
import { whatsappLink } from '@/lib/contact';
import {
  SAMPLE_CONTENT,
  SAMPLE_ENTITLEMENTS,
  SAMPLE_THEME,
} from '@/lib/sample-invitation';

export const metadata: Metadata = {
  title: 'The collection',
  description:
    'Every Rêve invitation design, shown with the same wedding so you are comparing art direction and nothing else. Each is available on every tier, at the same price.',
  alternates: { canonical: '/templates' },
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
 * Designs render live from the template registry rather than from exported
 * screenshots, so this page cannot drift from what the renderer produces, and
 * adding a template makes it appear here with no edit.
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
            Every design, the same
            <span
              className="ms-3 text-wine"
              style={{ fontFamily: 'var(--font-accent)', fontStyle: 'italic' }}
            >
              wedding
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-cocoa">
            Each design below is showing the same names, the same date and the
            same venue, so what you are comparing is the art direction and
            nothing else. Every one is available on every tier, at the same
            price.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-x-10 gap-y-16 sm:grid-cols-2">
          {TEMPLATES.map((template, index) => {
            const Template = template.component;

            return (
              <Reveal delay={index * 110} key={template.slug}>
                <TemplatePreview
                  character={template.character}
                  name={template.name}
                  summary={template.summary}
                >
                  <TemplateThumbnail>
                    <Template
                      content={SAMPLE_CONTENT}
                      entitlements={SAMPLE_ENTITLEMENTS}
                      theme={SAMPLE_THEME}
                    />
                  </TemplateThumbnail>
                </TemplatePreview>
              </Reveal>
            );
          })}
        </div>

        <p className="mx-auto mt-16 max-w-lg text-center text-[14px] leading-relaxed text-cocoa">
          Two designs today, and more as we draw them. If none of these is
          right, the Custom tier is a design made for you from scratch.
        </p>
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
