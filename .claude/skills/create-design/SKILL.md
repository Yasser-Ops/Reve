---
name: create-design
description: Drives a new Rêve invitation design (envelope + invitation pair) through the pipeline in docs/design-roadmap.md, from concept to live card. Use whenever the user wants to start, continue or resume a design ("create invite", "new design", "let's do Velours", "next design", "where are we on Dentelle", "what assets do I need"), asks for an invitation concept or brief, or wants the asset list for a design. Produces out-of-the-box concepts, a written brief, a sourced asset list built on real raster/video/3D assets, and the draft registry entry.
---

# Create a design

A Rêve design is an envelope and the invitation it opens into, sold on how it
looks. Ten wedding designs are planned; each one has to feel like it came
from a different hand. `docs/design-roadmap.md` is the source of truth for
the pipeline, the status table and every brief. Read it first, every time.

## Where are we?

1. Read `docs/design-roadmap.md` and `components/invitation/registry.ts`.
2. If the user named a design, find its row. The next unticked column is the
   step to do. If they named none, take the first row that isn't live and say
   which one you picked.
3. Do that step (below), tick it in the table, and stop at the step's stop
   point. Each design lives on `feat/design-<slug>`.

## Step 0 — Brief

This is the step that decides whether the design is any good, so it gets the
most care.

### Read what already exists

Open every template under `components/invitation/templates/` and the
registry's `story` and `character` lines. Note each one's signature
interaction and art medium (Lin: the couple's own film behind the names,
sage/cream bands, falling petals. Jardin: a painted scene in three planes
that separate as you scroll, a vine timeline). A new design that shares
either is a reskin, and reskins are what make a collection feel like a
template shop.

Also look at the design's envelope if it exists (`public/envelope/<slug>/frames/0001.webp`):
its paper, its seal motif and its colour are where the invitation starts.

### Generate three concepts, not one

The first idea is the one any template shop has already built. Write three
concepts that each come at the design from a different angle, then offer them
to the user. Useful angles:

- **The object:** what physical thing would this invitation be if it were
  posted? A folded letter, a menu card, a theatre programme, a tasting card
  with a pressed flower, a hotel key tag. Build the page as that object.
- **The place:** a real kind of location (a courtyard in Beirut, a vineyard
  terrace, a candlelit cellar) photographed or painted, which the guest moves
  through.
- **The material:** the envelope's own material continued inside (lace
  unrolling, velvet folds parting, marble veins carrying the timeline).
- **The ritual:** a wedding custom made interactive (lighting candles for
  each part of the evening, a zaffe drum beat as the hero, rice thrown as
  the scroll transition).
- **The hour:** the invitation as a passage of light from late afternoon to
  night, so scrolling is the evening going by.

Each concept gets: a name for its idea, the signature interaction in one
sentence (what the guest does and what the page does back), the art medium,
and one line on why it fits this envelope. Push at least one of the three
somewhere that feels slightly too ambitious. It is easier to pull an
ambitious idea back than to lift a safe one.

**Stop point:** the user picks or blends a concept.

### Write the brief

Add it under **Briefs** in the roadmap as one paragraph plus these fields:

- **Palette:** 3 to 5 hex values with names, one marked as the accent. The
  invitation's ground should be a deliberate step away from the envelope's
  paper, not sampled from it (Jardin's note on this is worth reading: the
  envelope reads as dusk, the invitation as the lit room inside it).
- **Type:** a display or script face for the names and a body face, both
  from Google Fonts, neither already used by another template.
- **Signature interaction:** the chosen concept's, stated precisely enough
  to build: trigger, motion, and what it looks like with reduced motion.
- **Sections:** how each field of `InvitationContent` appears (names,
  initials, date and countdown, headline, message, venue with map, schedule,
  gallery if entitled, RSVP if entitled, registry message). Every field must
  land somewhere that belongs to this design.
- **Asset list:** see below.

### Real assets, not drawn vectors

The invitation is built from real imagery: painted, photographed, filmed or
rendered. That means raster images, video loops and Blender renders. It does
not mean SVG illustration, CSS-drawn ornaments or icon fonts. Flat vector
art is what makes a digital invitation look like a template, and it is
exactly what a couple paying for a hand-made feel can tell apart. CSS
handles layout, colour and motion; the pictures are pictures. The one
exception is functional UI a guest must read at any size (a map pin, a
close button), and even those should be quiet.

Every couple's names, date, venue and schedule are different, and there
may be hundreds of couples on one design. So no asset may contain any of
that text: an image of a card with names printed on it works for one couple
only. Assets frame the live type (the blank card the names sit on, the
ribbon the date hangs from), and the type itself stays real text, styled
with CSS. It can still take on the material, for example a photographed
thread or foil texture clipped to the letters. Test each concept against
this before offering it.

Write the asset list as a table in the brief:

| id | path | what it is | source | size | alpha | prompt / notes |
|----|------|------------|--------|------|-------|----------------|

- **path:** under `public/invitation/<slug>/`, `.webp` for stills, `.mp4`
  for video. Stills at most 1600px wide.
- **source:** `AI image`, `AI video`, `Blender`, `photo` or `user supplies`.
- **alpha:** layers that sit over other layers (parallax planes, petals,
  lace, candle flames) need transparency. Plan them as generated on a flat
  plain background and then background-removed, and say so.
- **prompt:** a complete prompt for AI assets, written in the design's art
  language. Start the list with a **style key**: one reference image that
  fixes the medium, palette and light. Every other AI asset is generated
  with the style key as its reference, which is what stops ten generations
  from looking like ten artists.
- Include the collection still: the opening page captured at 647x1395 for
  `pnpm mockup:compose`. It is produced in step 5, but listing it keeps the
  first screen honest about how it will look on the card.

Keep the list to what the design actually uses. A long list of maybes turns
into assets nobody places.

**Stop point:** the user gathers the assets. Offer to generate the AI ones
with the Higgsfield tools, but ask first, since generation spends credits.

## Step 1 — Draft entry

Follow step 1 of the roadmap. The entry takes `draft: true`, borrows an
existing `component` and `preview` with a comment saying so, and gets
`name`, `summary`, `story` and `character` written from the brief. Copy
follows the house prose: no em-dashes used as mid-sentence pivots. Run
`pnpm vitest run tests/lib/catalogues.test.ts tests/components/invitation/registry.test.ts`.

## Steps 2 to 5

Follow the roadmap's checklists. They record the envelope render timing, the
frame script, seal measurement, template layout, verification and the card
compose, including the lessons behind them. Before building the invitation,
check every asset in the brief's table exists on disk; a missing asset found
halfway through a component leads to a placeholder shipping.

Finish every step with `pnpm lint && pnpm typecheck && pnpm test`, tick the
row, and put structural notes in `STAGING_CHANGES.md` rather than
`ARCHITECTURE.md` (the project folds them in at the end of the session).
