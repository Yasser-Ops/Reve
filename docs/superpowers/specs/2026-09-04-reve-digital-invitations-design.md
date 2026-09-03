# Rêve — Digital Invitation Store

Design spec. Written 2026-09-04.

## 1. Product

Rêve sells digital wedding invitations. A customer buys a template, Rêve builds
their invitation, and the customer receives a link they share over WhatsApp.
Guests open the link, an envelope animation plays, and the invitation reveals.
On the middle and top tiers, guests can RSVP and the couple tracks responses in
a private portal.

The product is a design studio with a catalog, not a self-serve editor. Rêve
staff fill in every invitation. This protects output quality, justifies the
price, and removes the largest piece of customer-facing UI from the build.

### Tiers

| Tier | Price | Includes |
|---|---|---|
| Basic | $50 | Live invitation page, custom URL, envelope, countdown, photo gallery, WhatsApp sharing |
| Managed | $100 | Basic, plus RSVP collection, guest list, and the private couple's portal |
| Custom | $200 | Bespoke design. Lead capture only in v1 — no self-serve flow |

Tier capabilities are expressed as an entitlements record attached to each
invitation, never as hardcoded logic in the renderer.

### Payment

Payment runs through Whish, manually and out of band. There is no online
checkout, no payment provider integration, and no webhook. The order is the
source of truth, not the payment. Orders move through a status pipeline that a
Rêve operator advances by hand.

### Out of scope for v1

Deferred deliberately, with the data model shaped so each is additive:

- Customer-facing theming controls (palette and font swaps)
- Excel guest-list import
- AI-assisted intake bot
- Interactive seating plan
- Per-guest personalized links
- Additional languages and RTL layout
- A self-serve custom-tier pipeline

## 2. Decisions

| Decision | Choice | Reason |
|---|---|---|
| Customization | Fixed templates, fill-in-the-blanks | Quality control; theming is a later config change |
| Payment | Whish, manual confirmation | No provider supports automated confirmation here |
| Order flow | Form creates order, then WhatsApp handoff | A queue to work beats a chat inbox to remember |
| Content authoring | Rêve staff, in admin | Protects quality; removes the biggest UI from v1 |
| Customer access | Secret token link, no accounts | One purchase, one event; an account is friction with no payoff |
| Admin access | Supabase Auth | The only surface that sees every order |
| Language | English, LTR | Logical CSS properties throughout so RTL is additive |
| Template architecture | React components over shared primitives | Distinctive art direction, mechanics written once |
| Envelope | CSS/SVG, plays once, one shared link | Performance on mid-range phones over slow networks |

## 3. Architecture

One Next.js App Router codebase, one Supabase project, four surfaces.

```
/                          storefront — SSG
/templates                 catalog with filters and view toggles — SSG
/templates/[slug]          template detail + demo link — SSG
/pricing                   tier comparison — SSG
/order/[slug]              order form — SSR, Server Action
/order/confirmation/[ref]  reference + Whish details + WhatsApp handoff
/custom                    $200 lead capture form

/i/[slug]                  live invitation — SSR, public, no auth

/manage/[token]            couple's portal — SSR, token-gated, noindex
                           Managed tier only

/admin                     order queue — Supabase Auth, noindex
/admin/orders/[id]         order detail, mark paid, provision
/admin/invitations/[id]    content editor with live preview
/admin/templates           catalog management
```

### Layering

```
app/                    routes, data fetching, Server Actions
  (store)/              storefront segment
  i/[slug]/             invitation segment
  manage/[token]/       portal segment
  admin/                admin segment

lib/
  supabase/             client.ts · server.ts · admin.ts
  env.ts                zod-validated environment map
  entitlements.ts       tier → entitlements resolution
  tokens.ts             manage-token generation, hashing, comparison
  reference.ts          order reference generation
  schemas/              zod schemas: content, order, rsvp, guest, lead

components/
  ui/                   shadcn primitives
  store/                storefront components
  invitation/
    primitives/         Hero · Countdown · Gallery · Details · RsvpForm · Map
    EnvelopeGate.tsx    the reveal layer
    registry.ts         template_slug → component
    templates/          one directory per template
```

### Invariants

**Entitlements resolve once, server-side, at the top of the invitation page,
and pass down as a prop.** No component queries the tier. Changing what a tier
includes touches one file.

**The invitation renderer never touches the database.** It is a pure function of
`(content, theme, entitlements)`. This makes templates unit-testable,
previewable from draft content in admin, and impossible to break with a data
change.

**The storefront's design tokens do not reach the invitation templates.** They
are two design languages under one brand. A template's art direction must never
inherit store chrome.

**Public reads of published invitations use raw `fetch()` to PostgREST with the
anon key**, never `supabase-js`. A stale session must not be able to stall a
wedding invitation.

**Logical CSS properties everywhere.** `padding-inline`, `margin-inline-start`,
never `left`/`right`. Costs nothing now; makes RTL additive rather than a
rewrite.

## 4. Data model

Seven tables. RLS enabled on every one. Schema changes ship as append-only
migrations.

### `templates`
`id · slug · name · description · tier_floor · preview_images[] · is_new ·
is_bestseller · sort_order · status · created_at`

Public read where `status = 'published'`. Admin write. Gallery filters and
badges are data, not code.

### `orders`
`id · reference · customer_name · customer_phone · customer_email · event_date ·
template_slug · tier · status · amount · payment_proof_url · notes ·
created_at · updated_at`

Status: `pending_payment → paid → in_design → review → delivered`, plus
`cancelled`.

Admin read and write only. No public insert policy — orders are created through
a Server Action that validates, rate-limits, and verifies Turnstile before a row
exists.

### `invitations`
`id · order_id · slug · template_slug · content (jsonb) · theme (jsonb) ·
entitlements (jsonb) · manage_token_hash · status · published_at · expires_at ·
created_at`

Status: `draft | published | archived`.

Public read is served through a view that omits `manage_token_hash` and exposes
only `status = 'published'` rows. The base table is never publicly readable.
This is the single most security-sensitive policy in the system.

`content` is JSONB because templates carry different fields — a gallery here, two
ceremonies there, a dress code elsewhere. A zod schema validates shape in the
application; Postgres stores a document. Column-per-field would mean a migration
per template variation.

`entitlements` is snapshotted at provisioning time, not derived from the tier at
read time. Customers keep what they bought when tier definitions change, and a
capability can be granted individually without inventing a tier.

### `guests`
`id · invitation_id · name · phone · party_size · notes · created_at`

Managed tier. Shape is already correct for the deferred Excel import.

### `rsvps`
`id · invitation_id · guest_id (nullable) · name · attending · party_size ·
dietary_notes · message · created_at`

`guest_id` is nullable because v1 uses one shared link, so most responses arrive
unlinked. Public insert through a Turnstile-verified Server Action. No public
read — responses surface only through the portal token and admin.

### `custom_leads`
`id · name · phone · event_date · brief · budget_note · status · created_at`

### `admin_users`
`user_id · role · created_at`

Every admin policy checks membership here rather than trusting a JWT claim.

### Token handling

`manage_token` is high-entropy, generated at provisioning, stored only as a
hash, and compared server-side. It never appears in a public payload or a client
component, and is rotatable from admin if a link leaks.

## 5. Flows

**Order.** Browse catalog → template detail → Order → form (name, phone, email,
event date, tier) → Turnstile → Server Action inserts order and generates
reference → confirmation screen shows reference, Whish payment details, and a
WhatsApp button with the reference prefilled → order appears in admin queue.

**Provision.** Operator confirms the Whish transfer landed → marks order paid →
creates the invitation row with a chosen slug, entitlements snapshotted from the
tier, and a generated manage token → fills content in the admin editor with live
preview → publishes → sends the public link, plus the manage link on Managed
tier.

**Open.** Guest taps the WhatsApp link → server renders the invitation →
`EnvelopeGate` checks localStorage → first visit shows the envelope; tapping the
seal opens it and reveals the invitation → return visits skip straight through,
with a small replay control.

**RSVP.** Guest submits the form inside the invitation → Turnstile → Server
Action inserts the response → optimistic confirmation → couple sees it in the
portal. When RSVP is not in the entitlements, the primitive renders nothing.

**Portal.** Couple opens `/manage/[token]` → token hashed and matched
server-side → RSVP summary, guest list, export. A bad token returns
`notFound()`. `noindex`.

**Custom lead.** Custom tier button → brief form → insert → WhatsApp handoff.

## 6. The envelope

The signature moment, and a layer above every template rather than a section
inside one. `EnvelopeGate` wraps the invitation and owns the reveal.

- **CSS and SVG only.** A 3D flap rotation, the seal breaking, the card rising.
  Roughly 30KB, GPU-composited, sharp at any resolution. Per-template artwork is
  a different SVG. Lottie and video are rejected: this page is opened on
  mid-range phones over slow networks, and a multi-megabyte animation ahead of
  content is the surest way to make a premium product feel cheap.
- **Plays once.** Recorded in localStorage, skipped on return, with a subtle
  replay affordance. Forced repetition converts delight into friction.
- **The seal carries the couple's initials**, taken from invitation content.
- **Degrades to an instant reveal** if animation fails or is unsupported, and
  respects `prefers-reduced-motion`.

Guest-name personalization on the envelope depends on per-guest links and is
deferred; content shape anticipates it.

## 7. Design language

### Palette

A light warm ground carries roughly ninety percent of the surface. Warm neutrals
— bone, sand, taupe, mocha, near-black brown — handle structure and text. A
single deep wine accent is reserved for primary actions and selected states.

The chrome stays quiet because the template artwork supplies the colour. A
colourful brand system would fight the products it is selling.

### Typography

A high-contrast display serif paired with a quiet interface sans. The serif
carries template names, headlines, and price numerals — it is what reads as
wedding stationery rather than software. The sans carries UI and body text and is
what keeps it sharp rather than fussy.

Specific families are an open decision, to be presented as concepts during
implementation. The spec fixes the structure: two roles, a defined type scale,
and explicit weights, so swapping families is a token change.

Small and monospaced type receives `WebkitFontSmoothing: 'antialiased'` and
`textRendering: 'optimizeLegibility'`, with pixel-based font floors.

### Structure

Full-bleed alternating light and dark bands. Generous vertical rhythm. A strict
container width. Soft rounded rectangles with barely-there shadows and ample
internal padding. Recurring vocabulary: a pill-shaped floating nav, segmented
filter and view toggles, small rounded badges.

Template cards pair a phone mockup with a flat card so the buyer sees both the
medium and the artwork.

Motion is soft — fades and short upward drifts on scroll. No bounce, no parallax.

### Merchandising

Carried over from the reference and proven in this market: Grid, Compact, and
Carousel view toggles; All, New, and Bestseller filters; a "most chosen" badge
anchoring the middle tier; add-ons presented as small pills; limited-edition
scarcity; a star rating with review count in the hero.

## 8. Errors, security, performance

**Loud crashes.** `error.tsx` and `not-found.tsx` per segment. A missing or
unpublished invitation is a 404, never a blank page. Server Actions return typed
results rather than throwing across the boundary. No magic strings.

**Validation.** Every input crossing a network or process boundary is validated
with zod, server-side, including the admin editor. Environment variables are
validated at startup through `lib/env.ts`.

**Turnstile.** Order, RSVP, and custom-lead submissions verify the token
server-side before any processing. Client-side success is never sufficient.

**Caching.** Server-side fetches to external APIs pass `cache: 'no-store'`.

**The failure that matters is a wedding invitation that does not load.** The
invitation route therefore carries the strictest budget in the system: no
client-side fetching for core content, no blocking third-party scripts, full
render without JavaScript except the envelope and the RSVP form, and images
served as WebP capped at 1600px.

**Private surfaces** — portal and admin — carry `noindex` headers.

## 9. Testing

Vitest, unit:

- Content zod schemas, including rejection of malformed content
- Entitlement resolution across all three tiers
- Manage-token generation, hashing, and comparison
- Order reference generation and uniqueness

Playwright, end to end — the three paths that cost money when broken:

- Order submission, from template detail through to a persisted order
- Envelope open through to a rendered invitation
- RSVP submission landing in the portal

Verification before any task is considered complete:
`pnpm lint && pnpm typecheck && pnpm test`.

## 10. Build sequence

The live invitation comes first. It is the actual product, the thing shared on
WhatsApp, and the surface that must feel sharp.

1. **Foundation** — project scaffold, Supabase schema and RLS, design tokens,
   environment validation
2. **Invitation renderer** — section primitives, template registry, the first
   template, `EnvelopeGate`
3. **Admin** — auth, order queue, provisioning, content editor with live preview
4. **Storefront** — catalog, template detail, pricing, order form, WhatsApp
   handoff
5. **RSVP and portal** — RSVP primitive, guest list, portal, export
6. **Templates** — the remaining catalog, built on the now-proven primitives

Each stage runs on its own branch.
