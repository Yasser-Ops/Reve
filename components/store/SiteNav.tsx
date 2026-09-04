'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CONTACT, whatsappLink } from '@/lib/contact';
import { LEAD_EVENTS } from '@/lib/events';

/* Only lead occasions appear here. Secondary ones are real and have their own
   pages, but the nav is the main pitch and they would dilute it; the footer
   and the questions section carry them instead. */
const LINKS = [
  { label: 'Collection', href: '/collection' },
  ...LEAD_EVENTS.map((event) => ({
    label: event.label,
    href: `/${event.slug}`,
  })),
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
];

/* The nav sits on every page, including the occasion pages, so its message
   names no single occasion. Each landing page's own buttons carry theirs. */
const START_MESSAGE = "Hello Rêve, I'd like to create an invitation.";

/**
 * Floating pill navigation.
 *
 * It gains a background only once the page has scrolled, so it sits weightless
 * over the hero and becomes a solid surface over content.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <nav
        aria-label="Main"
        className={`mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full px-5 py-2.5 transition-colors duration-300 ${
          scrolled
            ? 'border border-taupe/40 bg-bone/92 backdrop-blur-md'
            : 'border border-transparent'
        }`}
      >
        <Link
          className="reve-display text-xl tracking-[0.06em] text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
          href="/"
        >
          Rêve
        </Link>

        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                className="reve-crisp text-[13px] text-cocoa transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine"
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            className="reve-crisp rounded-full bg-wine px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-bone transition-colors hover:bg-wine-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine sm:px-5 sm:text-[12px] sm:tracking-[0.14em]"
            href={whatsappLink(START_MESSAGE)}
            rel="noreferrer noopener"
            target="_blank"
          >
            Start yours
          </a>

          <button
            aria-controls="site-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="grid h-10 w-10 place-items-center rounded-full border border-taupe/50 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true" className="text-[15px] leading-none">
              {menuOpen ? '×' : '≡'}
            </span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          className="mx-auto mt-2 max-w-5xl rounded-3xl border border-taupe/40 bg-bone/97 p-5 backdrop-blur-md md:hidden"
          id="site-menu"
        >
          <ul className="space-y-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  className="block rounded-xl px-3 py-3 text-[15px] text-ink hover:bg-sand"
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <a
            className="reve-crisp mt-3 block rounded-full bg-wine px-6 py-3.5 text-center text-[12px] uppercase tracking-[0.14em] text-bone"
            href={whatsappLink(START_MESSAGE)}
            rel="noreferrer noopener"
            target="_blank"
          >
            Start yours on WhatsApp
          </a>

          <p className="mt-3 text-center text-[12px] text-cocoa">
            {CONTACT.whatsappNumber}
          </p>
        </div>
      ) : null}
    </header>
  );
}
