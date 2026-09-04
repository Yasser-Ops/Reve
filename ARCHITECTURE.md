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
    envelope.css
    primitives/                 Section, Hero, Details, Gallery, Countdown
    templates/cap-blanc/        Pale, centred
    templates/nuit/             Dark, gold rule, ruled column

lib/
  events.ts                     Occasion registry (see 03)
  sample-invitation.ts          ONE wedding, shared by every marketing preview
  constants.ts, entitlements.ts, contact.ts, countdown.ts
  schemas/invitation.ts         zod: content, theme, entitlements
  invitations/get-published.ts  Anon PostgREST read
  rest.ts, env.ts, envelope-storage.ts
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
    tap seal -> flap opens -> gate fades -> invitation beneath
    open state persisted (lib/envelope-storage.ts) so a return visit
    does not replay the reveal
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
  storefront illustrates them; the tables exist; the routes do not.
