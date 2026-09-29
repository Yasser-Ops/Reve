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
 * paper bending or wax tearing at all. Frames buy physical behaviour no CSS
 * transform reaches.
 *
 * TIMING IS RECOVERED BY RENDERING DENSELY, not by giving it up. A sequence
 * is only locked to one speed if it was rendered with barely enough frames
 * for that speed, which is what happened the first time; render a motion
 * across twice the frames it needs and playback can choose a rate, slow one
 * phase against another via `tail`, or hold a still frame for a pause that
 * was never rendered at all. Frame count is the budget that buys adjustable
 * timing back, and it is cheaper than it looks: near-identical frames are
 * dropped before shipping by `scripts/envelope-frames.mjs`.
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
  /**
   * An optional slower rate for the tail of the sequence.
   *
   * A rendered opening is not one motion: a flap peels, then the envelope
   * leaves, and the two want different speeds. Blender bakes them at one
   * rate, so the only way to give the departure more room without dragging
   * the flap out with it is to change rate partway through.
   *
   * `from` is the first frame that plays at `fps`, 1-indexed against the same
   * numbering as the files. Omit the whole field and the sequence plays at
   * one constant rate, which is what a render with a single motion wants.
   */
  tail?: {
    /** First frame of the slower phase. */
    from: number;
    /** Rate for that phase, frames per second. */
    fps: number;
  };
  /**
   * Milliseconds the opening runs on AFTER the last frame.
   *
   * For a sequence that hands off to something CSS finishes. Jardin's frames
   * stop once the flap is open and a light bloom carries the rest, so the
   * gate has to stay in `opening` past the final frame or it would hand over
   * to the invitation mid-flood. Omit it and the opening is exactly as long
   * as the frames.
   */
  holdMs?: number;
};

/**
 * Where the wax sits on the sealed frame.
 *
 * THE WAX AND ITS MONOGRAM ARE BOTH BAKED INTO THE FRAMES — pressed, lit and
 * broken in Blender, so nothing here draws any of it. What this geometry
 * positions is the transparent hit target laid over the rendered wax, and the
 * glow and perspective origin the opening pivots around.
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
  /** The wax's width, as a percentage of envelope width. Sizes the target. */
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

/*
 * Blush watercolour paper with a rose-and-archway wax seal, rendered in
 * Blender (`INVITATION SYSTEM/00_MASTER/Jardin.blend`).
 *
 * THE FULL OPENING IS RENDERED: sealed at 1 and gone by the last frame. The
 * envelope does not merely open, it leaves — the last frames carry alpha as
 * it slides clear of the page.
 *
 * RE-RENDERED TO DENTELLE'S TIMING. The first cut of this envelope ran 113
 * frames across a motion that is really two, and the fall came out too sparse
 * to slow down: 44 frames of an object moving 29-49px between each are smooth
 * only at a rate that makes them quick, and interpolating in-betweens would
 * have cross-faded a 40px displacement into a double image. It was the one
 * envelope whose timing could not be adjusted after the fact, and it was
 * shipped that way with a note saying so.
 *
 * DENTELLE WAS THE FIX, AND THIS IS THAT FIX APPLIED BACKWARDS. Its keys were
 * read out of `Envelope_Scalloped_MASTER.blend` and written onto this rig
 * verbatim: the flap peels 1-80, swings clear by 142, and every part holds
 * until 81 before travelling -1.45 in Y. Measured after: 267.5 degrees of
 * flap at a maximum 4.56 degrees per frame, the body moving at most 0.025
 * units per frame, and NO STILL FRAMES — roughly half the per-frame step of
 * the old render, which is what buys the adjustable playback.
 *
 * `tail` IS USED NOW, and that is the whole point of the re-render. The flap
 * reads at 30fps and the departure wants the weight of 24, exactly as on
 * DENTELLE. `holdMs` remains unused — it is for a sequence that hands off to
 * something CSS finishes.
 *
 * THE WAX GOES WITH THE FLAP, NOT BEFORE IT. The first pass of this render
 * hid the seal at frame 46, mid-peel, because the old 113-frame timing put
 * the flap fully open by 80 and the visibility keys were never re-timed with
 * the rest. The cause is worth recording: `WaxSeal` carries TWO channelbags
 * in its action — slots `WaxSeal` and `WaxSeal.001` — and Blender evaluates
 * only the bound one, so a write to the other reports success and changes
 * nothing. Verify evaluated visibility by frame-setting and reading
 * `hide_render` back; do not trust the curve you just wrote. Frames 46-81
 * were re-rendered against the corrected slot, and the wax now turns away
 * with the flap: 30,766 red-hue pixels at 46 falling to 1,764 at 80.
 *
 * Geometry MEASURED off frame 1, not guessed, and RE-MEASURED after this
 * render replaced the first one: the wax is a 236px disc centred at (400,
 * 780) on the 800x1732 frame. Found by HUE MARGIN — r - max(g, b) > 40 — not
 * by colour distance from a sampled point: the watercolour texture varies
 * enough across the sheet that a distance threshold caught fold-shadow along
 * with the wax, which is what sent the first measurement 5% low. The rose
 * wax is the only strongly red thing on blush paper, so hue separates it
 * cleanly where brightness does not.
 *
 * `sealSize` takes the bbox WIDTH. The wax measures 236 wide but only 215
 * tall, because the flap's shadow clips its lower edge; the disc is round, so
 * width is the honest diameter.
 */
const JARDIN: EnvelopeSpec = {
  slug: 'jardin',
  name: 'Blush watercolour, rose seal',
  frames: {
    dir: '/envelope/jardin/frames',
    /* SHIPPED, not rendered. The render is 168 frames and
       `scripts/envelope-frames.mjs` dropped 20 as near-identical to their
       neighbour: three at the head, where the flap has barely begun to move,
       and seventeen at the tail, after the paper has fully left frame at
       render frame 152. What ships is renumbered contiguously, so this is the
       count the player indexes against.

       THE TAIL SEVENTEEN SHOULD NOT HAVE BEEN RENDERED. The range was set to
       168 by copying DENTELLE's without checking when THIS envelope clears
       the camera, which is the mistake DENTELLE's own note warns about: a
       motion's frame budget is set by what the camera sees, not by what the
       rig does. They cost about five minutes of GPU and ship as nothing. */
    count: 148,
    pad: 4,
    /* The flap's own rate. The departure runs slower — see `tail`. */
    fps: 30,
    width: 800,
    height: 1732,
    tail: {
      /*
       * The first frame of the slide, IN SHIPPED NUMBERING.
       *
       * The slide starts at render frame 82 — the frame the flap and the wax
       * are both hidden on, having cleared the top of frame at 81 — and three
       * renders were dropped ahead of it, so it ships as 79. Renumbering is
       * what makes the sequence contiguous for the player, and it means any
       * frame index quoted from Blender has to be mapped through the drop
       * list in `.frames/jardin.json` before it lands here.
       */
      from: 79,
      fps: 24,
    },
  },
  sealY: '45.1%',
  sealX: '50.0%',
  sealSize: '30%',
};

/*
 * Ivory damask paper with a scalloped lace trim and a rose-gold wax seal,
 * rendered in Blender (`INVITATION SYSTEM/00_MASTER/Envelope_Scalloped_MASTER.blend`).
 *
 * THE LACE IS NOT THE PAPER. Jardin's flap is a plain diagonal and its
 * decoration is printed into the sheet; this one carries a separate strip of
 * lace along both flap edges, floating 0.7mm above the paper and overhanging
 * it, so the scalloped hem breaks the silhouette and casts its own contact
 * shadow. That shadow is most of what makes it read as cloth laid on paper
 * rather than as pattern applied to it — which is why the trim is geometry
 * and an alpha-cut texture rather than anything drawn into the albedo.
 *
 * RENDERED FOR MANIPULATION, NOT FOR ONE SPEED. Jardin was rendered at a
 * single rate across a motion that is really two, and the fall came out too
 * quick to slow down: 44 frames moving 29-49px apart cannot be stretched, and
 * interpolating in-betweens cross-fades a 40px displacement into a double
 * image. This render answers that directly: the flap opens across 80 frames
 * and the envelope leaves across 78, roughly double Jardin's temporal
 * resolution in both phases, so either can be played slower without the gaps
 * showing.
 *
 * EVERY FRAME EARNS ITS PLACE, and the first cut of this render did not. It
 * ran 216 frames of which 109 were byte-identical to their neighbour, in two
 * stretches: the flap kept rotating for 70 frames after it had swung BEHIND
 * the envelope and out of camera, and the envelope kept travelling for 27
 * after it had left the frame. Neither is visible, so neither is animation.
 *
 * THE FLAP IS NOW HIDDEN RATHER THAN PARKED. It opens to 118 degrees by frame
 * 80 and clears the top of frame at 81 — measured in camera NDC, not guessed —
 * so `hide_render` switches on at 82 and the remaining rotation costs nothing.
 * That rotation still runs, to -90 degrees, because a flap that stopped dead
 * mid-swing would pop if it were ever unhidden; it simply is not rendered.
 *
 * The visibility switch REPLACED A HOLDOUT. Jardin drove `is_holdout` on the
 * flap, the lace and the seal, which in Cycles punches transparent alpha and
 * cuts a hole through everything behind it — with `film_transparent` on, that
 * hole is the page showing through. Inherited here, it fired at render frame
 * 79 while the flap was still on screen: coverage fell 1.93% in one frame and
 * a grey flash showed through the gap. Nothing in this scene sets `is_holdout`
 * any more except FrontPanel, whose static holdout is what cuts the envelope's
 * mouth.
 *
 * The lesson generalises past this envelope: a motion's frame budget is set
 * by what the CAMERA sees, not by what the rig does, and an ease curve
 * spanning a whole phase spends most of its frames at the speeds nearest zero.
 *
 * NO DEAD HOLD. Jardin spent 35 rendered frames on a motionless envelope and
 * they were cut by hand afterwards. Here the pause is not rendered at all:
 * the flap finishes, the slide begins on the next frame, and a pause — if one
 * is wanted — is the player holding a single frame for as long as it likes.
 * `scripts/envelope-frames.mjs` drops any near-identical frames that remain
 * and reports the longest still run, which is the check that caught the 109.
 *
 * `tail` IS USED HERE, AND IT IS WHAT IT WAS KEPT FOR. The two phases want
 * different speeds: the flap reads well at 30fps and the departure wants the
 * extra weight of 24. Jardin could not use it because its fall lacked the
 * frames to slow down; this one has them.
 *
 * Geometry MEASURED off frame 1: the wax is a 237px disc, centred. The card
 * carries a 1.1197 Y-scale in Blender to cancel the camera's 24.23-degree
 * foreshortening — a flat card lying on the flap projects as an ellipse
 * otherwise, and that correction is specific to this camera angle.
 */
const DENTELLE: EnvelopeSpec = {
  slug: 'dentelle',
  name: 'Ivory damask, lace trim',
  frames: {
    dir: '/envelope/dentelle/frames',
    /* SHIPPED, not rendered. The render is 158 frames and
       `scripts/envelope-frames.mjs` dropped 9 as near-identical to their
       neighbour: two at the head, where the sealed envelope has barely begun
       to move, and seven at the tail, after the paper has fully left frame at
       render frame 152. What ships is renumbered contiguously, so this is the
       count the player indexes against. */
    count: 149,
    pad: 4,
    /* The flap's own rate. The departure runs slower — see `tail`. */
    fps: 30,
    width: 800,
    height: 1732,
    tail: {
      /*
       * The first frame of the slide, IN SHIPPED NUMBERING.
       *
       * The slide starts at render frame 82 — the same frame the flap is
       * hidden on, having cleared the top of frame at 81 — and renders 2 and
       * 3 were dropped ahead of it, so it ships as 80. Renumbering is what
       * makes the sequence contiguous for the player, and it means any frame
       * index quoted from Blender has to be mapped through the drop list
       * before it lands here: 80 is the same number the previous render
       * produced, by a different route.
       */
      from: 80,
      fps: 24,
    },
  },
  sealY: '45.1%',
  sealX: '50.0%',
  sealSize: '30%',
};

export const ENVELOPES: Record<string, EnvelopeSpec> = {
  [LIN.slug]: LIN,
  [JARDIN.slug]: JARDIN,
  [DENTELLE.slug]: DENTELLE,
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
  return Math.max(sequenceMs(frames), HOLD_MS);
}

/**
 * The sequence's own length, before the hold floor.
 *
 * Two rates when `tail` is set: the frames before `tail.from` at `fps`, the
 * rest at the slower `tail.fps`. The gate's handover timer reads this, so a
 * tail that was not counted here would hand over to the invitation while the
 * envelope was still leaving.
 */
function sequenceMs(frames: EnvelopeFrames): number {
  const hold = frames.holdMs ?? 0;

  if (!frames.tail) return (frames.count / frames.fps) * 1000 + hold;

  const head = Math.max(frames.tail.from - 1, 0);
  const tail = Math.max(frames.count - head, 0);

  return (head / frames.fps) * 1000 + (tail / frames.tail.fps) * 1000 + hold;
}

/**
 * Which frame is showing `elapsed` ms into the opening, 1-indexed.
 *
 * Lives here rather than in the player because it is a property of the
 * sequence's authored timing, and the two-rate arithmetic has to agree
 * exactly with `sequenceMs` above or the last frame lands early or late.
 */
export function frameAt(frames: EnvelopeFrames, elapsed: number): number {
  if (!frames.tail) {
    /* Clamped: past the last frame the sequence may still be running out its
       `holdMs`, and an index beyond `count` would ask for a file that is not
       there. The last frame simply stays up while the light finishes. */
    return Math.min(
      Math.floor((elapsed / 1000) * frames.fps) + 1,
      frames.count,
    );
  }

  const head = Math.max(frames.tail.from - 1, 0);
  const headMs = (head / frames.fps) * 1000;

  if (elapsed < headMs) {
    return Math.floor((elapsed / 1000) * frames.fps) + 1;
  }

  return Math.min(
    head + Math.floor(((elapsed - headMs) / 1000) * frames.tail.fps) + 1,
    frames.count,
  );
}

/** The render's shape, for CSS `aspect-ratio`. */
export function frameAspect(frames: EnvelopeFrames): string {
  return `${frames.width} / ${frames.height}`;
}

