import { Cormorant_Garamond, Caveat } from 'next/font/google';

/**
 * Lin's own faces. Not in `app/fonts.ts`: that file is for brand faces every
 * route may load, and per its own comment templates are art-directed
 * individually and may load their own.
 *
 * The brief is Notera for titles and numbers, Cormorant Garamond for text.
 * Notera is a commercial licence and not yet bought, so Caveat stands in: it
 * shares Notera's brushed, slightly informal hand, where the copperplate
 * scripts on Google Fonts are far finer and more formal than the reference.
 * Swapping it later is one import and one variable — every title already reads
 * from `--font-lin-script`.
 */
export const linScript = Caveat({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-lin-script',
});

/**
 * Body text. `app/fonts.ts` loads Cormorant italic-only for accent characters,
 * so the upright roman it needs for running text is loaded here rather than
 * widening the brand face for one template.
 */
export const linBody = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-lin-body',
});
