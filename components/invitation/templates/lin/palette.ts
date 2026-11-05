/**
 * Lin's colours, sampled from the client-approved Canva mock (2026-11): a
 * cool paper white and a pale mist grey alternate down the page, headings in
 * a soft brown-gold, text close to black. One module so the template, the
 * dial and the timeline cannot drift apart.
 */
export const LIN = {
  PAPER: '#f1f1ef',
  MIST: '#d7d7d2',
  /** Headings and script times. */
  GOLD: '#8c7f68',
  /** The countdown's numerals: a shade deeper than the headings. */
  NUMERAL: '#7f6b50',
  /** Small capitals under times and numbers: the mock's rose-beige, deepened to stay legible. */
  LABEL: '#977c66',
  INK: '#343434',
  /** Text over the washed-out opening film. */
  HERO_INK: '#6c6452',
  /** The white wash laid over the film, so dark script reads on top of it. */
  HERO_WASH: 'rgb(241 241 239 / 0.55)',
} as const;
