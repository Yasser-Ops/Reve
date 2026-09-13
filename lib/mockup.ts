/**
 * The photographed phone in `public/ads.jpg`, as measured off the base image.
 *
 * Read by `scripts/compose-mockup.mjs`, which keeps its own copy of these
 * numbers because it runs under plain node with no TypeScript loader. THE TWO
 * MUST AGREE.
 *
 * The storefront's live demo does NOT use these: it draws its own phone, whose
 * proportions are its own.
 */

/** The phone's screen in `ads.jpg`, in pixels of the 2048x2048 base. */
export const MOCKUP_PHONE_SCREEN = {
  x: 242,
  y: 307,
  width: 666,
  height: 1407,
  /* Rounded by the handset itself, so a still dropped in square would show
     hard corners over the bezel's curve. */
  radius: 58,
} as const;

/**
 * The Dynamic Island in the PHOTOGRAPH, relative to the screen above.
 *
 * MEASURED off `ads.jpg`: a pill 188x56 sitting 22px below the screen's top
 * edge. `compose-mockup.mjs` punches exactly this out of the still, so what
 * shows through the hole is the photographed island itself — its real lens
 * glint and the soft edge where the cutout meets the panel.
 *
 * NOT the geometry the drawn demo phone uses. See `PHONE_ISLAND`.
 */
export const MOCKUP_PHONE_ISLAND = {
  x: 233,
  y: 22,
  width: 188,
  height: 56,
  radius: 28,
} as const;


/**
 * The textured paper beside it — a card, not a second phone.
 *
 * Its corners are the photographed card's own, and it carries a die-cut notch
 * at the top mirroring the handset's island: that echo is the ad's whole
 * conceit, a screen and a piece of paper shown as the same object.
 */
export const MOCKUP_CARD_SCREEN = {
  x: 1112,
  y: 318,
  width: 647,
  height: 1394,
  radius: 38,
  /*
   * The paper is DIE-CUT with a notch echoing the phone's island, so a still
   * dropped in square covers it. Same punch, different object.
   */
  notch: { x: 234, y: 12, width: 182, height: 53, radius: 26 },
} as const;
