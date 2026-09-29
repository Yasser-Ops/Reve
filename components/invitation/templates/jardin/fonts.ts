import { Pinyon_Script, EB_Garamond } from 'next/font/google';

/**
 * Jardin's own faces, loaded here rather than in `app/fonts.ts` for the same
 * reason Lin's are: a template is art-directed individually, and a face every
 * route loads is a face every design ends up negotiating with.
 *
 * Where Lin's Caveat reads as a hand-lettered note, Jardin wants the names to
 * read as if painted into the scene behind them — closer to the copperplate
 * flourish on an engraved invitation than to handwriting. Pinyon Script is a
 * genuine formal engraving hand, not a stand-in for a commercial face the way
 * Caveat stands in for Lin's Notera.
 */
export const jardinScript = Pinyon_Script({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-jardin-script',
});

/**
 * Body text. EB Garamond over Lin's Cormorant Garamond: both are old-style
 * serifs from the same family tradition, but EB Garamond sits a touch heavier
 * and less mannered, which reads better set small under a painted scene with
 * its own visual weight than Cormorant's very light strokes would.
 */
export const jardinBody = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-jardin-body',
});
