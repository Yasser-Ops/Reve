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
    TemplatePreview.tsx         [CLIENT] measures + frames one template
    TemplateThumbnail.tsx       Renders at RENDER_WIDTH, scaled to fit
    WhatsappThread.tsx          Illustration of the forwarded link
    RsvpPanel.tsx               Illustration of the guest list
    FaqList.tsx                 [CLIENT] disclosure

  invitation/                   The product itself.
    registry.ts                 slug -> {component, catalogue copy}
    TemplateRenderer.tsx
    EnvelopeGate.tsx            [CLIENT] fixed inset:0 — IS the guest's screen
    envelope.css                One documented timeline; no animation JS
    primitives/                 Section, Hero, Details, Gallery, Countdown
    templates/cap-blanc/        Pale, centred
    templates/nuit/             Dark, gold rule, ruled column

lib/
  events.ts                     Occasion registry (see 03)
  sample-invitation.ts          ONE wedding, shared by every marketing preview
  constants.ts, entitlements.ts, contact.ts, countdown.ts
  schemas/invitation.ts         zod: content, theme, entitlements
  invitations/get-published.ts  Anon PostgREST read
  rest.ts, env.ts, envelopes.ts
```

**Client islands are deliberately shallow.** `InvitationDemo`, `RsvpPanel`,
and `WhatsappThread` are server components: they are pure CSS and markup, so
nothing ships to the browser for them. Only genuine interaction
(`TemplateCompare`, `SiteNav`, `FaqList`, `Countdown`) crosses the boundary.

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
    getEnvelope(slug)                lib/envelopes.ts -> five layers + geometry
    tap seal
      0-2900   flap falls on its hinge (two backface-hidden faces)
      0-2600   ground -> solid white
      -2400    envelope gone; state 'settling'
      2400+    children leave the card and BECOME the page, under a veil
      -4600    veil fades out; state 'open', gate unmounts
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

### The sheet — `lib/sheet.ts`

An invitation is one long decorated sheet of paper with the couple's details set
into the spaces the artist left for them. **A design is data, not code**: a
`SheetSpec` is bands plus ink/accent/muted/ground, and `verdure` is pure data
with zero layout JSX.

A sheet is an ordered **stack of bands**, never one canvas with fixed zones.

| kind | height | text | artwork |
|---|---|---|---|
| `content` | `max(minHeight, content)` | yes, in the channel | optional intrusion |
| `divider` | fixed by `aspect` | never | full bleed, IS the band |

- `SHEET_GROUND` `#f4efe6` — the paper, the only thing continuous down the doc.
- `SHEET_CHANNEL_INSET` 12% — text never leaves it; artwork may cross it.
- `SHEET_MAX_WIDTH` 720.
- `ART_ROLES`: `full` (dividers), `corner`, `columns`. There is no `frame` role:
  a closed frame would have to grow with content and would distort.

**Why sections are not fixed percentages.** Real sections differ in height — a
countdown is short, a schedule is long, and a schedule with nine events is
longer than one with three. A fixed map forces identical heights and breaks on
variable content. A stack makes it free: a band grows, the bands below start
lower.

**`minHeight` is `cqw`, never `vh`.** Bands measure against the SHEET, not the
window. The sheet sets `container-type: inline-size`. Viewport units ignore the
storefront's thumbnail scaling and overflow the frame.

### The seam rule (`BAND_BRIEF`)

1. **Draw scenes, never objects.** Elements must be embedded in surroundings.
   Evidence: a standalone chandelier failed — with no drawn chain or ceiling it
   hangs from nothing and reads as a sticker.
2. **Fade to ground at every horizontal edge.** Artwork dissolves into
   `SHEET_GROUND` before its own top and bottom, so every boundary is
   ground-to-ground and adjacent tiles never have to align. This removes the
   seam problem rather than solving it, and is what makes independently drawn
   band art viable.
3. **Content bands keep the channel clear.** Ornament to edges and corners.

### `components/invitation/Sheet.tsx`

Walks `spec.bands` and renders slots.

- A band `section` is `overflow-hidden`: an intrusion must not spill onto a
  neighbour and land on text no artist positioned it against.
- The text wrapper is `z-10`. Words always sit above ornament.
- A content band whose every slot resolves to nothing **returns null**, or it
  holds open a `minHeight` gap the artwork was never drawn around.
- Dates are set as stationery (`Monday, 12 July 2027`), never a numeric receipt.

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

- **An envelope is five layers, never a frame.** `body`, `interior`, `pocket`,
  `flap`, `flapInner`, `seal` — plus `seal`. A frame is a photograph of a whole
  envelope in one state and cannot hinge, so the parts must ship separately.
  Layers are cut from ONE photograph on fitted lines (`public/envelope/BRIEF.md`),
  which is what makes them register: flap and pocket are exact complements and
  reassemble the original at a mean per-pixel difference of 1.75.
- **`sealY`/`sealX` are measured, never assumed**, from the flap's own alpha —
  the lowest opaque row and its centre. They position the seal, set the pocket's
  mouth and shape the cavity, so a stale value misplaces all three. Re-measure
  after any change to the flap artwork.
- **The reveal must not depend on the gate existing.** The white belongs to a
  veil that outlives the gate. When the white was the gate's own background it
  died with it, dropping the ground from `#fff` to the page colour in one frame
  under a fully-faded invitation — which is what read as the invitation popping.
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
`public/envelope/bone-sealed.webp` is the demo's paper: 6.13MB PNG -> 311KB.

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
- `bone-vine`'s `interior` layer is a flat white fill, not artwork. The registry
  slot takes a real one with no code change.
- `app/lab/envelope` is development scaffolding (noindex): each layer alone and
  in cumulative stacks. It exists because the live gate animates four layers at
  once over a photograph and can only tell you that something is wrong, not
  which layer is wrong. Delete it or keep it deliberately.
- `/i/[slug]` full-screen has not been verified in a browser this session; only
  the `contained` storefront demo has. The two branches differ.
