# Design Roadmap

Ten wedding designs, each a distinct vibe with its own envelope and invitation.
Built one at a time through the same pipeline, on its own branch
(`feat/design-<slug>`), merged only when every column of its row is ticked.

Scope for now: **weddings only.** Engagement and celebration shelves keep their
placeholders until this list is done.

Run `/create-design [slug]` to work a design through this file: it picks up at
the next unticked step. Invitations are built from real imagery (painted,
photographed, filmed or rendered), never SVG illustration or CSS-drawn
ornament.

## Status

| #  | Slug       | Vibe                                  | Brief | Entry | Envelope | Invitation | Verified | Live |
|----|------------|---------------------------------------|:-----:|:-----:|:--------:|:----------:|:--------:|:----:|
| 1  | `lin`      | Film, sage and cream, falling petals  |  ✓    |  ✓    |  ✓ (1 frame) |  ✓     |  ✓       |  ✓   |
| 2  | `jardin`   | Painted garden, parallax arch         |  ✓    |  ✓    |  ✓       |  ✓         |  ✓       |  ✓   |
| 3  | `dentelle` | Le Trousseau: heirlooms on silk       |  ✓    |  ✓    |  ✓       |            |          |      |
| 4  | `velours`  | Burgundy velvet, candlelit            |       |       |          |            |          |      |
| 5  | `nuit`     | Midnight navy, gold foil, stars       |       |       |          |            |          |      |
| 6  | `marbre`   | White marble, gold leaf, minimal      |       |       |          |            |          |      |
| 7  | `azur`     | Mediterranean coast, lemons, tiles    |       |       |          |            |          |      |
| 8  | `cedre`    | Lebanese heritage, cedar, arabesque   |       |       |          |            |          |      |
| 9  | `aquarelle`| Airy watercolour wildflowers          |       |       |          |            |          |      |
| 10 | `olivier`  | Olive grove, terracotta, late sun     |       |       |          |            |          |      |

Lin's envelope ships its sealed frame only (`count: 1` in `lib/envelopes.ts`);
its opening render is outstanding.

## The pipeline

### 0 — Brief

One paragraph per design, added under **Briefs** below, before anything is
built. The envelope and the invitation are both derived from it, which is what
keeps the pair reading as one object.

- [ ] Palette: 3 to 5 named colours, one of them the accent
- [ ] Paper: the envelope's material and texture
- [ ] Seal: wax colour and the motif pressed into it
- [ ] Type: a script or display face for names, a body face (Google Fonts, loaded in the template's own `fonts.ts`)
- [ ] Signature interaction: the one moment that is this design's alone. No two designs share one (Lin: film behind the names and falling petals; Jardin: three-plane parallax)
- [ ] Asset list: every image, video and render the design needs, with its target size

### 1 — Entry (placeholder, draft)

- [ ] Add the slug to `REGISTRY` in `components/invitation/registry.ts` with `draft: true`
- [ ] Borrow an existing `component` and `preview` until its own exist, and say so in a comment
- [ ] Write `name`, `summary`, `story` and `character` from the brief
- [ ] Open `/weddings/<slug>`: it renders, and it is absent from `/weddings` and the sitemap

A draft prerenders and opens by URL for review, carries `noindex`, and is kept
off every shelf, the sitemap and the "other designs" row.

### 2 — Envelope

- [ ] Model and animate in Blender (`INVITATION SYSTEM/00_MASTER/`), starting from `Envelope_Scalloped_MASTER.blend`'s timing: flap peels 1 to 80, body leaves from 81
- [ ] Set the frame range by when the envelope clears the CAMERA, not by the rig (Jardin shipped 17 wasted tail frames)
- [ ] Render to PNG at 800x1732
- [ ] `node scripts/envelope-frames.mjs <renderDir> public/envelope/<slug>/frames`
- [ ] Add an `EnvelopeSpec` to `lib/envelopes.ts`: `count` from the script's report, `tail.from` in SHIPPED numbering
- [ ] Measure the seal off frame 1 by hue margin, not by colour distance, and set `sealX`, `sealY`, `sealSize` (bbox width)
- [ ] Watch the opening at `/weddings/<slug>`: tapping the seal lands on it, playback is smooth, the wax leaves with the flap

### 3 — Invitation

- [ ] `components/invitation/templates/<slug>/` with `index.tsx` and `fonts.ts`, plus one file per client island
- [ ] Imagery under `public/invitation/<slug>/`, WebP, at most 1600px wide (`pnpm optimize:images`)
- [ ] Render every field of `InvitationContent`; respect `entitlements`
- [ ] Swap the registry entry's `component` to the new template
- [ ] Tests for any logic the template owns (countdowns, sequencing)

### 4 — Verify

- [ ] Phone width (390px) and desktop, top to bottom
- [ ] `prefers-reduced-motion`: the signature interaction degrades to a still
- [ ] Arabic content and RTL: names, dates and body text lay out correctly
- [ ] Weight: frames plus imagery for the first screen stay reasonable on 4G
- [ ] `pnpm lint && pnpm typecheck && pnpm test`

### 5 — Live

- [ ] Capture the opening page at 647x1395 to `public/collection/<slug>/opened.webp`
- [ ] `pnpm mockup:compose <slug>` writes `public/collection/<slug>/card.webp`
- [ ] Point `preview` at the new card
- [ ] Clear the image cache (`.next/dev/cache/images`, `.next/cache/images`): the optimizer caches by URL and keeps serving the old card
- [ ] Remove `draft: true`
- [ ] Tick the row above, fold structural notes into `ARCHITECTURE.md`, merge

## Briefs

### 3 — Dentelle

**Le Trousseau.** The envelope is ivory damask with a lace trim and a
rose-gold rose-wreath seal; inside is the bride's keepsake box, photographed
from directly above on ivory silk. The page is one continuous flat-lay the
guest travels down, and every part of the invitation is an heirloom laid on
the silk: the names on a blank letterpress card, the countdown in the lid of
a pocket watch, the venue on the back of an old postcard, the evening on
luggage tags tied with ribbon. Nothing is drawn. Every object is a
photograph, and every word on it is live type set onto its blank surface.

- **Palette:** Silk `#f6f1ea` (ground), Pearl `#e9e1d6` (deep ground),
  Letterpress `#2f2a26` (ink), Rose gold `#b07a5f` (**accent**, the wax),
  Dried rose `#c4a09b` (ribbon, rules). The silk is lighter and warmer than
  the envelope's greige damask, so the flap opens onto a lit box.
- **Type:** Bodoni Moda italic for the names (the high-contrast cut of a
  letterpress card), Libre Caslon Text for body and small caps, Courier
  Prime for the tags only (typed, as a real tag would be). None is used by
  another template.
- **Signature interaction:** objects are *placed*, not scrolled past. As
  each one enters the viewport it settles onto the silk: from 1.04 scale and
  a 2 to 4 degree turn to rest, its shadow tightening from soft to contact
  over 700ms, as if set down by hand. The silk scrolls at 0.85 of the page so
  the objects sit visibly above it. Tapping a luggage tag turns it over
  (`rotateY`, 600ms) to its back, which carries that item's description.
  Reduced motion: objects appear at rest, the silk scrolls with the page,
  and the tag swaps sides with a 200ms crossfade.
- **Sections:**
  - *Hero:* the letterpress card, centred, with the pearl strand curving
    under it and the pressed rose at its corner. `headline` in small caps
    above, names in Bodoni italic, "and" in Caslon italic. `initials` are
    blind-debossed into the card's foot (live text, inset shadow, no ink).
  - *Message:* a smaller folded note card overlapping the hero card's lower
    edge, `message` in Caslon.
  - *Date and countdown:* the open pocket watch. The date is set across a
    length of ribbon beside it; the countdown (days, hours, minutes) is
    engraved into the polished inside of the lid (live type, rose-gold
    gradient with a dark inner shadow).
  - *Venue:* the back of a vintage postcard. `venue.name` and
    `venue.addressLine` sit on its address lines in Caslon italic; the
    stamp is the map link (`venue.mapUrl`), labelled "Directions" beneath it.
  - *Schedule:* one luggage tag per item, strung down a single ribbon, each
    at a slightly different angle. Front: `time` in Courier, `title` in
    Caslon. Back (on tap): `description`. An item with no description has
    no back and does not turn.
  - *Gallery (if entitled):* the couple's photos as deckled vintage prints,
    overlapping, each turned a little. The couple's images sit inside the
    print frame asset's window.
  - *Registry message:* a small blank card tucked half out of a glassine
    envelope, `registryMessage` on the visible part.
  - *Close:* the rose-gold seal again, alone on the silk, with the initials
    in small caps beneath it. The box closes where the envelope began.

**Assets.** All AI stills are generated with `style-key` as the reference
image. Cutouts are generated on a plain flat light-grey background, then
background-removed; their shadow is rebuilt in CSS so the settle can animate
it. No asset contains a name, date, place or any lettering.

| id | path | what it is | source | size | alpha | prompt / notes |
|----|------|------------|--------|------|-------|----------------|
| style-key | `design-src/dentelle/style-key.webp` (reference only, outside `public/` so it never ships) | The whole trousseau as one flat-lay | AI image | 1600x2000 | no | Overhead flat-lay photograph, lens pointing straight down, of a bride's heirloom trousseau laid on ivory silk charmeuse with soft folds: a blank deckled cotton card, a strand of pearls, a pressed dusty-pink rose, a length of dusty-rose silk ribbon, an antique gold pocket watch with its lid open, a manila luggage tag. Soft north window light from the upper left, gentle long shadows, warm ivory and greige with rose-gold accents, fine film grain, quiet editorial wedding photography. No text, no lettering, no numbers. |
| silk | `public/invitation/dentelle/silk.webp` | The ground: ivory silk, seamless vertically | AI image | 1600x1600 | no | Top-down photograph of ivory silk charmeuse with soft, shallow folds, even soft window light from the upper left, no objects, fine grain. Seamless tileable texture. Check the vertical seam before shipping. |
| card | `public/invitation/dentelle/card.webp` | Blank letterpress card, deckled edges | AI image | 1200 wide, portrait 5:7 | yes | A single blank heavy cotton letterpress card with hand-torn deckled edges, lying flat, photographed straight down, soft light from the upper left. Completely blank, no printing, no text. |
| note | `public/invitation/dentelle/note.webp` | Small folded note card | AI image | 1000 wide, landscape 3:2 | yes | A single small folded note card in warm white laid paper, slightly open, lying flat, straight down, soft light from the upper left. Blank, no text. |
| pearls | `public/invitation/dentelle/pearls.webp` | Pearl strand in a loose curve | AI image | 1400 wide | yes | A strand of creamy freshwater pearls lying in a loose, open curve, straight down, soft light from the upper left, each pearl with a soft highlight. |
| rose | `public/invitation/dentelle/rose.webp` | Pressed dried rose | AI image | 700 wide | yes | A single pressed and dried dusty-pink rose with two leaves, flattened, lying flat, straight down, delicate and papery. |
| ribbon | `public/invitation/dentelle/ribbon.webp` | Long straight length of silk ribbon | AI image | 1600 long, landscape | yes | A long straight length of dusty-rose silk ribbon, 3cm wide, lying flat with one gentle twist, straight down, soft sheen. |
| ribbon-vertical | `public/invitation/dentelle/ribbon-vertical.webp` | The schedule's string: ribbon running down the page | AI image | 400x1600 | yes | Same ribbon as `ribbon`, lying vertically with a slight wander, straight down. Must tile or be long enough for eight tags. |
| watch | `public/invitation/dentelle/watch.webp` | Antique gold pocket watch, lid open | AI image | 1200 wide | yes | An antique gold pocket watch lying open, straight down, its lid open above it showing a plain, highly polished blank inside with no engraving, dial with simple Roman numerals, soft light from the upper left. |
| postcard | `public/invitation/dentelle/postcard.webp` | Back of a vintage postcard | AI image | 1400 wide, landscape | yes | The back of a blank vintage postcard, aged cream card, a faint dividing line and four blank address lines on the right, one postage stamp showing a small rose in the top right corner with a round postmark that has no legible words or numbers, straight down. |
| tag-front | `public/invitation/dentelle/tag-front.webp` | Manila luggage tag, front | AI image | 700 wide | yes | A single blank manila luggage tag with a rose-gold metal eyelet and a short loop of dusty-rose silk ribbon through it, lying flat, straight down. Blank, no text. |
| tag-back | `public/invitation/dentelle/tag-back.webp` | Same tag, reverse | AI image | 700 wide | yes | The reverse of `tag-front`: same tag, mirrored so the eyelet sits in the same place when flipped, blank. Generate from `tag-front` as the reference. |
| print | `public/invitation/dentelle/print.webp` | Vintage deckled photo print frame | AI image | 1000 wide | yes | A blank vintage photographic print with a wide white deckled border, the image area plain mid-grey. The grey window is cut to transparent in code (CSS mask) so the couple's photo shows through. |
| glassine | `public/invitation/dentelle/glassine.webp` | Small glassine envelope | AI image | 900 wide | yes | A small translucent glassine envelope, open flap, lying flat, straight down. Keep its translucency; remove only the background. |
| seal | `public/invitation/dentelle/seal.webp` | The envelope's rose-gold wax seal, alone | Blender | 800x800 | yes | Render the seal object alone from `Envelope_Scalloped_MASTER.blend`, top-down camera, transparent film, same lighting. The one asset that must match the envelope exactly. |
| opened | `public/collection/dentelle/opened.webp` | Collection still | capture | 647x1395 | no | Captured in step 5 from the live hero: card, pearls and rose on silk. |

### 4 — Velours

To be written. Direction: burgundy base, velvet texture, candlelight, gold.
