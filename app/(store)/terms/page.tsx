import type { Metadata } from 'next';
import { trackWhatsapp } from '@/lib/analytics';
import { CONTACT, whatsappLink } from '@/lib/contact';
import { socialMetadata } from '@/lib/metadata';
import { ROUTES } from '@/lib/routes';
import { TERMS_SECTIONS, TERMS_UPDATED_ON } from '@/lib/terms';

const TITLE = 'Terms of service';
const DESCRIPTION =
  'How ordering, payment, approval, refunds and your guests’ replies work at Rêve.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: ROUTES.TERMS },
  ...socialMetadata({ title: `${TITLE} · Rêve`, description: DESCRIPTION }),
};

const UPDATED_LABEL = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(TERMS_UPDATED_ON));

/**
 * The terms every client accepts on the portal's welcome step.
 *
 * Static: the wording lives in lib/terms.ts and is known at build time.
 */
export default function TermsPage() {
  return (
    <main className="bg-bone px-6 pb-24 pt-16 text-ink">
      <div className="mx-auto max-w-2xl">
        <p className="reve-eyebrow text-cocoa">Rêve</p>
        <h1 className="reve-display mt-5 text-4xl sm:text-5xl">{TITLE}</h1>
        <p className="reve-crisp mt-4 text-[13px] text-cocoa">
          Last updated{' '}
          <time dateTime={TERMS_UPDATED_ON}>{UPDATED_LABEL}</time>
        </p>

        <ol className="mt-14 space-y-12">
          {TERMS_SECTIONS.map((section, index) => (
            <li key={section.heading}>
              {/* Above the heading, not inside it: the display face's old-style
                  figures make "01" read as "OI". */}
              <p className="reve-eyebrow text-cocoa">
                {String(index + 1).padStart(2, '0')}
              </p>
              <h2 className="reve-display mt-3 text-2xl">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  className="mt-4 text-[15px] leading-relaxed text-cocoa"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </li>
          ))}
        </ol>

        <div className="mt-16 border-t border-taupe/40 pt-8">
          <p className="text-[15px] leading-relaxed text-cocoa">
            Questions about these terms? Message us on WhatsApp at{' '}
            <a
              className="text-ink underline underline-offset-4 hover:text-wine"
              href={whatsappLink('Hello Rêve, I have a question about your terms.')}
              {...trackWhatsapp('terms')}
              rel="noreferrer noopener"
              target="_blank"
            >
              {CONTACT.whatsappNumber}
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
