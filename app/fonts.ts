import { Cormorant_Garamond, Geist, Marcellus } from 'next/font/google';

/**
 * Brand faces for the Rêve storefront, admin, and portal.
 *
 * Invitation templates are art-directed individually and may load their own
 * faces; nothing here is guaranteed to a template.
 */

/** Display: Roman inscriptional capitals. Names, headlines, template titles. */
export const marcellus = Marcellus({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-marcellus',
});

/** UI, body, and every numeral. */
export const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

/**
 * Italic accents only — the ampersand between two names, the occasional
 * emphasised word. Marcellus has no true italic, and a synthesised slant on an
 * inscriptional face looks broken, so a real italic cut does that work.
 */
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['italic'],
  display: 'swap',
  variable: '--font-cormorant',
});
