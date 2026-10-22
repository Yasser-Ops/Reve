# Rêve — Architecture

Digital invitations for weddings, engagements, and other occasions. Public
storefront, a per-invitation guest-facing page at its own link, and a private
admin where the operator runs clients, orders, content, approval and publishing,
and a private client portal where an invited couple follows their order and
approves their draft. RSVP (Phase 4) and Custom extras (5) are specced in
`docs/superpowers/specs/2026-09-29-client-portal-design.md` and not built.

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
  i/[slug]/not-found.tsx        couple's page. error.tsx calls retry().

  admin/                        PRIVATE. proxy.ts refreshes the session here;
    layout.tsx                  metadata only (noindex). NO surface here.
    login/page.tsx, LoginForm   [CLIENT] outside (gated): no redirect loop
    error.tsx, not-found.tsx    wrap AppSurface; error calls retry()
    (gated)/layout.tsx          requireAdmin + branded top bar, wraps AppSurface
    (gated)/page.tsx            SummaryTiles (?view=) + AutoSubmitForm
                                [CLIENT] (q/status/tier GET) + ClientRows
                                (table md+, cards below); ?notice= whitelist
    (gated)/clients/new         client + first order
    (gated)/clients/[id]        header (wa.me), <details> edit, OrderCard per
                                order, <details> add order, DeleteClientDialog
    (gated)/invitations/[id]    link, ContentEditor (form | JSON + preview),
                                MediaSection, ReviewPanel
    (gated)/settings            Password card -> changePassword
                                Inner pages open with Breadcrumbs.
    preview/[id]/page.tsx       BARE draft render (iframe target), no surface

proxy.ts                        Next 16 name for middleware. Matcher = private
                                routes only; updateSession, redirects no one.
                                next.config.ts sends X-Robots-Tag noindex on
                                the same PRIVATE_ROUTE_PATTERNS (tested).

components/
  store/                        Marketing surface.
    SiteNav.tsx                 [CLIENT] scroll state + mobile menu; light type over
                                DARK_HERO_PATHS ('/') until scrolled. Height = --reve-nav-h
    SiteFooter.tsx
    Reveal.tsx                  [CLIENT] IntersectionObserver scroll reveal
    PhoneFrame.tsx              Decorative device chrome; children swap freely
    HomeHero.tsx                Full-bleed Jardin dusk painting, pulled up under the
                                nav by --reve-nav-h; wine-dark shade only behind type.
                                'phone' slot = LiveInvitationDemo(jardin) + <Jardin>
    TemplateCompare.tsx         [CLIENT] draggable seam between two templates
    TemplateCard.tsx            Collection grid card; shows the composed mockup
    TemplateFrame.tsx           Known-aspect crop of a scrolling invitation
    TemplateThumbnail.tsx       Renders at RENDER_WIDTH, scaled to fit
    LiveInvitationDemo.tsx      [CLIENT] the real gate + invitation, in a phone
    StickyCta.tsx               [CLIENT] shows once the hero sentinel is ABOVE the
                                viewport (a tall hero starts with it below the fold)
    WhatsappThread.tsx          Illustration of the forwarded link
    RsvpPanel.tsx               Illustration of the guest list
    FaqList.tsx                 [CLIENT] disclosure

  invitation/                   The product itself.
    registry.tsx                slug -> defineTemplate({schema, load, copy})
    ReveCredit.tsx              Footer credit on /i/[slug] only; link tagged
                                utm_source=invitation, utm_medium=credit, utm_campaign=<slug>
    TemplateRenderer.tsx
    EnvelopeGate.tsx            [CLIENT] fixed inset:0 — IS the guest's screen;
                                loading ring; EnvelopeReleasedContext provider
    EnvelopeVideo.tsx           [CLIENT] plays opening.mp4 (stacked alpha, WebGL)
    FrameSequence.tsx           [CLIENT] fallback: plays the rendered frames
    HeroVideo.tsx               [CLIENT] hero video; src only once released
    envelope-context.ts         released = seal tapped (true without a gate)
    envelope.css                Stage, card and seal; the paper is a render
    motifs/                     SHARED VISUALS ONLY. Petals.
    templates/<slug>/           index.tsx + schema.ts (its own content schema)

  admin/                        Private surface. AppSurface (data-surface),
                                ActionForm [CLIENT, the shared form island;
                                onSuccess, disabled], Breadcrumbs, Eyebrow,
                                StatusBadge (tone per stage), SummaryTiles,
                                ClientRows, AutoSubmitForm [CLIENT],
                                OrderCard (server shell) > OrderLive [CLIENT,
                                useOptimistic stage: badge, stepper, primary
                                move] > OrderMenu [CLIENT, back/upgrade/cancel
                                dialogs], StageStepper,
                                DeleteClientDialog [CLIENT], ContentEditor
                                [CLIENT], content-form/FieldControl [CLIENT,
                                recursive], CopyChecklist [CLIENT],
                                MediaUploader [CLIENT, drop zone],
                                MediaSection, ReviewPanel,
                                fields.tsx (ids from useId)
  ui/                           shadcn base-nova, via `shadcn add` ONLY

lib/
  events.ts                     Occasion registry (see 03)
  sample-invitation.ts          ONE wedding, shared by every marketing preview
  constants.ts, entitlements.ts, contact.ts, countdown.ts
  schemas/invitation.ts         zod: theme, entitlements
  schemas/content/              core, BLOCKS, checklist (see 03)
  invitations/                  get-published (anon read), slug, content
                                (checkContent, toJson), publish-guard
  orders/status.ts, upgrade.ts  stages per tier, moves (nextMove,
                                previousMove), labels, upgrades
  admin/                        reads (clients + getOrderSummary,
                                invitations, media + removeInvitationMedia),
                                summary (views, due/overdue), content-form
                                (formModel, pruneContent, date helpers),
                                names (namesMatch), 'use server' actions
                                (client-, order-, invitation-, media-
                                actions); ActionResult
  auth/                         guards (requireAdmin), actions, messages,
                                admin-membership
  supabase/                     server.ts, client.ts (uploads only),
                                proxy.ts, database.types.ts (generated)
  routes.ts                     ROUTES, adminRoutes, PRIVATE_ROUTE_PATTERNS,
                                NOTICE_PARAM, LOGIN_NOTICE, ADMIN_NOTICE
  hooks/useCountdown.ts         Ticking clock; every dial is drawn per design
  mockup.ts                     ads.jpg geometry (shared with the composer)
  rest.ts, env.ts, envelopes.ts

scripts/
  compose-mockup.mjs            Cuts stills into ads.jpg -> collection card
  optimize-images.mjs           public/, or `<folder>` for client photos

supabase/migrations/            append-only; 0005 admin pipeline, 0006 view
                                seal, 0007 admin_delete_client, 0008 client
                                RLS, 0009 admin-only notes, 0010 review
                                server time, 0011 realtime reviews, 0012
                                RSVP, 0013 auth_email_sends (service only)
scripts/envelope-video.mjs      frames -> stacked-alpha opening.mp4
```

**Client portal and auth links**

```
app/auth/confirm/route.ts       GET token_hash + type (invite|recovery, zod)
                                -> verifyOtp -> safeNext; anything else (a
                                code, an old Supabase-template link) or a
                                failure -> login link-expired
lib/auth/auth-email.ts          mintAuthLink (admin generateLink -> our
                                confirmLink); mayEmail / recordEmail throttle
lib/email/resend.ts             sendEmail: fetch Resend, no-store, from
                                studio@reveinvitations.com; EmailSendError
lib/email/templates.ts          inviteEmail, resetEmail: table HTML + text
app/(store)/terms/page.tsx      static; wording in lib/terms.ts (TERMS_UPDATED_ON)
app/auth/signout/route.ts       GET ?notice= (zod) -> signOut local -> login
app/portal/
  layout.tsx                    metadata only (noindex)
  login | forgot | reset | welcome/   public, one form island each (PortalCard)
  (gated)/layout.tsx            requireClient + AppSurface + header
  (gated)/page.tsx              dashboard: OrderPanel per order [LiveLink
                                CLIENT], LockedCard upsell for Basic
  (gated)/settings/             read-only details + ChangePasswordForm
  preview/[id]/page.tsx         BARE (outside AppSurface): DraftRender, and in
                                `review` the ReviewForm [CLIENT] fixed bar
components/invitation/DraftRender.tsx   shared by admin and portal preview
components/auth/ChangePasswordForm.tsx  shared by admin and portal settings
components/admin/AccountStatus.tsx      not invited / invited / active + button
lib/auth/   guards (requireAdmin, requireClientAccount, requireClient),
            portal-actions, recovery, password, password-change, links
lib/portal/ orders (dashboard read), review-actions, messages
lib/supabase/admin.ts           service role, server-only
```

**Client islands are deliberately shallow.** `HomeHero`, `RsvpPanel`,
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
      -> published_invitations view   SELECT-only; serves published_content
      design = getTemplateEntry(template_slug)   null -> 404
      design.schema.parse(content)     the DESIGN's schema, loud on mismatch
    notFound() when unpublished or design unknown
    TemplateRenderer -> loadTemplate  lazy import, memoised, parses again
  EnvelopeGate [CLIENT] fixed inset:0
    getEnvelope(slug)                lib/envelopes.ts -> frames + video + seal geometry
    EnvelopeVideo (spec.video) fetches opening.mp4 WHOLE as a blob, progress
      -> ring; no WebGL or fetch error -> onFailed -> FrameSequence (frames)
    seal disabled, ring filling, hint "One moment" until onReady
    HeroVideo inside the card waits for the tap (EnvelopeReleasedContext)
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

**Operator signs in**

```
/admin -> proxy.ts updateSession (getClaims refreshes the cookie)
  (gated)/layout requireAdmin()       getClaims + admin_users membership
    no claims | error      -> 307 /admin/login
    not on admin_users     -> /admin/login?notice=not-admin (whitelisted)
LoginForm [CLIENT] useActionState -> signInAdmin (zod)
  signInWithPassword -> isAdmin (RLS: admin_users self read)
    admin -> redirect /admin | else signOut({scope:'local'}) + NOT_ADMIN
```

Every admin PAGE and ACTION calls `requireAdmin()` itself: a layout does not
re-run on client navigation. Every admin read and write runs as the admin's
own session, so RLS (`private.is_admin()`) is the second wall. No service key.

**Operator builds and delivers an invitation**

```
client page -> OrderCard -> OrderLive [CLIENT]: primary = nextMove(tier,
  status); OrderMenu holds previousMove / upgrade / cancel behind dialogs.
  A move: startTransition -> useOptimistic(to) (on screen ~70ms) ->
  moveOrder -> revalidatePath re-render becomes the truth; a refusal ends
  the transition, the stage falls back, the reason shows.
  moveOrder(paid)              canMove(tier); due_at = now + DELIVERY.hours
                               unless already set, or Custom
  provisionInvitation(design)  paid or later; no invitation yet; design in
                               registry; slug = proposeSlug(client name) +
                               withSuffix(taken); entitlements snapshotted
-> /admin/invitations/[id]
  formModel(design.schema)     server: FormField[] (labels from .meta), plain
                               data handed to ContentEditor [CLIENT]
  form state -> pruneContent   emptied optional fields dropped, never ""
  (or Advanced JSON text)      parseContentText before returning to the form
  saveContent(JSON string)     checkContent: JSON.parse + design.schema
                               -> issues by path (shown on the field), or
                               content stored PARSED
  iframe /admin/preview/[id]   reloads after each save (bare, no surface)
  MediaUploader -> createUploadUrl (signed, per file) -> browser
                   uploadToSignedUrl -> invitation-media/<id>/<kind>/<name>
  moveOrder(review)            refused unless content satisfies its design
  approveOnBehalf(note)        invitation_reviews: snapshot = current content
  ReviewPanel                  publishReadiness (the action's own check)
                               disables Publish and prints the reason
  publishInvitation            publishReadiness: order REVIEW or DELIVERED;
                               latest review
                               approved AND snapshot == content (key-order
                               blind) -> published_content = SNAPSHOT,
                               status published, order delivered
  edit after publish           changes the draft only; guests keep the
                               snapshot until re-approval + Publish again
```

**Operator changes the admin password**

```
/admin/settings -> ActionForm -> changePassword
  requireAdmin; zod (8..72 chars, copies match, differs from current)
  verifyPassword(admin.email, current)       throwaway client, session revoked
                                             at once; wrong -> "not right"
  auth.updateUser({ password })              weak_password | same_password worded
  auth.signOut({ scope: 'others' })          this device stays signed in
```

**Operator deletes a client**

```
client page -> DeleteClientDialog [CLIENT]
  blocked (an invitation is published)  -> no form, "unpublish first"
  typed name: namesMatch (trim, case-blind) enables "Delete for good"
deleteClient (zod) -> rpc admin_delete_client(id, name)   ONE transaction
  RV001 name mismatch | RV002 published  -> worded refusal, nothing deleted
  ok -> deleted invitation ids
removeInvitationMedia(ids)   list <id>/<kind> per MEDIA_KINDS, remove
  files go AFTER rows: a storage failure leaves orphans, never half a client
redirect /admin?notice=client-deleted | client-deleted-files-left
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

**Operator invites a client**

```
/admin/clients/[id]  AccountStatus -> inviteClient (lib/admin/invite.ts)
  requireAdmin; hasPaidOrder gate; email read from the ROW, never the form
  not invited -> mintAuthLink(invite) (creates the auth user)
              -> clients.user_id via the admin's cookie client
                 .is('user_id', null); 0 rows (lost race) -> delete new user
                 (nothing emailed yet)
              -> sendEmail(inviteEmail) -> recordEmail; a failed send keeps
                 the account: client reads invited, operator sends again
  invited     -> mintAuthLink(recovery, next /portal/welcome) -> same email
  Resend 429 -> "Too many emails just now."
```

**Client accepts, signs in, resets**

```
email link -> /auth/confirm -> /portal/welcome
  requireClientAccount (claims + client row, else /auth/signout?notice=not-client)
  acceptInvite: passwordSchema(email) + terms === 'on'
    updatePasswordOrRefuse (same_password counts as set: the retry path)
    admin client stamps terms_accepted_at, keyed on claims sub,
      .is('terms_accepted_at', null)  -> /portal
/portal/forgot -> requestReset (always ok) -> client row with user_id?
  -> mayEmail (auth_email_sends: 1/min, 5/hour) -> mintAuthLink(recovery)
  -> sendEmail(resetEmail) -> recordEmail -> email -> /auth/confirm
  -> /portal/reset: getRecoveryClient = amr `recovery` entry <= 15 min old
     AND a client row -> setNewPassword -> signOut others
     (failure -> /portal?notice=others-kept)
```

**Client approves the draft**

```
/portal  OrderPanel (review): "See your invitation" + latest decision text
/portal/preview/[id]  requireClient; RLS read with orders(status);
  notFound unless review | delivered
  DraftRender + ReviewForm bar, fingerprint = contentFingerprint(content
  this page rendered)
submitReview: fingerprint mismatch -> DRAFT_CHANGED (no insert)
  else insert {invitation_id, decision, note, content_snapshot} AS THE USER
  RLS: owns, order in review, snapshot = content; 0010 trigger stamps
  created_at = now(), id; refusal 42501 -> DRAFT_CHANGED
```

**Operator deletes a client**

```
deleteClient: read user_id -> admin_delete_client rpc -> media ->
  isAdmin(service role)? skip : admin.auth.admin.deleteUser
  skipped or failed -> ?notice=client-deleted-account-left
```

**Guest replies**

```
/i/[slug] -> template RsvpForm [CLIENT] -> useRsvpSubmit(rsvpSlug)
  null slug (any preview) -> "This is a preview", no call
  submitRsvp (lib/rsvp/submit.ts, zod; honeypot `company` -> fake ok)
    service role: invitations by SLUG -> published AND entitlements.rsvp
    insert rsvps (trimmed; a decline is party 1; DB checks agree)
  -> "Thank you, we have your reply." | "Thank you for letting us know."
portal / admin editor: getGuestList (cookie client, RLS, pages past 1000)
  -> summariseReplies (latest per normalised name) -> GuestList
  /portal/guests/[id]/export | /admin/invitations/[id]/export
    -> toGuestCsv (BOM, CRLF, formula guard) via csvResponse
LiveRefresh on rsvps refreshes both lists as replies arrive
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
- `lib/schemas/content/` — the core and the ready-made blocks every design
  composes its own schema from (below).

### Content — one core, each design its own schema

`coreContentSchema` (names, initials, eventDate, venue) is what exists for
every design and is read outside any one of them: the envelope's initials,
link previews, the portal, RSVP. `BLOCKS` (headline, message, schedule,
gallery, heroMedia, registryMessage) are ready-made fields a design LISTS;
none inherits one it did not ask for. A design's `templates/<slug>/schema.ts`
is `coreContentSchema.extend({ ...blocks, ...its own })`, and
`defineTemplate` binds it to the component: a component reading a field its
schema lacks, or a schema missing the core, fails typecheck.

- **Every field carries `.meta({ ask })`**, the line sent to a client.
  `checklistFor` throws on a field without one; `checklistMessage` is the
  WhatsApp list the editor copies.
- **Every field, nested ones included, carries `.meta({ label })`** for the
  admin form; `multiline: true` makes a text box, `media: <kind>` makes the
  field offer that kind's uploads. `formModel` throws on a missing label or a
  zod type it cannot draw, so a new design cannot silently lose a field.
- **Block keys are permanent.** Stored rows are keyed by them. Add optional
  fields; never rename.
- **Content is parsed with the design's own schema** wherever it is read:
  saving, the public read, the rendered wrapper. Still one jsonb column, so a
  new design needs no migration. The operator fills a form generated from the
  design's schema (JSON behind "Advanced"), validated on save.
- A redesign that would change already-approved invitations ships as a NEW
  entry (`lin-2`), the old one kept rendering.

**Ornament: drawn or painted?** Jardin's countdown ornament went through four
drawn versions before becoming a plate, and the rule that came out of it is
worth stating once. An object that reads through its INTERIOR — a basin, a
vessel, a rose with depth — cannot be depicted with outline strokes at small
size: there is nothing for the eye to resolve them into, and no position fixes
it. Two concentric hairline ellipses read as a strike-through when they
overlapped the numerals and as a stray oval when they did not.

What DOES work drawn is ornament that is a MARK rather than a depicted thing:
`GardenPath`'s vine and its five-petal blooms, filled shapes with a stroke. A
painted plate is right when the thing has to have depth; a drawn mark is right
when it only has to be a gesture. A plate laid BELOW live text is also safe
where one behind it is not — nothing is set over it, so no contrast surface
has to be pinned down.

**Section padding is proportional, not flat.** `Section` takes a `density`
(`FULL` | `CLOSE`); a section holding one sentence paid the same `py-20
md:py-28` as one holding a five-item timeline, which left the closing thanks
50% air — the emptiest moment on the page, immediately before the dusk plate.
Measure slack as the share of a section's height occupied by nothing before
reaching for decoration to fill it.

### The envelope — `lib/envelopes.ts`

**The opening is a PRE-RENDERED FRAME SEQUENCE.** It was four cut layers
(pocket/flap/flap-inner/seal) hinged by CSS `rotateX`; it is not any more.
Flap, paper, wax and the envelope leaving frame are authored in Blender, and
the browser advances through numbered stills compositing nothing.

The trade, stated plainly. Layers kept the timing adjustable per template and
cost four files. But a hinge built from flat planes cannot show paper BENDING
or wax TEARING — the two moments the ceremony exists for — and every piece had
to be cut as an exact complement of every other, where a seam could reassemble
perfectly and still be misplaced. Frames buy physical behaviour under real
light, and **timing is recovered by rendering DENSELY** rather than given up:
render a motion across twice the frames it needs and playback can choose a
rate or slow one phase against another via `tail`. Frame count is the budget
that buys adjustable timing back, and near-identical frames are dropped before
shipping.

`EnvelopeSpec` = `{ slug, name, frames: {dir, count, pad, fps, width, height,
tail?, holdMs?} }` plus seal geometry. Adding an envelope is a directory under
`public/envelope/<slug>/frames/` plus one entry. No CSS, no component edit.

**The masters live outside this repo**, at `~/Desktop/INVITATION SYSTEM/`:
`00_MASTER/` holds one .blend per envelope SHAPE (geometry, rig, animation),
`02_ASSETS/` a shared library of papers, seals and alpha trims. Its README
documents a ~2 minute retexture workflow — link the master, library-override,
swap `PAPER_*`, drop a seal into `SLOT_Seal`, assign the camera. A new envelope
is a RETEXTURE, not a modelling job, and any shape exposing the same slot
contract inherits the animation unchanged.

- **The wax is baked; its placement is not.** The wax is rendered, lit and
  broken in Blender, so `.envelope-seal` paints no image — it is a transparent
  hit target over the rendered wax. `sealX`/`sealY`/`sealSize` survive because
  they place the couple's INITIALS drawn over it in CSS, which change per
  invitation and cannot be baked into frames every couple shares.
- **The opening ships as one video** (`opening.mp4`, ~630 KB against 2.4-3.6
  MB of frames). `pnpm envelope:video <slug>` encodes it from the shipped
  frames: colour on top (premultiplied over black), alpha as grey below, BT.709,
  CRF 24, timing from the spec (`tail` included) as exact timestamps. Frames
  are decoded with sharp first (ffmpeg's WebP decode runs darker than the
  poster). Re-run it after any re-render. `EnvelopeVideo` recombines the halves
  in a WebGL shader; frame 1 stays as the poster until the canvas paints.
- **Nothing plays until it is all here.** The video is fetched whole (the ring
  shows real progress), the frame fallback decodes every frame. A sequence that
  fetches as it plays stutters in the one moment of the product a guest
  remembers.
- **Reduced motion holds frame 1** and cuts to the invitation. A render is
  indivisible: unlike CSS transforms there is no way to still part of it.
- **`frames.width/height` size the demo screen.** Frames fill their box with
  `object-fit: cover`, so a box of a different shape crops the envelope's flap
  point and foot off.

Current honest state: `lin.frames.count === 1`. Only the sealed frame is
rendered, so the envelope is correct at rest and does not animate.
`openingDurationMs` floors at `HOLD_MS` (1200ms) so one 33ms frame still reads
as a ceremony. Raise `count` as frames land; nothing else changes.

`jardin` and `dentelle` both run the same two-phase timing: the flap at 30fps,
the departure slowed to 24 via `tail`. Jardin was re-rendered to reach it —
its first cut moved 29-49px between frames, too sparse to slow down without
interpolation cross-fading a displacement into a double image.

**Three traps in producing a sequence**, each paid for:

- **A motion's frame budget is what the CAMERA sees, not what the rig does.**
  Jardin's envelope clears frame at render 152; the range was set to 168 by
  copying Dentelle's, so 17 frames rendered nothing. `envelope-frames.mjs`
  drops them and reports `longestStillRun`, which is the check that catches it.
- **Blender 5.x slotted actions evaluate ONE channelbag.** `WaxSeal` carried
  two slots (`WaxSeal`, `WaxSeal.001`); a write to the unbound one reports
  success and changes nothing, which shipped a render with the seal vanishing
  mid-peel. Verify by frame-setting and reading `hide_render` BACK — never
  trust the curve you just wrote.
- **Frame indices quoted from Blender must be mapped through the drop list**
  in `.frames/<slug>.json` before they land in `tail.from`. Jardin's slide
  starts at render 82 and ships as 79.

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

**Capturing `opened.webp`** — the paper half is a screenshot of the template
actually running, and two things about taking it are not obvious:

- **Emulate the viewport at `647x1395x2,mobile`**, matching the paper canvas
  exactly. Resizing the browser WINDOW does not work: the layout centres for
  the window rather than the screenshot, which lands the names off-centre and
  clips the message line.
- **The Next dev badge lives in shadow DOM.** A CSS `display:none` rule does
  not reach it; remove every `body > *` carrying a `shadowRoot`, with a
  MutationObserver to catch re-insertion. It reached a composed card once.

The card is a BUILD ARTEFACT and nothing detects that it has gone stale — an
edit to a hero plate or the type leaves it showing the previous design.
Recompose whenever the design or its envelope's frame 1 changes.

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

Carries the schema, a lazy `load` and the catalogue copy, so the storefront
cannot list a design the renderer lacks. Adding a template = a directory + one
`defineTemplate` entry; it then appears on the shelves with no page edit. It
is the ONLY list of designs: the `templates` table is gone (0005).

- **Lazy:** `load: () => import(...)`, memoised per design, so React sees one
  stable component type; `loadTemplate(slug)`. Schemas stay static:
  validating content never loads a component.
- **`visibility`:** LISTED (shelf, sitemap, product page), DRAFT (product page
  by URL for review, `noindex`, no shelf), PRIVATE (a Custom design: renders
  its client's invitation, nothing else). `listedOf`, `pageSlugsOf` and
  `getDesignPageEntry` enforce it; `/weddings/[slug]` has
  `dynamicParams = false` and `/preview/[slug]` refuses PRIVATE.

Dentelle is a DRAFT, borrowing Jardin's component and card. The pipeline from
brief to live card is `docs/design-roadmap.md`.

### Sample invitation — `lib/sample-invitation.ts`

One wedding behind every marketing preview (comparison, collection, WhatsApp
thread). Parsed through `coreContentSchema.extend(BLOCKS)`, and a registry
test parses it with every design's schema, so a schema change breaks the
sample rather than letting marketing drift from the product.

> **Its date must stay in the future.** `Countdown` correctly renders nothing
> once a date has passed, which silently leaves a gap in every preview.
> `tests/lib/sample-invitation.test.ts` fails while there is still time to fix it.

### Tables and RLS

Every admin policy is `for all to authenticated using (private.is_admin())`.
`private` is not exposed by PostgREST; `authenticated` holds USAGE and
EXECUTE, anon holds nothing. Client policies (0008) go through
`private.owns_invitation(id)` and `private.can_review(id, snapshot)`. No client
UPDATE or DELETE policy exists anywhere. TRUNCATE, TRIGGER and REFERENCES are
revoked from `authenticated` (0009).

| table | policy | notes |
|---|---|---|
| `clients` | admin all; client self read | email unique, lowercase; `user_id` set by the invite, ON DELETE SET NULL; deleted only through `admin_delete_client` |
| `orders` | admin all; client read own | `client_id`, `due_at`, reference default `RV-####` (sequence); status adds `brief`, `concept` |
| `client_notes`, `order_notes` | admin all ONLY | operator notes (0009). Row RLS cannot hide a column and admins share `authenticated`, so notes left `clients`/`orders` |
| `invitations` | admin all; client read own | `order_id` unique; `content` is the working draft, `published_content` the approved snapshot guests see |
| `invitation_reviews` | admin all; client read own; client insert own | `content_snapshot` IS the approval; `on_behalf`; `created_by` has no delete action. Client insert: owns, `created_by = auth.uid()`, `on_behalf = false`, order in `review`, snapshot = content. `note` <= 1000. 0010 trigger sets `created_at = now()` and `id`: "latest" orders by it, so no caller may choose it |
| `rsvps` | admin all; couple read own when entitled | `private.can_read_rsvps` (0012): owns the invitation AND `entitlements.rsvp`. Checks: name 1..80, party 1..10, a decline is 1, notes and message <= 500. Written only by the service role. In the Realtime publication |
| `guests`, `custom_leads` | admin all | `guests` unused: the seam for per-guest tokens |
| `admin_users` | `admin_users self read` | membership, not a JWT claim, makes an admin |
| view `published_invitations` | SELECT to anon, authenticated ONLY | runs as its owner; projects `published_content as content` |
| bucket `invitation-media` | public read; admin select, insert, update, delete | WebP and MP4 only, 50 MB; `<invitation>/<kind>/<name>` |
| fn `admin_delete_client(uuid, text) -> uuid[]` | EXECUTE to authenticated only | security INVOKER (admin RLS applies) + explicit `is_admin()`; locks the client row; raises `RV001` (name), `RV002` (published); deletes invitations (reviews, guests, rsvps cascade), orders, client; returns the invitation ids for storage cleanup |

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

- **`lib/routes.ts` stays import-free.** `next.config.ts` imports it and is
  transpiled without the `@/` alias: one `@/lib/site` import passed every test
  and broke `next build` at config load. `tests/next-config.test.ts` pins it;
  URL builders that need `SITE_URL` live in `lib/auth/links.ts`.
- **Auth emails are ours, never Supabase's.** The service role mints a token
  (`generateLink`), the email carries `/auth/confirm?token_hash=`, and the
  server verifies it. No PKCE verifier is involved, so the email opens on any
  device. `RESEND_API_KEY` is required by `lib/env.ts`: a deploy without it
  fails every page that reads the env.
- **Reset emails are throttled by us** (`auth_email_sends`, 0013: one a
  minute, five an hour per address; read failure refuses). Supabase's own
  rate limit no longer applies to emails we send.
- **A Server Component cannot sign anyone out** (it cannot write cookies).
  Guards redirect to `/auth/signout` instead.
- **A session may set a password without the current one only when its
  recovery is under 15 minutes old** (`getRecoveryClient`), or on the welcome
  step before terms are accepted. Everywhere else `changePasswordAs` checks
  the current password.
- **An approval is of the version the client was shown.** The preview carries a
  fingerprint of what it rendered; the policy pins the snapshot to the stored
  content; the server stamps the time.
- **`lib/invitations/publish-guard.ts` uses `node:crypto`**: never import it
  from a `'use client'` module.
- **One phone, one shape.** `components/PhoneShell.tsx` draws every phone
  (design page, homepage, admin editor, client preview) and fixes its screen
  to the house envelope render's proportions (`PHONE_SCREEN_RATIO`, 800/1732).
  Callers choose only the width. A shorter, wider phone crops the envelope.
- **A template's first screen is its container's, not the window's.**
  Templates size the hero with `SCREEN_HEIGHT` (`components/invitation/screen.ts`,
  `var(--invitation-screen-h, 100dvh)`), never `dvh`/`vh`: inside a scaled
  preview `dvh` is the browser window. Every scaled container sets the var with
  `screenFor(RENDER_WIDTH, aspect)` (phone: `PHONE_SCREEN_RATIO`; thumbnails
  and frames: `THUMBNAIL_ASPECT`, 9/16).
- **Open pages update themselves.** `components/LiveRefresh.tsx` subscribes to
  Realtime on `invitation_reviews` and `orders` (0011 publishes them; RLS
  scopes each viewer) and calls `router.refresh()`, debounced, plus on tab
  focus. Mounted on the admin clients list, client page and invitation editor,
  and the portal dashboard and preview.
- **Only the live page sends replies.** Templates take an optional
  `rsvpSlug`; only `app/i/[slug]` passes it. Every preview (store demo,
  thumbnails, admin and client previews) shows "This is a preview" and never
  calls the action. The RSVP section renders only when `entitlements.rsvp`.
- **Replies are written by the service role, addressed by slug.** Anon holds
  no privilege on `rsvps` or `guests` (0012 revokes Supabase's defaults,
  TRUNCATE included). Every reply is kept; the guest list counts each
  guest's latest reply by normalised name.
- **A helper used inside RLS must be executable by the role the policy runs
  as.** 0003 revoked EXECUTE on `public.is_admin()` to quiet the advisor and
  silently broke every admin policy ("permission denied for function"). Policy
  helpers live in the non-exposed `private` schema with EXECUTE granted to
  `authenticated`.
- **Every migration that creates or recreates a view or table in `public`
  ends with `revoke all ... from public, anon, authenticated` and an explicit
  grant.** Supabase's default privileges grant ALL on new objects; 0004's
  recreated view was writable by the public anon key past RLS until 0006.
  Verify with an anon write attempt inside a rolled-back transaction.
- **Guests see only an approved snapshot.** `published_content` is written by
  publish alone, from the latest approval; `content` is a draft.
- **shadcn is scoped to `[data-surface="app"]`.** Its tokens (mapped to the
  Rêve palette: bone, ink, sand, wine) and base layer are defined only there
  (`AppSurface`) and on `body:has([data-surface="app"])`, because base-ui
  menus and dialogs portal to `<body>`, outside the wrapper, and rendered
  transparent before that selector existed. The storefront's `--background`,
  `--foreground`, `--font-sans` and radius scale are untouched. NEVER run
  `shadcn init` again: it rewrites `app/globals.css` and `app/layout.tsx`.
  The draft preview stays outside the surface or the design gets repainted.
- **Form field ids come from `useId`**, never from the field name: one admin
  page holds several forms with the same field names.
- **Admin dates are studio time.** `STUDIO_TIME_ZONE` (Asia/Beirut): a typed
  due date is stored as `<date> 23:59:59 Asia/Beirut` (Postgres resolves the
  zone and DST), and every admin `Intl.DateTimeFormat` passes `timeZone`, so
  a UTC server shows the same day the operator typed.
- **`requireAdmin` is React `cache()`d**: one check per request (layout and
  page share it), never across requests or actions.
- **Destructive admin actions sit behind a dialog**, and deleting a client
  asks for the name typed out. The check is mirrored: `namesMatch` in the
  dialog, `lower(btrim())` in the function.

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
- **An SVG with a `viewBox` has an INTRINSIC height** and sizes to it in
  preference to resolving `top` against `bottom` — and `h-auto` resolves to
  that same intrinsic height rather than releasing it. An absolutely
  positioned SVG that must span a container needs its height set explicitly
  (`h-[calc(100%-6rem)]`). This cost two separate bugs in one session: a
  countdown basin stretching to its container, and a timeline vine running 130px
  past its last bloom into the next section.
- **Reserve an ornament's MEASURED height, not its assumed one.** A plate 83px
  tall in a slot reserving 40px rides up over the text under it.
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

**Painted plates.** A design's artwork is generated externally and dropped into
`public/invitation/<slug>/`. Two conversion recipes that are not guessable:

- **Keying a plate off a black ground:** map luma 8→64 to partial alpha so the
  painted feather survives instead of cutting jagged, then UNMULTIPLY against
  black or pale petals read grey. Ship as WebP with `alphaQuality: 100`.
- **A plate with its own deckled edge needs no padding.** Transparency lets it
  rest on whatever ground the section sets. An earlier venue plate whose brush
  edge ran off three sides had a flat 4% margin added at conversion; a torn
  edge the painter actually made is what that margin was standing in for.

**A hero plate is measured before it ships.** The hero lays NOTHING over the
painting — no scrim, by decision — so a replacement is checked against `INK`
across the headline, names and message bands. Jardin's current plate: 9.3:1,
10.4:1, 10.2:1, with under 3.5% of any band below 4.5:1. A plate whose centre
goes dark has no fallback.

Snag: `optimize:images` walks ALL of `public/` and so converts `ads.jpg`, the
mockup base, into an `ads.webp` nothing references. Delete it or exclude the
base from the walk.

---

## 05 — Known gaps

- `/i/[slug]` renders dynamically; SSG via `generateStaticParams` is possible
  once the published set is known at build time.
- Testimonials are marked placeholders. Rêve is pre-launch.
- **Portal Phase 5 is not built:** private designs and per-client envelopes.
  Payment stays manual (Whish).
- **RSVP has only a honeypot.** No Turnstile (no Cloudflare keys yet) and no
  rate limit: a determined submitter can post repeatedly to a live slug.
  Repeated replies under the same name count once (latest per name), but
  distinct fake names do inflate the headcount, and every reply fills the
  table. Each reply also triggers live refreshes, so a burst multiplies
  reads too.
- **No email when a guest replies or a client decides.** The owner chose no
  operator alerts for now; `lib/email` is where they would go.
- **Operator setup still open:** Supabase email OTP expiry (1 hour by default,
  short for an invite); password minimum 8; leaked-password protection.
  Sign-ups are OFF. studio@reveinvitations.com has no mailbox: replies bounce.
- **The portal has not seen a real email end to end.** Confirm once with a
  real invite and a real reset: that the recovery session's JWT `amr` is an
  object entry with a `timestamp` (if Supabase sends the string form, every
  reset is refused), and that the review bar does not cover a design's own
  fixed bottom element.
- **Deferred Phase 3 minors:** GET `/auth/signout` is cross-site triggerable
  (local sign-out only); the settings page reads the client row twice;
  `ChangePasswordForm` imports admin primitives; a DB outage during sign-in or
  reset can throw to the form; the Playwright invite to approve flow waits on a
  local Supabase stack.
- **Deferred Phase 2 minors** (from the final review): search over 80
  characters lists every client; `moveOrder` does not re-check the status it
  read, so a stale button can move an order back; provisioning races map to a
  generic error, and a 59-60 character base slug plus suffix exceeds the slug
  limit; uploads differing only in case or punctuation overwrite each other;
  an empty upgrade amount records $0; the fake Supabase in tests ignores query
  filters.
- **The collection card is a build artefact and nothing detects staleness.**
  `card.webp` is composed from a design's stills, one of which is captured off
  the live template. A design change means recomposing; nothing warns that the
  picture no longer matches. Jardin's was stale for most of a session — showing
  a flat mauve stand-in that predated its artwork entirely — with everything
  green and no test failing.
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
  Jardin does not have this problem — its hero is a pale painted arch — so the
  gap is Lin-specific rather than structural.
- `/i/[slug]` full-screen has not been verified in a browser this session; only
  the `contained` storefront demo has. The two branches differ.
- **Jardin's remaining dead space.** The Grounds sits at 28% slack: the venue
  plate renders 342px because the wrapper's `px-6` binds before `max-w-xl`
  does, so the section's whole subject is shown small. With thanks is at 37%
  after the density fix and is still a single sentence — the strongest
  candidate for a small painted sprig.
- **`dentelle` is an envelope without an invitation.** Its registry entry
  borrows Jardin's component and card wholesale and says so in its copy. That
  is honest while the envelope is what is being reviewed; shipping it means a
  real template and its own `mockup:compose`.
