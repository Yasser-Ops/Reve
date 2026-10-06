# Admin redesign: brand surface, usable editor, delete client

Date: 2026-10-06 · Branch: `feat/admin-redesign` (from `feat/client-portal`)

## Why

The Phase 2 admin works but reads as a stock shadcn app, not as Rêve. The
content editor is raw JSON, so the operator types field keys and ISO dates by
hand. The client page gives every action equal weight, including destructive
ones. There is no way to delete a client.

Success: the admin looks like the landing page's guest-list card, an
invitation can be filled in without touching JSON, the next step on an order
is always the obvious button, and a test client can be removed safely.

## Decisions taken with the owner

1. Scope is everything below, on one branch, before Phase 3.
2. Deleting a client is refused while any of its invitations is published.
3. The editor is a form generated from the design's schema, with the JSON
   kept behind an "Advanced" toggle.

## 1. Brand surface

- `[data-surface="app"]` in `app/globals.css` maps the shadcn tokens to the
  Rêve palette: background `bone`, card a warm white, border and input
  `sand`, primary `ink`, accent and destructive `wine`, muted foreground
  `cocoa`/`taupe`, ring `taupe`. `--font-heading` becomes the display face
  (Marcellus) inside the surface only. The storefront is untouched.
- Eyebrow labels: small tracked uppercase (`text-[11px] tracking-[0.2em]`),
  as on the landing page's "GUEST LIST".
- Shell (`app/admin/(gated)/layout.tsx`): top bar with the Rêve wordmark in
  Marcellus, a "Clients" link, the admin email and Sign out. Inner pages
  render a `Breadcrumbs` component: Clients / client name / order reference
  / invitation.
- `StatusBadge` gets per-stage tones: early stages (awaiting payment, paid,
  brief, concept) sand; in design taupe; awaiting approval wine; delivered
  solid ink; cancelled muted with a line through.
- `/i/[slug]/not-found.tsx` gets the wordmark and the display face.

## 2. Clients list (`/admin`)

- Summary strip of four tiles: Active, Due in 48h, Overdue, Awaiting
  approval. Counts are over orders. Active means not delivered and not
  cancelled; due and overdue apply to active orders with a `due_at`.
  Each tile is a link that sets a `view` filter
  (`active | due | overdue | review`) on the list.
- Filters submit on change (a small client island calls `requestSubmit`);
  the Filter button goes. The form still works as a plain GET.
- Columns: client (name, phone), latest order (reference, capitalised
  tier), stage badge, due. Overdue due dates render in wine.
- Below `md` the table becomes stacked cards.
- Empty states: "No clients yet" with a New client button when there are no
  clients at all; "No clients match" when filters exclude everything.

## 3. Client page (`/admin/clients/[id]`)

- Header: name in the display face, email, a WhatsApp link
  (`https://wa.me/<digits>`), account state. "Edit details" toggles the
  details form (a `<details>` element; no JavaScript needed).
- Order card:
  - Stepper of `flowFor(tier)` with the current stage marked.
  - One primary button for the forward move (`nextMove(tier, status)`, a
    new helper in `lib/orders/status.ts` returning the forward entry of
    `allowedMoves` or null).
  - A "⋯" dropdown menu: Move back (when allowed), Upgrade tier (opens a
    dialog holding the existing upgrade form), Cancel order (opens a
    confirm dialog).
  - Create invitation (when allowed) stays as today, restyled.
  - Invitation row: design name, `/i/<slug>`, status, "Open editor".
- "Add order" is a button revealing the existing order form (`<details>`).
- Danger zone at the bottom: "Delete client" (section 4).

## 4. Delete client

UI: a dialog listing what goes (N orders, N invitations, their uploaded
files). The Delete button is disabled until the typed text equals the
client's full name. If any invitation is published, the dialog says so and
offers no delete.

Server action `deleteClient` in `lib/admin/client-actions.ts`:

1. `requireAdmin()`; zod-validate `clientId` (uuid) and `confirmName`.
2. Call RPC `admin_delete_client(p_client_id uuid, p_confirm_name text)
   returns uuid[]`, added by migration `0007_admin_delete_client.sql`
   (generated with the supabase-migration skill). The function is
   `security invoker` (RLS admin policies apply), runs in one transaction,
   and:
   - raises `RV001` when the confirm name does not match `full_name`
     (trimmed, case-insensitive);
   - raises `RV002` when any of the client's invitations has
     `status = 'published'`;
   - deletes the invitations (reviews, guests and RSVPs cascade), then the
     orders, then the client;
   - returns the deleted invitation ids. A missing client returns null.
3. For each returned id, list `<id>/<kind>` for every `MEDIA_KINDS` value
   and remove those objects from `invitation-media`. A storage failure here
   does not undo the delete; it is reported in the result message.
4. `revalidatePath('/admin')`, redirect to `/admin?notice=deleted` which
   renders "Client deleted." (known notices only, like the login page).

Error codes map to messages: `RV001` "The name does not match.", `RV002`
"Unpublish their invitation first.", anything else `UNEXPECTED`.

Accounts: clients have no auth users until Phase 3, so the delete does not
touch `auth.users`. Phase 3 must extend `deleteClient` to remove the
client's auth user (service role) when it adds accounts. This is recorded
in ARCHITECTURE.md "Known gaps".

Archived invitations are deleted with the client.

## 5. Invitation editor (`/admin/invitations/[id]`)

### Form model

`lib/admin/content-form.ts` exports `formModel(schema: z.ZodObject)`,
returning field descriptors:

```ts
type FormField =
  | { kind: 'text' | 'textarea' | 'datetime' | 'url'; key; label; required }
  | { kind: 'choice'; key; label; required; options: string[] }
  | { kind: 'media'; key; label; required; media: MediaKind }
  | { kind: 'group'; key; label; required; fields: FormField[] }
  | { kind: 'list'; key; label; required; item: FormField[] };
```

- Kind comes from the zod type after unwrapping optional and default:
  string → `text` (`textarea` when meta `multiline: true`), iso datetime →
  `datetime`, url → `url`, enum → `choice`, string with meta `media` →
  `media`, object → `group`, array of objects → `list`.
- Every field, nested ones included, must carry meta `label`; `formModel`
  throws otherwise, as `checklistFor` does for `ask`. `GlobalMeta` gains
  `label?: string`, `multiline?: boolean`, `media?: MediaKind`. Core and
  block schemas get labels; `message` and `registryMessage` are multiline;
  `gallery[].src` is `media: 'photos'`, `heroMedia.src` is `media: 'hero'`.
- An unsupported zod type throws with the key, so a new design cannot
  silently lose a field.

### Values

`toFormValue` / `fromFormValue` convert between stored content and form
state: a datetime is shown as `datetime-local` in the browser's zone and
stored as ISO UTC; empty optional strings and empty optional groups are
omitted, not saved as `""`. Round trip of `SAMPLE_CONTENT` must be exact.

### Editor UI

`ContentEditor` becomes a client island holding one value:

- Form tab renders `formModel` output. Lists add, remove and reorder rows.
  Media fields are text inputs with a `<datalist>` of uploaded file URLs of
  that kind (passed from the server).
- "Advanced: edit JSON" shows the same value as text. Switching back parses
  it; invalid JSON keeps you on the JSON tab with the parse error.
- Save posts `content` (JSON string) to the existing `saveContent`. Server
  issues map onto fields by path and also list at the top.
- Preview: the existing iframe inside a phone frame, sticky on `lg`.

The "Fields this design draws" list goes; "Copy what we need" stays.

### Media and approval

- `MediaUploader` becomes a drop zone (kind select, drag or click, file
  list with progress); behaviour and the server action are unchanged.
- `ReviewPanel` computes `canPublish(content, latestReview)` on the server
  and disables Publish with the reason shown. Approval history renders as a
  timeline.

## Out of scope

Client portal, invites, RSVP (Phases 3 to 5). Dark mode for the admin.
Changes to the order state machine or the publish rules.

## Testing

- Vitest: `formModel` on the Lin and Jardin schemas (kinds, labels, throws
  on a missing label); value round trip on `SAMPLE_CONTENT`; `nextMove` for
  each tier and stage; `deleteClient` with the fake Supabase helper (name
  mismatch, published block, storage removal per kind, redirect).
- Migration checked against the live project with a published and an
  unpublished fixture inside a rolled-back transaction.
- Browser pass on desktop and 390px: list, client page, delete dialog,
  editor form save and preview, publish disabled state.
- `pnpm lint && pnpm typecheck && pnpm test` before each commit.

## Commit order

1. Brand surface, shell, breadcrumbs, badges, not-found.
2. Clients list.
3. Client page and `nextMove`.
4. Delete client (migration, action, dialog).
5. Form model and editor.
6. Media drop zone, review panel, docs.
