/**
 * An envelope is data, not code.
 *
 * THE OPENING IS A PRE-RENDERED FRAME SEQUENCE. It was four cut layers hinged
 * by CSS, and it is not any more: the flap's rotation, the paper's flex and
 * the wax breaking are all authored in Blender, where they can be lit and
 * shadowed properly, and the browser only advances through the result.
 *
 * That trade is deliberate. Layers kept the timing adjustable per template and
 * cost almost nothing to ship, but every part had to be cut as an exact
 * complement of every other, and a hinge built from flat planes cannot show
 * paper bending or wax tearing at all. Frames give up the adjustable timing —
 * it is baked into the render — and buy physical behaviour no CSS transform
 * reaches.
 *
 * Adding an envelope is a directory under `public/envelope/<slug>/frames/`
 * plus one entry here. No CSS and no component edit.
 */

/**
 * A rendered opening: numbered stills, advanced in order.
 *
 * Frames are numbered from 1 and zero-padded to `pad` digits, so frame 1 of a
 * `pad: 4` sequence is `<dir>/0001.webp`. Padding is explicit rather than
 * inferred because a sequence that crosses a power of ten silently reorders
 * under lexical sort otherwise.
 *
 * Frame 1 is the sealed envelope and is the poster: it paints before anything
 * else loads, so the gate never shows an empty rectangle.
 */
export type EnvelopeFrames = {
  /** Directory holding the numbered stills, no trailing slash. */
  dir: string;
  /**
   * The render's own pixel dimensions, for `aspect-ratio`.
   *
   * A screen drawn to a DIFFERENT shape crops the envelope: the frames fill
   * their box with `object-fit: cover`, so a 0.4619 render in a 9/16 box loses
   * its top and bottom — the flap's point and the paper's foot. Carrying the
   * shape here means a surface that shows an envelope can size itself to the
   * one it is actually showing, rather than to a constant that was right for
   * some earlier render.
   */
  width: number;
  height: number;
  /** How many frames the sequence has. Frame 1 is sealed, `count` is open. */
  count: number;
  /** Zero-padding width of the frame numbers. */
  pad: number;
  /** Playback rate. The render's own timing, not a preference. */
  fps: number;
};

/**
 * Where the couple's initials sit on the wax.
 *
 * THE WAX ITSELF IS BAKED INTO THE FRAMES — it is rendered, lit and broken in
 * Blender, so nothing here places it. What this geometry still positions is
 * the initials drawn over the sealed frame in CSS, and the hit target under
 * them, because initials change per invitation and cannot be part of a render
 * shared by every couple.
 *
 * MEASURED off the sealed frame, never guessed. It travels WITH the envelope:
 * a second design whose wax sits higher would silently inherit this one's
 * placement if it lived in the component.
 */
export type SealGeometry = {
  /** Centre of the wax, as a percentage down the sealed frame. */
  sealY: string;
  /** Across the frame, as a percentage. A hand-made seal is rarely centred. */
  sealX: string;
  /** The wax's width, as a percentage of envelope width. Sizes the initials. */
  sealSize: string;
};

export type EnvelopeSpec = SealGeometry & {
  slug: string;
  /** Human name, for the storefront. */
  name: string;
  frames: EnvelopeFrames;
};

/*
 * Cream linen with an MS wax seal, rendered in Blender.
 *
 * ONLY THE SEALED FRAME EXISTS SO FAR — hence `count: 1`. The envelope sits
 * correctly at rest and the opening does not animate: tapping the seal holds
 * this one frame for its duration and then hands over to the invitation.
 *
 * That is the honest state while the sequence is being rendered, and it is
 * deliberately not disguised. The count is what makes it visible: raise it as
 * frames land and the opening starts moving, with no other change anywhere.
 *
 * Geometry is MEASURED off frame 1, not guessed — the wax is a 248px square
 * centred at 49.4% across and 46.4% down an 800x1732 frame.
 */
const LIN: EnvelopeSpec = {
  slug: 'lin',
  name: 'Cream linen, wax seal',
  frames: {
    dir: '/envelope/lin/frames',
    count: 1,
    pad: 4,
    fps: 30,
    width: 800,
    height: 1732,
  },
  sealY: '46.4%',
  sealX: '49.4%',
  sealSize: '31%',
};

export const ENVELOPES: Record<string, EnvelopeSpec> = {
  [LIN.slug]: LIN,
};

/** The envelope used when an invitation names none. */
export const DEFAULT_ENVELOPE = LIN.slug;

export function getEnvelope(slug: string | undefined): EnvelopeSpec {
  return ENVELOPES[slug ?? DEFAULT_ENVELOPE] ?? LIN;
}

/** The path to one frame, 1-indexed to match the render's own numbering. */
export function frameSrc(frames: EnvelopeFrames, index: number): string {
  return `${frames.dir}/${String(index).padStart(frames.pad, '0')}.webp`;
}

/** Every frame path in order. Used to preload before the seal goes live. */
export function frameSources(frames: EnvelopeFrames): string[] {
  return Array.from({ length: frames.count }, (_, i) => frameSrc(frames, i + 1));
}

/**
 * How long the rendered opening runs, in milliseconds.
 *
 * Floored at `HOLD_MS`, which matters while a sequence is still being
 * rendered: a single sealed frame is 33ms of animation, and without a floor
 * the ceremony would be over before the tap had finished registering — the
 * invitation appearing instantly, as though the envelope had not been there.
 * Holding the sealed frame for a beat keeps the interaction legible until the
 * real frames land, at which point the render's own length takes over.
 */
const HOLD_MS = 1200;

export function openingDurationMs(frames: EnvelopeFrames): number {
  return Math.max((frames.count / frames.fps) * 1000, HOLD_MS);
}

/** The render's shape, for CSS `aspect-ratio`. */
export function frameAspect(frames: EnvelopeFrames): string {
  return `${frames.width} / ${frames.height}`;
}
