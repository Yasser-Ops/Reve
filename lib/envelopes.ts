/**
 * An envelope is data, not code.
 *
 * The same argument `lib/sheet.ts` makes for a design: the opening ceremony is
 * one animation, fixed once, and an envelope is the set of layers it moves.
 * Adding an envelope is a directory of artwork plus one entry here — no CSS and
 * no component edit.
 *
 * AN ENVELOPE IS LAYERS, NOT FRAMES. A frame is a photograph of a whole
 * envelope in one state, and a frame cannot hinge: the flap has to rotate
 * independently of the paper behind it, so the parts must ship separately.
 * The previous single-image envelope reused its flap photograph as the body AND
 * the pocket, which meant the inside of the envelope was a picture of its
 * outside — the flap lifted to reveal another flap.
 */

/** Every layer an envelope is built from. All five are required. */
export type EnvelopeLayers = {
  /** The back panel. The floor of the whole construction. */
  body: string;
  /** Inside the pocket: what is seen down inside once the flap lifts away. */
  interior: string;
  /** The front face. The card slides out from behind this. */
  pocket: string;
  /** The flap's outer face, embossed. Hinges. */
  flap: string;
  /** The same paper from behind, shown once the hinge passes vertical. */
  flapInner: string;
  /** The wax. It is the button the whole ceremony hangs on. */
  seal: string;
};

export type EnvelopeSpec = {
  slug: string;
  /** Human name, for the storefront. */
  name: string;
  layers: EnvelopeLayers;
  /**
   * Where the flap's V comes to a point, as a percentage down the artwork.
   *
   * MEASURED off this envelope's own flap image, never guessed. It positions
   * the seal, drives the flap's clip path, and sets the pocket's mouth, so it
   * travels WITH the envelope: a second design with a deeper V would silently
   * inherit the first one's geometry if this lived in the component.
   */
  sealY: string;
  /** Across the artwork, as a percentage. A hand-made V is rarely centred. */
  sealX: string;
  /** Top edge of the flap artwork, as a percentage down. The hinge axis. */
  flapTop: string;
  /** The seal's width, as a percentage of envelope width. */
  sealSize: string;
};

const BONE_VINE: EnvelopeSpec = {
  slug: 'bone-vine',
  name: 'Bone, embossed vine',
  layers: {
    body: '/envelope/bone-vine/body.webp',
    interior: '/envelope/bone-vine/interior.webp',
    pocket: '/envelope/bone-vine/pocket.webp',
    flap: '/envelope/bone-vine/flap.webp',
    flapInner: '/envelope/bone-vine/flap-inner.webp',
    seal: '/envelope/bone-vine/seal.webp',
  },
  /* MEASURED on flap.webp itself, from its alpha channel: the lowest opaque
     row, and the centre of that row. Re-measure after ANY change to the flap
     artwork — it positions the seal, sets the pocket's mouth and shapes the
     cavity, so a stale value misplaces all three. */
  sealY: '78.9%',
  sealX: '53.5%',
  /* The flap artwork's own top edge. This flap is cut from the envelope and
     spans the full frame, so it is 0 — but a flap drawn as a loose triangle
     would not be, and the hinge rotates about this line rather than the
     frame's top. */
  flapTop: '0%',
  sealSize: '17%',
};

export const ENVELOPES: Record<string, EnvelopeSpec> = {
  [BONE_VINE.slug]: BONE_VINE,
};

/** The envelope used when an invitation names none. */
export const DEFAULT_ENVELOPE = BONE_VINE.slug;

export function getEnvelope(slug: string | undefined): EnvelopeSpec {
  return ENVELOPES[slug ?? DEFAULT_ENVELOPE] ?? BONE_VINE;
}
