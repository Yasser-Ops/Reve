/**
 * The canonical sheet.
 *
 * An invitation is one long decorated sheet of paper with the couple's details
 * set into the spaces the artist left for them. That only works if every
 * artwork is drawn to the same plan, so this is that plan: fixed once, obeyed
 * by every sheet template thereafter.
 *
 * The sheet is a VERTICAL STACK OF BANDS, not one canvas with fixed zones.
 * Sections of a real invitation are not the same height as each other — a
 * countdown is short, a schedule is long, and a schedule with nine events is
 * longer than one with three. A fixed percentage map forces every design into
 * identical section heights and breaks the moment content varies. A stack does
 * not: a band grows with its content and the band below it starts lower.
 *
 * The consequence is that artwork and layout stop being negotiated per design.
 * A new sheet is a set of illustrations drawn to this spec plus one registry
 * entry; the vocabulary never moves, and the couple's details are variables
 * poured into slots that were already there.
 */

/**
 * The paper. Every band in every sheet sits on this, and it is the ONLY thing
 * continuous down the whole document.
 *
 * That continuity is what makes the seams disappear. See BAND_BRIEF.
 */
export const SHEET_GROUND = '#f4efe6';

/**
 * Horizontal inset of the text channel, as a percentage of sheet width.
 *
 * Text never leaves this channel. Artwork may cross it freely — edge columns
 * and corner sprays are meant to overlap the channel's outer margin — but a
 * word never lands where an illustration could be, at any width.
 */
export const SHEET_CHANNEL_INSET = 12;

/** Widest the sheet ever draws, in px. Beyond this it centres in the ground. */
export const SHEET_MAX_WIDTH = 720;

/**
 * ARTWORK BRIEF, and the reason this file can promise seamless composition.
 *
 * 1. DRAW SCENES, NEVER OBJECTS. Every element must be embedded in its own
 *    surroundings — a valance of greenery hanging from an implied rail, a strip
 *    of foliage banked with candles. A cut-out object floating on cream reads
 *    as a sticker, because nothing in the drawing explains why it is there.
 *    (This is not a hypothesis. An ornate chandelier was generated standalone
 *    and failed for exactly this reason: with no drawn chain and no drawn
 *    ceiling, it hangs from nothing.)
 *
 * 2. FADE TO GROUND AT EVERY HORIZONTAL EDGE. A band's artwork must dissolve
 *    into SHEET_GROUND at its own top and bottom before the edge is reached.
 *    Two adjacent tiles then never have to align, because they never touch:
 *    every boundary in the document is ground-to-ground. This is what removes
 *    the seam problem instead of solving it, and it is why band artwork can be
 *    drawn — or generated — independently of its neighbours.
 *
 * 3. CONTENT BANDS KEEP THE CHANNEL CLEAR. Ornament on a content band belongs
 *    at the edges and corners. The centre channel carries words.
 */
export const BAND_BRIEF = {
  scenesNotObjects: true,
  fadeToGroundAtEdges: true,
} as const;

/** Every slot a content band can fill. */
export const SHEET_SLOTS = {
  EYEBROW: 'eyebrow',
  NAMES: 'names',
  DATE: 'date',
  MESSAGE: 'message',
  COUNTDOWN: 'countdown',
  VENUE: 'venue',
  SCHEDULE: 'schedule',
  GALLERY: 'gallery',
  RSVP: 'rsvp',
} as const;

export type SheetSlot = (typeof SHEET_SLOTS)[keyof typeof SHEET_SLOTS];

/**
 * Artwork placed on a band.
 *
 * `full` spans edge to edge and is the divider's own body. The others are
 * intrusions on a content band: they decorate without enclosing, so the text
 * channel stays clear. Anything drawn as a closed frame around the text would
 * have to grow with the content and would distort; that is why there is no
 * `frame` role.
 */
export const ART_ROLES = {
  /** Edge to edge. The band IS this artwork. Dividers only. */
  FULL: 'full',
  /** A spray in one corner, overlapping the channel's outer margin. */
  CORNER: 'corner',
  /** Runs down both left and right edges, text flowing between. */
  COLUMNS: 'columns',
} as const;

export type ArtRole = (typeof ART_ROLES)[keyof typeof ART_ROLES];

export type BandArt = {
  /** Path under public/. Transparent PNG/WebP except for role `full`. */
  src: string;
  role: ArtRole;
  /** Intrinsic pixel size, for next/image. */
  width: number;
  height: number;
  /** Which corner, for role `corner`. Ignored otherwise. */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

/**
 * A divider: pure illustration, full bleed, no text. It ends one section and
 * opens the next, and its height is fixed by its own aspect ratio because
 * nothing inside it can grow.
 */
export type DividerBand = {
  kind: 'divider';
  art: BandArt & { role: typeof ART_ROLES.FULL };
  /** width : height. Drives the band's height at any screen size. */
  aspect: number;
};

/**
 * A content band: ground, words, optional intrusions.
 *
 * `minHeight` is a floor expressed as a MULTIPLE OF THE SHEET'S OWN WIDTH, and
 * the band takes the greater of that and whatever its content needs. That is
 * what lets a variable-length schedule sit in a fixed vocabulary.
 *
 * It is deliberately not `vh`. A band must be sized relative to the sheet, not
 * to the browser window, or it breaks the moment the sheet is drawn anywhere
 * other than full screen — the storefront scales a whole template down into a
 * thumbnail, and viewport units ignore that scaling and overflow the frame.
 * Sizing against the sheet's width means every proportion survives being drawn
 * at any size, which is the same reason the artwork is specified by aspect.
 */
export type ContentBand = {
  kind: 'content';
  slots: readonly SheetSlot[];
  minHeight: number;
  art?: BandArt;
};

export type Band = DividerBand | ContentBand;

/**
 * A whole design: the ordered bands, plus the ink it is drawn in.
 *
 * Adding a design means adding one of these and one registry entry. There is
 * no per-template layout code, which is the entire point.
 */
export type SheetSpec = {
  bands: readonly Band[];
  ink: string;
  accent: string;
  muted: string;
  ground: string;
};

/** True when a band carries this slot. */
export function bandHasSlot(band: Band, slot: SheetSlot): boolean {
  return band.kind === 'content' && band.slots.includes(slot);
}

/**
 * Every slot a spec fills, in document order.
 *
 * Lets a test assert that a design has not silently dropped the names or
 * orphaned the RSVP, without rendering it.
 */
export function specSlots(spec: SheetSpec): readonly SheetSlot[] {
  return spec.bands.flatMap((band) =>
    band.kind === 'content' ? [...band.slots] : [],
  );
}
