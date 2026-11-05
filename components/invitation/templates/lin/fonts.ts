import { Cormorant_Garamond, Hurricane, Mrs_Saint_Delafield } from 'next/font/google';

/**
 * Lin's own faces. Not in `app/fonts.ts`: that file is for brand faces every
 * route may load, and templates are art-directed individually.
 *
 * The approved mock sets headings and times in Holiday and the couple's names
 * in Brittany Signature, both commercial and licensed only inside Canva. The
 * owner chose free stand-ins (2026-11): Hurricane carries Holiday's brushed
 * signature hand, Mrs Saint Delafield the long slanted strokes of Brittany.
 */
export const linScript = Hurricane({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-lin-script',
});

export const linNames = Mrs_Saint_Delafield({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-lin-names',
});

/**
 * Body text, and the countdown's numerals in its light weight. `app/fonts.ts`
 * loads Cormorant italic-only for accent characters, so the upright roman is
 * loaded here rather than widening the brand face for one template.
 */
export const linBody = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-lin-body',
});
