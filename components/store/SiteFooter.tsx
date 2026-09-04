import Link from 'next/link';
import { CONTACT, whatsappLink } from '@/lib/contact';
import { EVENTS } from '@/lib/events';

const COLUMNS = [
  {
    heading: 'Invitations',
    links: [
      { label: 'The collection', href: '/templates' },
      /* Custom is a tier on the pricing table, not a page of its own, so it
         is reached through pricing rather than listed separately. */
      { label: 'Pricing', href: '/#pricing' },
      { label: 'See a live example', href: '/i/sarah-and-amine' },
    ],
  },
  {
    /* Weddings lead and live on the home page; the rest come from the
       registry, so a new occasion appears here without an edit. */
    heading: 'Occasions',
    links: [
      { label: 'Weddings', href: '/' },
      ...EVENTS.map((event) => ({
        label: event.label,
        href: `/${event.slug}`,
      })),
    ],
  },
  {
    heading: 'Rêve',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Questions', href: '/#questions' },
      { label: 'Who we are', href: '/#studio' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-taupe/40 bg-sand px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="reve-display text-2xl">Rêve</p>
            <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-cocoa">
              Digital invitations for weddings and engagements, designed by
              hand in Lebanon. English and Arabic.
            </p>

            <a
              className="reve-crisp mt-6 inline-block rounded-full bg-wine px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
              href={whatsappLink('Hello Rêve, I have a question about your invitations.')}
              rel="noreferrer noopener"
              target="_blank"
            >
              Message us
            </a>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="reve-eyebrow text-cocoa">{column.heading}</p>
              <ul className="mt-5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="text-[13.5px] text-cocoa transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-taupe/40 pt-7">
          <p className="text-[12.5px] text-cocoa">
            {CONTACT.whatsappNumber} ·{' '}
            <a
              className="transition-colors hover:text-ink"
              href={CONTACT.instagramUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              {CONTACT.instagramHandle}
            </a>
          </p>

          <p className="text-[12.5px] text-cocoa">
            © {new Date().getFullYear()} Rêve
          </p>
        </div>
      </div>
    </footer>
  );
}
