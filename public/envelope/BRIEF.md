# Envelope artwork brief

An envelope is **four layers**, not a picture of an envelope and not a sequence
of frames. The browser animates the parts; the artwork only has to supply them.

    pocket.webp      the front face. The card slides out from BEHIND this.
    flap.webp        the triangle that rotates. Transparent everywhere else.
    flap-inner.webp  the same flap from behind, for past vertical.
    seal.webp        the wax. It is the button.

There is no `body` and no `interior`. The pocket is opaque everywhere except its
mouth, so a back panel behind it can never be seen, and what shows through the
mouth is a CSS white fill — the gate turns the whole ground white as it opens
anyway. Both shipped as files for a while and neither was ever visible.

Replacing these four files and one entry in `lib/envelopes.ts` is a whole new
envelope. No CSS changes, no component changes.

---

## The five rules

These hold however the layers are made. Each one is here because breaking it
shipped a bug.

1. **Flap and pocket are complements of ONE photograph.** Cutting guarantees
   they register. Two separately drawn pieces can disagree by a few pixels, and
   that gap is visible as a seam the moment the flap moves.

2. **Only ever reassign pixels. Never modify them.** Because the pieces are
   exact complements, anything painted, blurred or retouched *outside* the flap
   is visible while the envelope is sealed. A stray ornament was once blurred
   off the pocket's mouth: it fixed the open state and silently wrecked the
   closed one.

3. **Cut on the flap's OUTER edge** — where its deckle meets the paper beneath —
   taking the whole flap and its entire border. A cut placed inside the flap
   strands part of the ornament on the pocket. Invisible sealed; once the flap
   rotates away it leaves cut-off ornament on one side of the mouth and none on
   the other, which reads as a flap cropped off-centre.

4. **Front and back faces share one horizontal geometry.** The hinge rotates
   about the X axis and the back face carries `rotateX(180deg)`, which mirrors
   *vertically* — paper folded about its top edge keeps its x. A back face
   mirrored horizontally throws the flap sideways the instant the hinge passes
   vertical. Derive `flap-inner`'s alpha from `flap` and the problem cannot
   occur.

5. **Reassembly proves the pieces fit, never that they fit in the right
   place.** Any seam reassembles perfectly, which is why a bad one went
   unnoticed for a long time. Placement is judged by eye, against an overlay.

---

## What to supply

Three images per envelope. Flat lay, straight-on overhead camera, soft even
diffuse light, no cast shadow, no perspective tilt — the CSS applies its own 3D
and assumes a flat surface.

| file | what |
|---|---|
|  `source-closed.png` | the envelope **closed and sealed**. 768x1376 (9:16). Everything is cut from this. |
|  `source-open.webp` | the same envelope **open**, same canvas and camera. Supplies the flap's underside. |
| `seal.webp` | the wax alone, with alpha, blank smooth centre. 512x512. |

**No text, ever.** A generator will emboss plausible-looking words in wrong
letterforms and it is unremovable once baked into paper texture. The couple's
initials are drawn over the wax in CSS.

**The seal's centre must be blank** for the same reason.

---

## Making the layers — by hand

This is the normal path. Free tools that do it: **Photopea** (browser, no
install), **GIMP**, **Krita**.

1. Open the closed-envelope photograph.
2. Trace the flap along its **outer** edge with the pen tool — rule 3. Follow
   the deckle; paper has no straight edges.
3. Export the selection as `flap.webp`.
4. **Invert the same selection** and export `pocket.webp`. Inverting rather than
   re-tracing is what keeps them exact complements — rule 1.
5. Apply that same selection to the open-envelope photograph, flipped
   **vertically**, and export `flap-inner.webp` — rule 4. Vertically and not
   horizontally.
6. Set `sealY`/`sealX` in `lib/envelopes.ts` to where the V reads as
   converging. This is a judged value, a little **above** the paper's tip — not
   the flap's lowest point.
7. Open `/lab/envelope` and check each layer alone against the grey ground. A
   defect is obvious there and nearly invisible in the finished composite.

---

## Making the layers — in a hurry

`scripts/cut-envelope.mjs` does the same cut programmatically. It exists for
when hand-tracing is not practical; hand work gives a better edge.

```
node scripts/cut-envelope.mjs --dry seam.png   # writes an overlay to inspect
node scripts/cut-envelope.mjs                  # writes the three layers
```

It snaps to the paper edge per row, inside a narrow corridor around a
hand-placed guide rail, then smooths the result. It asserts that flap and
pocket reassemble the source exactly and refuses to write otherwise.

**The guide rail is required and is set by hand.** Edge detection alone does not
work on this artwork: over a wide search window it locks onto the embossed
border's relief, which is a stronger gradient than the paper edge, and returns
a seam through the middle of the ornament. The rail is what keeps the search
away from it.

The rail is two straight lines meeting at an apex, so the script assumes a
**pointed** flap. A square, curved or scalloped flap needs a different rail —
that is a code change, not a config change.

---

## Frames, and why not

A hand-drawn sequence (closed, ajar, half open, open) is the other way to do
this. It is not the way to start: it multiplies the asset count per design,
grows payload, and freezes the timing into the artwork so no template can
adjust it. Four layers plus one animation stays customisable across every
envelope that will ever exist.
