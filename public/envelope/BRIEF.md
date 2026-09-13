# Envelope artwork brief

An envelope is **a rendered frame sequence**, not a set of cut layers and not a
photograph. The whole opening — the flap peeling, the paper flexing, the wax
breaking, the envelope leaving the frame — is authored in Blender. The browser
advances through the result and composites nothing.

    frames/0001.webp   sealed. The poster frame, and what a guest sees at rest.
    frames/NNNN.webp   open, and the paper clear of frame.

Replacing that directory and one entry in `lib/envelopes.ts` is a whole new
envelope. No CSS changes, no component changes.

## Why this replaced four cut layers

The previous approach shipped `pocket`/`flap`/`flap-inner`/`seal` as separate
images and hinged them with CSS `rotateX`. It had two real advantages: the
timing stayed adjustable per template, and the payload was four files.

It was abandoned because of what it could not do. A hinge built from flat
planes cannot show paper **bending** — the flap stays rigid through its whole
travel — and it cannot show wax **tearing**, only fading. Both are the moments
the ceremony exists for. The cutting itself was also unforgiving: every piece
had to be an exact complement of every other, and a seam that reassembled
perfectly could still be in the wrong place.

Frames give up the adjustable timing, which is now baked into the render, and
cost more bytes. They buy physical behaviour under real light.

---

## What to supply

One directory of numbered stills per envelope.

| | |
|---|---|
| **format** | `.webp`, numbered from `0001`, zero-padded consistently |
| **aspect** | 9:16. The frame is a phone screen. |
| **camera** | Locked. It must not move between frames — the envelope moves, the camera does not. |
| **frame 1** | Sealed, wax whole. This is the poster and the resting state. |
| **last frame** | The paper entirely clear of frame. |

The count and `fps` go in `lib/envelopes.ts`; neither is chosen here, both are
read off the render.

### The camera must be locked

The sequence is painted into a single `<img>` with `object-fit: cover`. A
camera that drifts even slightly shows up as the whole screen sliding, because
nothing else in the frame is moving to explain it.

### The paper must leave

The gate hands over to the invitation when the sequence ends, and it does that
by simply unmounting the paper. If the last frame still has envelope in it, the
envelope vanishes on a cut. The render has to carry it off-screen.

### No text, ever

Embossed words come out in wrong letterforms and are unremovable once baked
into paper texture. **The couple's initials are drawn over the wax in CSS** and
are never part of the render — every couple shares the same frames.

### The wax is baked, its placement is not

The wax is rendered, lit, pressed and broken in Blender. But `sealX`, `sealY`
and `sealSize` in `lib/envelopes.ts` are still **measured off frame 1**, because
they place the initials over it and size the tap target underneath them. Measure
them from the sealed frame, not from the model.

Keep the wax's face reasonably flat and unornamented in frame 1. Lettering sits
on it.

---

## Frames are preloaded before the seal goes live

`FrameSequence` decodes every frame before it will let the seal be tapped, and
the hint reads "One moment" until it has. A sequence that fetched as it played
would stutter partway through the opening, which is the one moment in the
product a guest actually remembers.

This is what makes frame count a real cost rather than a free parameter. Every
frame is downloaded before anything can happen.

## Reduced motion holds frame 1

`prefers-reduced-motion` never plays the sequence: it holds the sealed frame and
cuts to the invitation. A render is indivisible — unlike the old CSS transforms,
there is no way to still part of it — so the choice is play or don't.
