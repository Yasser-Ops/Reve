# Envelope artwork brief

An envelope is **five separate layers**, not a picture of an envelope and not a
sequence of frames. The browser animates the parts; the artwork only has to
supply them.

    body.webp     the back panel. The floor of the whole thing.
    interior.webp what you see down inside once the flap lifts.
    pocket.webp   the front face. The card slides out from BEHIND this.
    flap.webp     the triangle that rotates. Transparent everywhere else.
    flap-inner.webp  the same flap seen from behind, for past vertical.
    seal.webp     the wax. It is the button.

Replacing these five files and one entry in `lib/envelopes.ts` is a whole new
envelope. No CSS changes, no component changes.

---

## The rule that makes it work

**GENERATE THE PIECES SEPARATELY. DO NOT CUT A FINISHED ENVELOPE APART.**

This is not a preference. A photograph of a closed envelope has the flap lying
flat against the pocket in the same cream paper under the same light, so the
seam between them is a shadow a few values deep. Vignetting across the image is
stronger than that seam, which means no threshold separates them reliably.
Attempting it produced a cut that took the wrong triangle and carried partial
alpha across the whole frame.

A piece generated alone on a plain background has a high-contrast edge, and
removing that background is trivial and repeatable.

## The rule that makes them fit

**EVERY PIECE IS DRAWN ON THE SAME CANVAS, IN ITS FINAL POSITION.**

Generate each layer at the same aspect (9:16, 768x1376) with the piece sitting
exactly where it belongs on the envelope, and everything else plain white.
Do NOT frame each piece to its own bounds — a flap cropped tight to itself has
lost the information about where on the envelope it sits, and seating it again
becomes guesswork.

Same canvas, same camera, same light, in every prompt.

## Shared prompt spec

Identical across all five. Change it only to design a different envelope.

    cream cotton rag paper, deckled edge, blind-embossed vine border,
    flat lay, straight-on overhead camera, soft even diffuse light,
    no cast shadow, no text, no lettering, no logo, no hands, no props,
    plain white background, vertical 9:16

Three details that matter more than they look:

- **flat lay, straight-on** — any perspective tilt makes the layers
  un-composable, because the CSS applies its own 3D to a surface it assumes
  is flat.
- **no text** — a generator will emboss plausible-looking words in wrong
  letterforms, and it is unremovable once baked into paper texture.
- **plain white background** — this is what makes the cut-out reliable.

## Per-layer prompt

| layer | add to the shared spec |
|---|---|
| `body` | "a plain rectangular envelope back panel, flat, filling the frame" |
| `interior` | "looking down into an empty open envelope, interior back panel in soft shadow, pocket empty" |
| `pocket` | "the front pocket of an envelope, lower two thirds of the frame, its top edge a wide shallow V" |
| `flap` | "a single triangular envelope flap alone, apex pointing down, occupying the upper portion of the frame, embossed vine along both edges" |
| `flap-inner` | "the underside of the same triangular flap, plain unembossed paper, apex pointing down" |
| `seal` | "a round wax seal, champagne gold, blank smooth centre, centred, small" |

**`pocket` empty is load-bearing.** If a card is drawn inside it, that card is
baked into the pixels and the real invitation will collide with it.

## After generating

1. Remove the white background from `flap`, `flap-inner` and `seal` (these
   three need alpha). `body`, `interior` and `pocket` may stay opaque.
2. Keep all six at 768x1376 except `seal`, which is square.
3. `pnpm optimize:images` for WebP conversion and the 1600px cap.
4. Measure the flap's apex — where the V comes to a point — as a percentage
   down the artwork, and put it in the registry as `sealY`. It positions the
   seal and sets the pocket's mouth. **Measure it, never assume it.** The
   first envelope's true apex was 79.6% down and 53.2% across while the code
   had assumed 74% and 50%.

## Frames, and why not

A hand-drawn sequence (closed, ajar, half open, open) is the other way to do
this. It is not the way to start: it multiplies the asset count per design,
grows payload, and freezes the timing into the artwork so no template can
adjust it. Five layers plus one animation stays customisable across every
envelope that will ever exist.
