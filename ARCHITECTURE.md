# Rêve — Architecture

Digital invitations for weddings, engagements, and other occasions. Public
storefront plus a per-invitation guest-facing page at its own link.

---

## 01 — Layout map

```
app/
  layout.tsx                    Root. Fonts, metadata template "%s · Rêve".
  globals.css                   STOREFRONT tokens only (see 04).

  (store)/                      Route group. Storefront chrome.
    layout.tsx                  SiteNav + SiteFooter wrapper.
    page.tsx                    Home. Wedding-led; the wedding page IS "/".
    collection/page.tsx         Every template, rendered live.
    collection/error.tsx
    [event]/page.tsx            One landing page per occasion (SSG).
    [event]/error.tsx
    [event]/not-found.tsx

  i/[slug]/page.tsx             The live invitation. NO storefront chrome:
  i/[slug]/error.tsx            a guest must never see Rêve's nav over the
  i/[slug]/not-found.tsx        couple's page.

components/
  store/                        Marketing surface.
    SiteNav.tsx                 [CLIENT] scroll state + mobile menu
    SiteFooter.tsx
    Reveal.tsx                  [CLIENT] IntersectionObserver scroll reveal
    PhoneFrame.tsx              Decorative device chrome; children swap freely
    InvitationDemo.tsx          Looping envelope→invitation sequence (CSS only)
    invitation-demo.css         One documented timeline drives all 7 layers
    HeroEnvelope.tsx            Static envelope, above the fold
    TemplateCompare.tsx         [CLIENT] draggable seam between two templates
    TemplateCard.tsx            Collection grid card; shows the composed mockup
    TemplateFrame.tsx           Known-aspect crop of a scrolling invitation
    TemplateThumbnail.tsx       Renders at RENDER_WIDTH, scaled to fit
    LiveInvitationDemo.tsx      [CLIENT] the real gate + invitation, in a phone
    StickyCta.tsx               [CLIENT]
    WhatsappThread.tsx          Illustration of the forwarded link
    RsvpPanel.tsx               Illustration of the guest list
    FaqList.tsx                 [CLIENT] disclosure

  invitation/                   The product itself.
    registry.ts                 slug -> {component, catalogue copy}
    TemplateRenderer.tsx
    EnvelopeGate.tsx            [CLIENT] fixed inset:0 — IS the guest's screen
    FrameSequence.tsx           [CLIENT] plays the rendered opening
    envelope.css                Stage, card and seal; the paper is a render
    motifs/                     SHARED VISUALS ONLY. Petals.
    templates/lin/              Film hero, sage/cream bands, falling petals

lib/
  events.ts                     Occasion registry (see 03)
  sample-invitation.ts          ONE wedding, shared by every marketing preview
  constants.ts, entitlements.ts, contact.ts, countdown.ts
  schemas/invitation.ts         zod: content, theme, entitlements
  invitations/get-published.ts  Anon PostgREST read
  hooks/useCountdown.ts         Ticking clock; every dial is drawn per design
  mockup.ts                     ads.jpg geometry (shared with the composer)
  rest.ts, env.ts, envelopes.ts

scripts/
  compose-mockup.mjs            Cuts stills into ads.jpg -> collection card
  optimize-images.mjs
```

**Client islands are deliberately shallow.** `InvitationDemo`, `RsvpPanel`,
and `WhatsappThread` are server components: they are pure CSS and markup, so
nothing ships to the browser for them. Only genuine interaction
(`TemplateCompare`, `SiteNav`, `FaqList`, `StickyCta`) crosses the boundary,
plus the two halves of the ceremony: `EnvelopeGate` and `FrameSequence`.

A template is a SERVER component. `Lin` renders on the server; only its
`CountdownDial` and `Petals` are islands, so a design's typography and layout
cost the browser nothing.

---

## 02 — Procedural traces

**Guest opens an invitation**

```
WhatsApp link  ->  GET /i/[slug]
  page.tsx (server)
    getPublishedInvitation(slug)      lib/invitations/get-published.ts
      restGet()                       raw fetch, anon key, no supabase-js
      -> published_invitations view   (RLS-sealed projection)
      zod parse: content/theme/entitlements
    notFound() when unpublished
    getTemplate(template_slug)        components/invitation/registry.ts
    <Template content theme entitlements />
  EnvelopeGate [CLIENT] fixed inset:0
    getEnvelope(slug)                lib/envelopes.ts -> frames + seal geometry
    FrameSequence preloads EVERY frame; seal disabled, hint "One moment"
    tap seal
      0 .. openingDurationMs(frames)   the RENDERED opening plays
                                       (flap, paper, wax, exit: all in Blender)
      + CARD_SETTLE_MS (900)           the card finishes growing to the viewport
      then state 'open', gate unmounts

      Two clocks, not one: the render's own length says when the paper is
      gone, and the tail is what the card still needs to reach full size. The
      card ends on the identity transform — exactly where an untransformed
      page sits — so unmounting the gate changes not one pixel. There is no
      veil and no white beat; both existed only to carry a background across
      that moment.

      reduced motion: the sequence never plays. Frame 1 holds, and the
      invitation arrives after 400ms. A render cannot be partially stilled.
    The envelope replays on every visit. A returning guest is usually
    showing it to someone; Skip is always one tap away.
```

**Visitor compares two designs**

```
GET /  ->  page.tsx (server)
  SAMPLE_CONTENT parsed once via invitationContentSchema
  renders BOTH CapBlanc and Nuit from that one object
  each wrapped in TemplateThumbnail (fixed RENDER_WIDTH)
  handed to TemplateCompare as `base` / `overlay` children
    ^ children, not component props: a server component cannot
      cross the client boundary as a prop
  TemplateCompare [CLIENT]
    ResizeObserver -> scale = frameWidth / RENDER_WIDTH -> --thumb-scale
    range input owns position; clipPath insets the overlay
```

**Visitor browses the collection**

```
GET /collection  ->  page.tsx (server, static)
  TEMPLATES (registry) -> for each: entry.component rendered with
  SAMPLE_CONTENT, wrapped in TemplateThumbnail, passed as children
  to TemplatePreview [CLIENT] which measures and captions it
```

**Occasion landing page**

```
build  ->  generateStaticParams() from EVENTS  ->  /engagements, /birthdays
GET /[event]
  getEvent(slug) || notFound()      dynamicParams = false
  metadata + Service JSON-LD on the initial response
```

---

## 03 — Data flow and registries

### Occasion registry — `lib/events.ts`

| field | drives |
|---|---|
| `slug` | the route, via `generateStaticParams` |
| `prominence` | `lead` -> nav + footer + home strip; `secondary` -> footer + home strip + FAQ, never nav |
| `startMessage` | the prefilled WhatsApp order intake |
| `heading` / `headingAccent` | hero; accent must appear in heading or the italic split silently no-ops (tested) |

**Weddings have no entry, deliberately.** The home page *is* the wedding page.
A `/weddings` route would compete with it for the same queries.

Current: `engagements` (lead), `birthdays` (secondary).

### A design is built from scratch — there is no shared sheet

`lib/sheet.ts`, `components/invitation/Sheet.tsx` and the band/`BAND_BRIEF`
model are GONE, along with `cap-blanc`, `nuit` and `verdure`. A design is now a
directory under `components/invitation/templates/<slug>/` that owns its whole
layout.

The reason is commercial rather than technical. A wedding invitation is bought
on how it looks, and every wrapper held in common pulls the next design toward
the last one's silhouette. The shared `Countdown` had grown a `bare` flag and a
`numeralClassName` prop — one per template that wanted its own dial. That is
the shape a shared component takes when designs that should own their layout
have to negotiate for it.

What is shared is narrow and deliberate:

- `motifs/` — visuals that paint OVER a design without shaping it. `Petals` is
  the first. Any template may opt in; none inherits a silhouette by doing so.
- `lib/hooks/useCountdown.ts` — a clock, not a look. It returns four numbers;
  each design draws its own dial. A hook has nothing to negotiate over.
- `lib/schemas/invitation.ts` — ONE superset content schema.

**Freedom is in rendering, not in storage.** Every field past the core four is
optional or defaulted, so a template renders what it wants and ignores the
rest. Per-design schemas would mean per-design forms and per-design migrations
for what is one row in one table.

DEFERRED: a per-template `uses: [...]` declaration in the registry, so an
editor form asks only for the fields a chosen design actually renders. Not
worth guessing at with one template and no form built.

### The envelope — `lib/envelopes.ts`

**The opening is a PRE-RENDERED FRAME SEQUENCE.** It was four cut layers
(pocket/flap/flap-inner/seal) hinged by CSS `rotateX`; it is not any more.
Flap, paper, wax and the envelope leaving frame are authored in Blender, and
the browser advances through numbered stills compositing nothing.

The trade, stated plainly. Layers kept the timing adjustable per template and
cost four files. But a hinge built from flat planes cannot show paper BENDING
or wax TEARING — the two moments the ceremony exists for — and every piece had
to be cut as an exact complement of every other, where a seam could reassemble
perfectly and still be misplaced. Frames give up adjustable timing, which is
baked into the render, and buy physical behaviour under real light.

`EnvelopeSpec` = `{ slug, name, frames: {dir, count, pad, fps, width, height} }`
plus seal geometry. Adding an envelope is a directory under
`public/envelope/<slug>/frames/` plus one entry. No CSS, no component edit.

- **The wax is baked; its placement is not.** The wax is rendered, lit and
  broken in Blender, so `.envelope-seal` paints no image — it is a transparent
  hit target over the rendered wax. `sealX`/`sealY`/`sealSize` survive because
  they place the couple's INITIALS drawn over it in CSS, which change per
  invitation and cannot be baked into frames every couple shares.
- **All frames decode before the seal arms** (`FrameSequence`, hint reads "One
  moment"). A sequence that fetches as it plays stutters in the one moment of
  the product a guest remembers.
- **Reduced motion holds frame 1** and cuts to the invitation. A render is
  indivisible: unlike CSS transforms there is no way to still part of it.
- **`frames.width/height` size the demo screen.** Frames fill their box with
  `object-fit: cover`, so a box of a different shape crops the envelope's flap
  point and foot off.

Current honest state: `lin.frames.count === 1`. Only the sealed frame is
rendered, so the envelope is correct at rest and does not animate.
`openingDurationMs` floors at `HOLD_MS` (1200ms) so one 33ms frame still reads
as a ceremony. Raise `count` as frames land; nothing else changes.

### The collection card — `scripts/compose-mockup.mjs`

A design's stills cut into the two blank canvases of `public/ads.jpg`: the
phone's screen and the paper beside it. The base is a photograph, so its
plaster, shadows and bezel highlights are real — no arrangement of flat CSS
layers reaches that, and the collection and an ad stay the same picture rather
than drifting apart.

`CANVASES` holds 18 numbers measured off that photograph. **They are constants
of the base, not settings**: any envelope or invitation handed to the script is
cut to them, so a new design needs no change here. Verified by composing two
deliberately wrong stills (a square and a tall strip, in saturated colours
nothing can hide behind) — both came out cut to the frame with every pixel
outside the canvases unchanged.

Three things the measurement must respect, each learned by getting it wrong:

- **Measure by MATERIAL, not brightness.** The screen is pure neutral white
  against a dark bezel; the paper is neutral against warm plaster. Hunting
  bright pixels finds the lit background and overshoots every edge.
- **FIT the corner radii.** The inset profile down a corner is a circular arc;
  least-squares gives 76 and 45 to sub-pixel error. Assumed values of 58 and 38
  squared the stills off over the curves.
- **Bleed only as far as the soft edge goes.** The paper shades up over 1-2px,
  so `bleed: 2` runs the still under that rim. At 5 it painted onto the
  plaster — invisible under a dark invitation, obvious under a light one.

Both cutouts are PUNCHED, not drawn: one SVG path, `fill-rule="evenodd"`,
composited `dest-in`. What shows through is the photograph's own lens and its
own cut paper edge. Drawing them would mean inventing both, flat, over a
photograph.

### What Rêve sells — `lib/offer.ts`

`OFFER_TIERS`, `HOW_IT_WORKS`, `DELIVERY`, `ENTRY_TIER`. One source of truth:
the home page maps `OFFER_TIERS` rather than carrying its own array.

> **Nothing in this file may outrun the product.** Every line is a claim a
> customer can hold Rêve to. Ratings and couple counts are deliberately absent:
> Rêve is pre-launch and has none. `tests/lib/offer.test.ts` fails if catalogue
> copy gains a rating, a customer count, or the word "reviews".

`DELIVERY` carries `excludesTier: CUSTOM` — a design made from scratch cannot
honour a 48-hour turnaround.

### Template registry — `components/invitation/registry.ts`

Carries the component **and** its catalogue copy, so the storefront cannot
list a design the renderer lacks. Adding a template = a directory + one entry;
it then appears on `/collection` with no page edit.

### Sample invitation — `lib/sample-invitation.ts`

One wedding behind every marketing preview (comparison, collection, WhatsApp
thread). Parsed through the **real** `invitationContentSchema`, so a schema
change breaks the sample rather than letting marketing drift from the product.

> **Its date must stay in the future.** `Countdown` correctly renders nothing
> once a date has passed, which silently leaves a gap in every preview.
> `tests/lib/sample-invitation.test.ts` fails while there is still time to fix it.

### Tables and RLS

| table | policy | notes |
|---|---|---|
| `invitations` | `invitations admin all` | public reads go through the sealed view only |
| `templates` | `templates public read published`, `templates admin all` | |
| `guests` | `guests admin all` | |
| `rsvps` | `rsvps admin all` | `name, attending, party_size, dietary_notes, message` |
| `orders`, `custom_leads` | admin all | |
| `admin_users` | `admin_users self read` | |

Public/anon reads use **raw `fetch()` to PostgREST**, never `supabase-js`,
which avoids stalling on a stale session. Entitlements are resolved from the
tier at provisioning time and snapshotted onto the row, so changing a tier's
definition never alters what an existing customer bought.

---

## 04 — Design tokens and invariants

### Two token sets that must not bleed

`app/globals.css` holds **storefront** tokens. Invitation templates carry
their own art direction and deliberately do not inherit them — a template's
palette can be anything its design calls for. The brown literals inside
`components/invitation/**` and `app/i/**` are that layer's own direction, not
drift.

| token | value | note |
|---|---|---|
| `--reve-bone` | `#f6f1ea` | ground, ~90% of every surface |
| `--reve-sand` | `#e4dace` | alternating band |
| `--reve-taupe` | `#b7a691` | hairlines, muted type |
| `--reve-cocoa` | `#6b5844` | body copy |
| `--reve-ink` | `#1c1c1e` | **neutral** near-black, not a brown |
| `--reve-wine` | `#6f2233` | the single saturated accent |
| `--reve-shadow-rgb` | `28 28 30` | raw channels for `rgb(… / <alpha>)` |
| `--color-screen` | `#f0ece5` | the phone's inner screen |

No dark mode. An invitation is a fixed artifact, like printed stationery.

### Invariants

- **An envelope is a rendered sequence, never cut layers.** The reverse of
  what stood here. Four hinged layers could not show paper bending or wax
  tearing, and every piece had to be an exact complement of every other — a
  seam could reassemble perfectly and still be in the wrong place. The opening
  is authored in Blender; the browser only advances frames.
- **The camera is locked and the paper must leave frame.** The sequence paints
  into one `<img>` with `object-fit: cover`, so a drifting camera reads as the
  whole screen sliding. And the gate hands over by unmounting the paper: if the
  last frame still has envelope in it, the envelope vanishes on a cut.
- **No text in a render, ever.** Embossed words come out in wrong letterforms
  and cannot be removed once baked into paper texture. The couple's initials
  are drawn over the wax in CSS — every couple shares one sequence.
- **Every frame decodes before the seal arms.** A sequence that fetches as it
  plays stutters partway through the opening, which is the worst possible
  moment in the product for a hitch. This is what makes frame count a real
  cost rather than a free parameter.
- **A contained ceremony must isolate.** `.envelope-scope` carries
  `isolation: isolate`. The gate's `z-index: 50` exists for the full-screen
  invitation; with no stacking context around it that 50 competed on the page's
  root context and beat the storefront's sticky nav at `z-40`, so the envelope
  scrolled OVER the wordmark. Lowering the inner z-indexes would break the
  full-screen case — the EMBEDDING wrapper is what must isolate.
- **The envelope is the screen.** `EnvelopeGate` is `fixed; inset: 0`, so a
  guest's whole phone is the envelope. Marketing that shows it inset is a
  diagram of the product, not a picture of it.
- **Shadows are cast by the ink**, so they come from `--reve-shadow-rgb`. A
  hardcoded `rgba(43,33,24,…)` is the old brown and will look wrong.
- **If a feature earns a demonstration, it leaves the `INCLUDED` grid** on the
  home page, or the page says everything twice.
- **Marketing must not outrun the schema.** `RsvpPanel` shows only columns
  that exist on `rsvps`.
- Windows: small/monospaced type needs `.reve-crisp`
  (`-webkit-font-smoothing: antialiased` + `text-rendering: optimizeLegibility`).

### Scaling a real invitation into a thumbnail

> **`scale()` needs a unitless number, and `calc()` cannot divide a length by a
> length.** `calc(100cqw / 430)` is invalid, and an invalid transform silently
> does not scale — rendering the invitation at full width and cutting it off.
> Correct form: `calc((100cqw / 1px) / 430)`.

`TemplateFrame` uses `cqw` and ships no JS; `TemplateCard` measures in JS
because it reacts to a responsive grid. `LiveInvitationDemo` uses `zoom` rather
than `transform`, because a transform does not change the layout box: the
unscaled child still reserves its full width and `overflow-x: hidden` merely
clips it, leaving the scroller draggable sideways over empty space.

### Assets

`pnpm optimize:images` (`scripts/optimize-images.mjs`) converts `public/`
rasters to WebP, capped at 1600px, skipping anything already current. Sources
are committed alongside their `.webp` so the pipeline stays reproducible.
`public/envelope/demo/sealed.webp` is the marketing demo's paper: 6.13MB PNG -> 311KB.

Seal geometry (`SEAL_Y`, `SEAL_SIZE` in `InvitationDemo.tsx`) is measured off
that photograph. Re-shooting the envelope means re-measuring them.

---

## 05 — Known gaps

- `/i/[slug]` renders dynamically; SSG via `generateStaticParams` is possible
  once the published set is known at build time.
- Testimonials are marked placeholders. Rêve is pre-launch.
- RSVP submission, the guest-list dashboard, and payment are not built. The
  storefront illustrates them; the tables exist; the routes do not. The write
  path is specced but NOT implemented:
  `docs/superpowers/specs/2026-09-05-guest-rsvp-design.md`.
- **Lin's envelope has ONE frame.** `frames.count === 1`: the sealed render
  exists and the sequence does not. Tapping the seal holds that frame for
  `HOLD_MS` and hands over. The count is what makes this visible rather than
  disguised — raise it as frames land and the opening starts moving, with no
  other change anywhere. Requirements are in `public/envelope/BRIEF.md`.
- **The collection card is a build artefact and nothing detects staleness.**
  `card.webp` is composed from a design's stills, one of which is captured off
  the live template. A design change means recomposing; nothing warns that the
  picture no longer matches.
- **The image cache is at `.next/dev/cache/images`**, not `.next/cache/images`.
  Clearing the wrong path silently succeeds and the browser keeps serving a
  stale derivative — which reads as "the fix did not work" and cost most of a
  session. After `node scripts/compose-mockup.mjs <slug>`, clear that path and
  hard reload. Verify by reading pixels out of the page's OWN `<img>` via
  canvas: fetching the URL separately can hit a different cache entry than the
  one the page is displaying.
- **The card's cutouts are invisible at grid size.** `next/image` serves a
  ~441px derivative for a 240px card, so a 188px camera in a 2000px composite
  lands at ~41px and is then JPEG-compressed. The detail is in the bytes; the
  display size throws it away. Unresolved: render the card larger, or crop the
  composite tighter so the objects are bigger in frame.
- **The right-hand panel reads as a second phone, not paper.** In `ads.jpg` it
  is white textured card. The Lin still is the dark full-bleed hero, so it
  covers the paper entirely. The cutout is correct either way; matching the
  reference means feeding that panel a still from a lighter part of the design.
- `/i/[slug]` full-screen has not been verified in a browser this session; only
  the `contained` storefront demo has. The two branches differ.
