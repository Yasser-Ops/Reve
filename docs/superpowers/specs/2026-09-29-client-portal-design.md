# Client Pipeline, Admin and Client Portal — Design

**Status:** agreed in conversation on 2026-09-29, awaiting review of this
written spec. No code from this spec exists yet.

**Goal:** Once a customer buys, Rêve has one place to manage them: their
account, their order, the invitation built for them, its approval and its
delivery. The customer has one place to see it: a private, password-protected
portal holding their invitation, their link and, where their tier includes it,
their guest list.

**Supersedes:** the `/manage/[token]` portal and the admin content editor with
form fields in `2026-09-04-reve-digital-invitations-design.md`. Amends
`2026-09-05-guest-rsvp-design.md` where noted in 08.

---

## 01 — Decisions taken

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Client sign-in | Email and password, email verified | Magic link: email is how the account is reached anyway, and clients expect a password. Phone OTP: needs a paid SMS provider |
| Account creation | Invite-only, from admin | Public sign-up: only a buyer needs a portal, and every buyer arrives through an order. Sign-up would only produce accounts that belong to nothing |
| Age | One required checkbox, "I accept the terms and confirm I am 18 or older", timestamp stored | Date of birth: still self-declared, and a sensitive field held for no purpose. 18 is Lebanon's age of majority |
| Portal per tier | Every tier gets an account; features switch on by entitlement | No account for Basic: two kinds of client to manage and no clean upgrade path |
| Basic in the portal | Link and details, with locked RSVP and guest-list cards that upsell to Managed | |
| Detail intake | WhatsApp, as today | Portal form: the operator prefers the conversation |
| Content authoring | Operator writes one JSON block per invitation, validated against the design's own schema, with live preview | Form editor: slower than the operator for a single author. Content in the repo: frames bloat git, client data lives in history forever, and every typo fix is a deploy |
| Per-design fields | Each design declares its content schema in the registry: shared core plus its own fields | One superset for every design: grows with every design and asks for 40 fields where one uses 10 |
| Approval | In the portal, with "Approve" and "Request changes"; approval snapshots the approved content | WhatsApp approval: no record inside the system when a detail is later disputed |
| Custom orders | Same pipeline with extra stages; feedback on WhatsApp; the same approval step at the end | Proof rounds in the portal: duplicates what WhatsApp already does |
| Seal | Neutral shared render with initials in CSS for every tier. A per-client rendered seal only as a Custom feature | Per-client renders for all: roughly 15 MB per client downloaded by every guest, uncacheable across clients |
| Upgrades | Manual. The client taps Upgrade, lands in WhatsApp with their reference; operator confirms payment and applies the new tier in admin | |

---

## 02 — Phases

One spec, five build phases. Each phase gets its own implementation plan and
ships working on its own.

| Phase | Delivers | Depends on |
|---|---|---|
| 1 — Foundation | Supabase clients, session refresh in `proxy.ts`, admin sign-in and gate, per-design content schemas, lazy registry | Prerequisites in 11 |
| 2 — Admin | Clients, orders, status pipeline, client invite, invitation JSON editor with preview and uploads, publish | 1 |
| 3 — Client portal | Accept invite, set password, terms; dashboard; review and approval; live link; upsell cards | 2 |
| 4 — RSVP | Guest write path, guest list in portal and admin, CSV export | 3 |
| 5 — Custom extras | Private designs, per-client envelope frames from storage | 2 |

---

## 03 — Data model

All changes are append-only migrations from `0005` onward. Every table keeps
RLS enabled.

### `clients` (new)

`id · user_id (auth.users, unique) · full_name · email (unique) · phone ·
notes · terms_accepted_at · created_at`

A client row is created by the admin at the moment of invite, together with the
auth user, so `user_id` is never null. `terms_accepted_at` is null until the
client completes the welcome step; the portal refuses everything else until it
is set.

### `orders` (changed)

- Gains `client_id` (not null, references `clients`) and `due_at`.
- Loses `customer_name`, `customer_phone`, `customer_email`: they move to
  `clients`. Checked on 2026-09-29: the only rows are seed data (order
  `RV-0001` "Sarah Test", its invitation `sarah-and-amine` on the removed
  `cap-blanc` design). The migration deletes them rather than carrying them.
- `orders.template_slug` is dropped: the design belongs to the invitation.
- `order_status` gains `brief` and `concept`. The full set:
  `pending_payment → paid → [brief → concept →] in_design → review → delivered`,
  plus `cancelled`. The bracketed stages are Custom only.

Transitions are enforced in ONE module, `lib/orders/status.ts`, as a table of
allowed moves per tier. The admin UI offers only the moves it permits. Each
status also carries its client-facing label there, so the portal and admin
cannot describe a stage differently.

### `invitations` (changed)

- `content` is now validated against the chosen design's schema (04), not a
  shared superset.
- Loses `manage_token_hash`: the token portal is superseded.
- Gains `envelope jsonb` (nullable, Phase 5): a per-client envelope override
  for Custom. Null means the design's shared envelope.
- `slug` is proposed from the names at creation (`maya-karim`) and editable
  until first publish.

### `templates` (dropped)

The registry in `components/invitation/registry.ts` is the one source of truth
for which designs exist. The table duplicated it, and its foreign key from
`invitations.template_slug` would force a database row for every new design
and every private Custom design. The foreign key and the table go;
`template_slug` is validated against the registry in the action that writes
it, and again on every read when the design's schema is resolved. The table
holds one seed row (`cap-blanc`).

### `invitation_reviews` (new)

`id · invitation_id · decision ('approved' | 'changes_requested') · note ·
content_snapshot jsonb · created_by (auth.users) · on_behalf (boolean) ·
created_at`

The approval record. `content_snapshot` is exactly what the client saw when
they decided. `on_behalf` marks an approval the operator recorded for a client
who approved in WhatsApp.

### Storage

One bucket, `invitation-media`, public read, admin write. Paths are
`<invitation_id>/<kind>/<file>` with `kind` in `photos`, `hero`, `envelope`.
Public read is correct because every file ends up on a public invitation; the
uuid prefix keeps drafts unguessable.

### RLS

| table | policy | rule |
|---|---|---|
| `clients` | admin all; client self read | `user_id = auth.uid()` |
| `orders` | admin all; client read own | via `clients.user_id = auth.uid()` |
| `invitations` | admin all; client read own | via order → client |
| `invitation_reviews` | admin all; client read own; client insert own | insert only while the order is `review`, and `created_by = auth.uid()` |
| `rsvps` | admin all; client read own when entitled | `entitlements->>'rsvp' = 'true'` |

Helper `owns_invitation(invitation_id)` (security definer, execute revoked
from API roles like `is_admin`) keeps the joins out of every policy. Anon
access is unchanged: `published_invitations` stays the only public window.

---

## 04 — Per-design content schemas

```
lib/schemas/invitation/
  core.ts      coreContentSchema: names, initials, eventDate, venue
  blocks.ts    headline, message, schedule, gallery, heroMedia, registryMessage
components/invitation/templates/<slug>/schema.ts
               export const contentSchema = coreContentSchema.extend({
                 ...blocks.message, ...blocks.schedule, ...,
                 ownField: z.string().meta({ ask: 'What we ask the client' }),
               })
```

- **The core** is what exists for every design and is read outside it: the
  envelope's initials, the portal header, link previews, RSVP.
- **Blocks** keep today's keys unchanged, so existing content still parses.
- **Every field carries `meta({ ask })`**, a line in plain language. The admin
  derives the "what we need from you" checklist from these, as a numbered
  message to paste into WhatsApp.
- **The registry entry carries the schema** beside the component, through a
  `defineTemplate({ schema, component })` helper that ties the component's
  props to its own schema's type.
- **Fields are only ever added.** A new optional field needs no migration and
  no data change. A rename is done by a `migrate(content)` function beside the
  schema, applied on read, never by rewriting rows.
- **A redesign that would change invitations already approved ships as a new
  design entry** (`lin-2`), with the old one hidden from the shop and still
  rendering. Small fixes go to every invitation on deploy, which is intended.

### Registry changes

- `component` becomes a loader, `() => import('./templates/<slug>')`, so a
  page loads only the design it renders.
- `visibility: 'listed' | 'draft' | 'private'`. `draft` absorbs today's
  `draft?: true`. `private` is a Custom design built for one client: never on
  a shelf, in the sitemap or at a product page, but it renders for any
  invitation that names it.
- A private design's heavy artwork lives in `invitation-media`, not `public/`.

---

## 05 — Routes

```
app/
  auth/confirm/route.ts          verifyOtp(token_hash, type) -> session -> next
  (admin)/admin/
    login/page.tsx
    layout.tsx                    gate: getClaims + is_admin, else redirect
    page.tsx                      clients: search, filter by status and tier
    clients/new/page.tsx          client + first order in one form
    clients/[id]/page.tsx         details, orders, invite status, upgrade
    invitations/[id]/page.tsx     JSON editor | live preview | uploads | reviews
  (portal)/portal/
    login/page.tsx
    forgot/page.tsx
    welcome/page.tsx              set password + terms/18+ checkbox
    layout.tsx                    gate: getClaims + client row + terms accepted
    page.tsx                      status, checklist, review, link, guests
    preview/[id]/page.tsx         full-screen draft, exactly as guests see it
    guests/export/route.ts        CSV, entitled only
```

Both private segments set `robots: noindex` in metadata and an
`X-Robots-Tag: noindex` header for `/admin` and `/portal` in `next.config.ts`.
Each has its own `error.tsx` and `not-found.tsx`.

### The portal page, by state

```
in_design / brief / concept   stage label + "we are working on it"
review                        preview + [Approve] [Request changes + note]
delivered                     live link, copy, share to WhatsApp
always                        the design's checklist, ticked as fields fill
Managed / Custom              guest list, headcount, export (Phase 4)
Basic                         the same cards, locked, [Upgrade] -> WhatsApp
```

---

## 06 — Procedural traces

**Operator onboards a client**

```
/admin/clients/new  submit { name, email, phone, design, tier, eventDate,
                              amount, dueAt }
  createClientAndOrder             server action, zod, admin check
    admin.auth.admin.inviteUserByEmail(email, redirectTo /auth/confirm
                                        ?next=/portal/welcome)
    insert clients (user_id from the invite), orders (pending_payment)
  -> client page; status "invited"
```

**Client accepts**

```
invite email -> /auth/confirm?token_hash&type=invite
  supabase.auth.verifyOtp -> session cookie (email now verified)
  -> /portal/welcome
     set password + checkbox -> acceptInvite action
       auth.updateUser({ password })   as the user
       clients.terms_accepted_at = now()
         ^ through the admin client, keyed on the user id from getClaims().
           Clients have no UPDATE policy on their own row: nothing else on it
           is theirs to change.
  -> /portal
```

**Operator builds and delivers**

```
order marked paid -> provisionInvitation
  entitlementsForTier(tier) snapshotted; slug proposed; status draft
/admin/invitations/[id]
  paste JSON -> design schema validates on the client for feedback
  save -> updateInvitationContent action validates again, server side
  preview renders the real template from the saved draft
  upload photos/frames -> invitation-media/<id>/...
  "Send for review" -> order.status = review
client /portal -> Approve
  submitReview action: RLS insert into invitation_reviews with snapshot
operator -> Publish
  allowed only if the latest review is 'approved' AND its snapshot equals
  current content; otherwise "Approve on client's behalf" records on_behalf
  invitation.status = published, order.status = delivered
```

**Upgrade**

```
Basic portal -> [Upgrade] -> wa.me with reference prefilled
operator confirms payment -> applyUpgrade(orderId, tier, amountPaid)
  orders.tier, orders.amount; invitations.entitlements re-resolved
  ^ the one deliberate exception to "entitlements are a snapshot"
```

---

## 07 — Modules

| File | Purpose |
|---|---|
| `lib/supabase/client.ts`, `server.ts`, `admin.ts` | The three clients. `admin.ts` is `server-only` and the single reader of the service-role key |
| `proxy.ts` | Refreshes the Supabase session cookie. Optimistic only: every page still gates itself |
| `lib/auth/guards.ts` | `requireAdmin()`, `requireClient()`: `getClaims()`, then membership, then redirect |
| `lib/orders/status.ts` | Allowed transitions per tier, and labels |
| `lib/clients/*`, `lib/orders/*`, `lib/invitations/*` | Server actions and reads per domain |
| `lib/schemas/invitation/*`, `templates/*/schema.ts` | Content schemas (04) |
| `lib/env.ts` | Gains `NEXT_PUBLIC_SITE_URL` for invite redirect URLs |

---

## 08 — RSVP (Phase 4)

`2026-09-05-guest-rsvp-design.md` stands, with two amendments:

- `Sheet.tsx` no longer exists. `RsvpForm` is a shared client island that a
  design places where its own layout wants it, styled through CSS custom
  properties the design sets. It is behaviour, not a silhouette, so it belongs
  beside `motifs/`.
- The guest list it feeds is read in the portal through the `rsvps` client
  policy in 03, and in admin under the invitation.

Turnstile stays deferred until Cloudflare keys exist, as that spec records.

---

## 09 — Errors and security

- Server actions return a discriminated result and never throw to a form.
  Reads crash loudly into the segment's `error.tsx`.
- Every action re-checks identity: admin actions call `requireAdmin()`, client
  actions run through the user's own Supabase client so RLS is the second
  wall. The service-role client is used only for auth admin calls and
  storage uploads.
- `getSession()` is never used for authorization.
- Stored content is parsed with the design's schema on every read, admin and
  public alike.

---

## 10 — Testing

Vitest, with database calls injected:

- `status.ts`: every allowed move per tier, and a sample of refused ones
- each design schema: the sample invitation parses; missing core fields fail
- checklist derivation from `meta({ ask })`
- publish guard: refused without approval, refused when content changed after
  approval, allowed on behalf
- upgrade re-resolves entitlements
- RLS: after each migration, `get_advisors` security run, plus SQL checks
  that a client cannot read another client's order, invitation or RSVPs

Playwright, once Phases 2 and 3 exist: invite → welcome → review → approve →
publish, against a local Supabase.

---

## 11 — Prerequisites (operator)

1. ~~Restore the "Reve website" Supabase project.~~ Done 2026-09-29.
2. ~~Put the real service-role key in `.env.local`.~~ Done 2026-09-29.
3. **Custom SMTP (Resend or similar) in Supabase Auth.** The built-in sender
   is rate-limited to a handful of emails an hour and is not meant for
   production; invites and password resets depend on it.
4. **Edit the Invite and Reset Password email templates** to link to
   `/auth/confirm?token_hash={{ .TokenHash }}&type=...`.
5. Later: Cloudflare Turnstile keys, for sign-in and RSVP.

---

## 12 — Out of scope

Online payment, client-side content editing, proof rounds in the portal,
guest-list import with per-guest tokens, email notifications beyond auth
emails, and multiple admin roles.
