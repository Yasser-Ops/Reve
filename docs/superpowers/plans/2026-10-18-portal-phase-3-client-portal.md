# Portal Phase 3: Client Invite and Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The operator invites a client from admin. The client accepts by email, sets a password and accepts the terms, then signs in to a private portal that shows their order's stage, what Rêve still needs from them, the draft to approve or send back, and the live link once delivered.

**Architecture:** Client access is RLS-first: migration 0008 adds client read policies and a review insert policy whose check pins the snapshot to the invitation's current content, so the database refuses a forged approval. `requireClient()` mirrors `requireAdmin()`. The service-role client (`lib/supabase/admin.ts`, new) is used only for auth admin calls (invite, delete user) and for stamping `terms_accepted_at`. The portal lives at `app/portal/` and mirrors `app/admin/`: public auth pages, a `(gated)` group behind the guard, and a bare `preview/[id]` outside the surface styles.

**Tech Stack:** Next.js 16 App Router (`proxy.ts`, not middleware), React 19, TypeScript strict, Supabase (`@supabase/ssr`, `getClaims()`), zod 4, Tailwind + shadcn, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-client-portal-design.md` (Phase 3: sections 01, 03 RLS, 05 portal routes and "The portal page, by state", 06 "Client accepts", 09).

## Global Constraints

- Read `node_modules/next/dist/docs/` for any Next API before using it (AGENTS.md): this Next has breaking changes.
- `any` is forbidden; use `unknown`. pnpm only.
- Authorization uses `getClaims()`, never `getSession()`.
- Server actions return `ActionResult` (`lib/admin/action-result.ts`) and never throw to a form; reads throw into the segment's `error.tsx`.
- Every input crossing a boundary is parsed with zod.
- Only `lib/supabase/admin.ts` reads `SUPABASE_SERVICE_ROLE_KEY`. It is `server-only`.
- Schema changes are append-only migrations (`supabase-migration` skill), then regenerate `lib/supabase/database.types.ts`, then run Supabase security advisors.
- Password rules come from `PASSWORD_RULES` (`lib/auth/messages.ts`, min 8, max 72). Supabase's dashboard minimum is set to 8 to match.
- All route strings go through `lib/routes.ts`. No magic strings.
- Copy: no mid-sentence em-dashes in anything a client reads.
- `/portal` pages carry `robots: noindex` metadata; `next.config.ts` already sends `X-Robots-Tag` for `PRIVATE_ROUTE_PATTERNS`.
- Every task ends with `pnpm lint && pnpm typecheck && pnpm test` green.
- Architectural notes go to `STAGING_CHANGES.md` (untracked), not `ARCHITECTURE.md`.

## Rulings (decided here, not in the spec)

1. **Invite is a button on the client page, not part of client creation.** The spec's amendment says a client awaiting payment should not hold an account. The button shows once any order has reached `paid`.
2. **The Basic tier gets a portal.** The spec (01) says every tier gets an account. The `portal` entitlement in `lib/entitlements.ts` is not consulted for access; it is left untouched (snapshots on existing rows depend on its shape).
3. **Approval goes through RLS with the snapshot checked in the policy**, not trusted from the browser: `content_snapshot = invitations.content` is part of the `with check`.
4. **A client may decide again while the order is in review.** The latest review wins, which is what `publishReadiness` already reads.
5. **Requesting changes does not move the order.** The operator sees the note and moves it back to `in_design`.
6. **Invite links work before the email templates are edited.** `/auth/confirm` handles `token_hash` (edited templates), `code` (PKCE) and, through `/auth/session`, the `#access_token` fragment the default template produces (Lessons Promoted: parse both).
7. **Client "profile" is read-only** (name, email, phone with a "message us to change" line). Clients have no UPDATE policy on their row by design (spec 06). Settings is password change only.
8. **Playwright end-to-end is deferred**: there is no local Supabase stack in the repo (`supabase/` holds migrations only). Recorded in Known gaps.

## Review Focus

1. **A signed-in admin opening `/portal`**: has no client row, so it must be refused with a clear notice and signed out locally, never shown an empty portal or someone else's data. Test in Task 5.
2. **An invited client who never sets a password and clicks the link twice** (expired or used token): `/auth/confirm` must land them on `/portal/login` with an "invite link expired, ask us for a new one" notice, not a 500. Test in Task 3.
3. **Re-inviting a client whose auth user already exists** (lost email): `inviteClient` must not create a second user or overwrite `user_id`; it resends. Test in Task 4.
4. **A client approving a draft that the operator edited a second earlier**: the snapshot policy refuses the insert; the client sees "This draft just changed. Reload to see the latest." Test in Task 8.
5. **A client with two orders** (a second order added later): the dashboard shows each order's own stage and invitation; reviews and links never cross between them. Test in Task 7.

---

## File Structure

```
supabase/migrations/0008_client_portal.sql      client RLS, review policy, helpers
lib/supabase/admin.ts                           service-role client (server-only)
lib/supabase/database.types.ts                  regenerated
lib/auth/password.ts                            passwordSchema (one, shared)
lib/auth/messages.ts                            + PORTAL_MESSAGES, CONFIRM messages
lib/auth/guards.ts                              + requireClient, requireClientAccount
lib/auth/client-membership.ts                   getClientForUser(supabase, userId)
lib/auth/actions.ts                             changePassword generalised
lib/auth/portal-actions.ts                      signInClient, requestReset, setNewPassword,
                                                acceptInvite, signOutClient
lib/admin/invite.ts                             inviteClient action
lib/admin/client-actions.ts                     deleteClient also removes the auth user
lib/portal/orders.ts                            getPortalOrders() read
lib/portal/review-actions.ts                    submitReview action
lib/schemas/content/checklist.ts                + checklistProgress
lib/routes.ts                                   + portal routes, notices
app/auth/confirm/route.ts                       token_hash | code | fallthrough
app/auth/session/page.tsx + SessionFromHash.tsx  #access_token fallback (client island)
app/portal/layout.tsx                           metadata only (noindex)
app/portal/error.tsx, not-found.tsx
app/portal/login/, forgot/, reset/, welcome/    page.tsx + one form island each
app/portal/(gated)/layout.tsx                   requireClient + AppSurface + header
app/portal/(gated)/page.tsx                     dashboard
app/portal/(gated)/settings/page.tsx            change password, read-only details
app/portal/preview/[id]/page.tsx                bare draft render
components/invitation/DraftRender.tsx           shared by admin and portal preview
components/portal/OrderPanel.tsx                one order, by state
components/portal/ReviewForm.tsx                approve / request changes island
components/portal/LiveLink.tsx                  copy + WhatsApp share island
components/portal/LockedCard.tsx                Basic upsell
components/admin/AccountStatus.tsx              not invited / invited / active + button
```

---

### Task 1: Migration 0008, client RLS

**Files:**
- Create: `supabase/migrations/0008_client_portal.sql`
- Modify: `lib/supabase/database.types.ts` (regenerated)

**Interfaces:**
- Produces: `private.owns_invitation(p_invitation_id uuid) returns boolean` (security definer, `search_path = ''`, execute to `authenticated` only, as `private.is_admin()` in 0005). Policies below.

- [ ] **Step 1: Write the migration** with the `supabase-migration` skill:
  - `private.owns_invitation(id)`: exists invitation → order → client where `clients.user_id = auth.uid()`.
  - `"clients self read"`: select to authenticated using `user_id = (select auth.uid())`.
  - `"orders client read own"`: select using `client_id in (select id from public.clients where user_id = (select auth.uid()))`.
  - `"invitations client read own"`: select using `private.owns_invitation(id)`.
  - `"invitation_reviews client read own"`: select using `private.owns_invitation(invitation_id)`.
  - `"invitation_reviews client insert own"`: insert with check `private.owns_invitation(invitation_id) and created_by = (select auth.uid()) and on_behalf = false and private.can_review(invitation_id, content_snapshot)`.
  - `private.can_review(p_invitation_id uuid, p_snapshot jsonb)`: true when the invitation's order is `review` AND `invitations.content = p_snapshot` (jsonb equality is key-order blind). Same grants as the other helpers.
  - No client UPDATE or DELETE policy anywhere.
- [ ] **Step 2: Apply** via the Supabase MCP `apply_migration`, then `generate_typescript_types` into `lib/supabase/database.types.ts`.
- [ ] **Step 3: Verify with SQL as a client.** Create two throwaway auth users and clients A and B (each with an order and invitation) inside a transaction, `set local role authenticated` and `set local request.jwt.claims` to A, and check: A sees 1 client, 1 order, 1 invitation; A sees none of B's; A's review insert succeeds only when the order is `review` and the snapshot equals content; with `on_behalf = true` it fails. Roll back.
- [ ] **Step 4: Run `get_advisors` (security).** Expected: no new warnings from 0008.
- [ ] **Step 5: `pnpm typecheck`, commit** `feat(db): client read policies and checked review insert`.

---

### Task 2: Service-role client, shared password schema

**Files:**
- Create: `lib/supabase/admin.ts`, `lib/auth/password.ts`
- Modify: `lib/auth/actions.ts` (`changePassword` uses `passwordSchema`; body split so the portal reuses it)
- Test: `tests/lib/auth/password.test.ts`, existing `tests/lib/auth/change-password.test.ts`

**Interfaces:**
- Produces: `createAdminClient(): SupabaseClient<Database>` (`server-only`, `persistSession: false`, `autoRefreshToken: false`).
- Produces: `passwordSchema(email: string): z.ZodString` (min/max from `PASSWORD_RULES`, refuses a password equal to the email, case-insensitive, with `PASSWORD_MESSAGES.SAME_AS_EMAIL = 'Choose a password that is not your email address.'`).
- Produces: `changePasswordAs(identity: { email: string }, formData: FormData): Promise<ActionResult>` (the current body of `changePassword`, minus `requireAdmin()`), in `lib/auth/password-change.ts` (`server-only`, not `'use server'`). `changePassword` becomes `requireAdmin()` + `changePasswordAs`.

- [ ] **Step 1: Failing tests** in `password.test.ts`: `'7 characters is refused'`, `'73 characters is refused'`, `'the email itself is refused, any case'` (`passwordSchema('a@b.co').safeParse('A@B.CO')` fails with `SAME_AS_EMAIL`), `'8 characters passes'`.
- [ ] **Step 2: Run** `pnpm vitest run tests/lib/auth/password.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** both files and the split; `change-password.test.ts` keeps passing unchanged.
- [ ] **Step 4: Run** `pnpm vitest run tests/lib/auth`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): one password schema and the service-role client`.

---

### Task 3: `/auth/confirm` and the hash fallback

**Files:**
- Create: `app/auth/confirm/route.ts`, `app/auth/session/page.tsx`, `app/auth/session/SessionFromHash.tsx`
- Modify: `lib/routes.ts`, `lib/auth/messages.ts`
- Test: `tests/app/auth-confirm.test.ts`

**Interfaces:**
- Produces in `lib/routes.ts`: `ROUTES.PORTAL = '/portal'`, `PORTAL_LOGIN = '/portal/login'`, `PORTAL_FORGOT = '/portal/forgot'`, `PORTAL_RESET = '/portal/reset'`, `PORTAL_WELCOME = '/portal/welcome'`, `PORTAL_SETTINGS = '/portal/settings'`, `AUTH_CONFIRM = '/auth/confirm'`, `AUTH_SESSION = '/auth/session'`; `portalRoutes.preview(id)`; `PORTAL_NOTICE = { LINK_EXPIRED: 'link-expired', NOT_CLIENT: 'not-client', PASSWORD_RESET: 'password-reset', SIGNED_OUT: 'signed-out' }`; `safeNext(next: string | null): string`, which returns `next` only if it starts with `/portal` (blocks open redirects), else `ROUTES.PORTAL`.
- Produces in `lib/routes.ts`: `confirmUrl(next: string): string` = `${SITE_URL}${ROUTES.AUTH_CONFIRM}?next=${encodeURIComponent(next)}`, used by invite and reset.

- [ ] **Step 1: Failing tests** for the route's `GET` with the server client mocked:
  - `'token_hash + type=invite verifies and redirects to next'`: `verifyOtp({ token_hash, type: 'invite' })` called; 307 to `/portal/welcome`.
  - `'code exchanges for a session'`: `exchangeCodeForSession(code)` called.
  - `'a failed verify lands on login with link-expired'`: 307 to `/portal/login?notice=link-expired`.
  - `'next outside /portal falls back to /portal'`: `next=https://evil.example` → `/portal`.
  - `'no token and no code goes to /auth/session keeping next'`: 307 to `/auth/session?next=...` (the browser carries the `#access_token` fragment across the redirect).
  - `type` is parsed with `z.enum(['invite', 'recovery', 'email'])`.
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement the route** per the tests. `SessionFromHash` (`'use client'`): reads `window.location.hash`, calls `supabase.auth.setSession({ access_token, refresh_token })` on the browser client, then `router.replace(safeNext(next))`; on a missing or bad fragment, `router.replace` to login with `link-expired`. The page renders "Signing you in…" for the moment it takes.
- [ ] **Step 4: Run**, expected PASS.
- [ ] **Step 5: Commit** `feat(auth): confirm route for invite and recovery links`.

---

### Task 4: Admin invites, deleting a client removes their account

**Files:**
- Create: `lib/admin/invite.ts`, `components/admin/AccountStatus.tsx`
- Modify: `app/admin/(gated)/clients/[id]/page.tsx:679` (replace the account span with `AccountStatus`), `lib/admin/client-actions.ts` (`deleteClient`), `lib/routes.ts` (`ADMIN_NOTICE.CLIENT_DELETED_ACCOUNT_LEFT`)
- Test: `tests/lib/admin/invite.test.ts`, `tests/lib/admin/delete-client.test.ts`

**Interfaces:**
- Produces: `inviteClient(_previous: ActionResult | null, formData: FormData): Promise<ActionResult>` (`'use server'`), reading `clientId`.
- Produces: `accountState(client: { user_id: string | null; terms_accepted_at: string | null }): 'not_invited' | 'invited' | 'active'`, pure, in `lib/admin/invite-state.ts`.

- [ ] **Step 1: Failing tests:**
  - `'invites a client with no account and stores user_id'`: `admin.auth.admin.inviteUserByEmail(email, { redirectTo: confirmUrl(ROUTES.PORTAL_WELCOME) })`, then `clients.update({ user_id }).eq('id', ...).is('user_id', null)`.
  - `'refuses a client with no paid order'`: message `'Invite them once their payment is in.'` (`hasReached(tier, status, PAID)` over their orders).
  - `'an invited client gets the email again without a new user'`: `user_id` set and terms not accepted → `resetPasswordForEmail(email, { redirectTo: confirmUrl(ROUTES.PORTAL_WELCOME) })`; `inviteUserByEmail` not called; `user_id` untouched.
  - `'an active client is not re-invited'`: message `'They already have an account.'`.
  - `'an email already registered elsewhere is refused'`: invite error code `email_exists` → `'That email already has an account. Check it is not an admin address.'`.
  - `accountState`: three cases.
  - `deleteClient`: reads `user_id` before the rpc, then `admin.auth.admin.deleteUser(user_id)` after media; on failure, redirect notice `CLIENT_DELETED_ACCOUNT_LEFT`; with no `user_id`, `deleteUser` is not called.
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement.** `AccountStatus` shows "Not invited yet" + [Invite to portal], "Invited, has not set a password" + [Send the invite again], or "Active since <date>"; the button is an `ActionForm`, disabled with the reason when no order is paid. The clients list notice text for `CLIENT_DELETED_ACCOUNT_LEFT`: "Client deleted. Their sign-in could not be removed; delete it under Supabase Auth."
- [ ] **Step 4: Run** `pnpm vitest run tests/lib/admin`, expected PASS.
- [ ] **Step 5: Commit** `feat(admin): invite clients to the portal`.

---

### Task 5: Client guard, sign-in, forgot and reset

**Files:**
- Create: `lib/auth/client-membership.ts`, `lib/auth/portal-actions.ts`, `app/portal/layout.tsx`, `app/portal/error.tsx`, `app/portal/not-found.tsx`, `app/portal/login/{page.tsx,LoginForm.tsx}`, `app/portal/forgot/{page.tsx,ForgotForm.tsx}`, `app/portal/reset/{page.tsx,ResetForm.tsx}`, `app/portal/(gated)/layout.tsx`
- Modify: `lib/auth/guards.ts`, `lib/auth/messages.ts`
- Test: `tests/lib/auth/client-guards.test.ts`, `tests/lib/auth/portal-actions.test.ts`

**Interfaces:**
- Produces: `getClientForUser(supabase, userId): Promise<{ id: string; full_name: string; email: string; phone: string; terms_accepted_at: string | null } | null>` (RLS self read).
- Produces: `requireClientAccount = cache(async (): Promise<ClientIdentity>)`: claims, else login; no client row → local sign-out, login `?notice=not-client`. `ClientIdentity = { userId; email; clientId; fullName; termsAcceptedAt: string | null }`.
- Produces: `requireClient = cache(async (): Promise<ClientIdentity>)`: `requireClientAccount()` then, if `termsAcceptedAt` is null, redirect to `ROUTES.PORTAL_WELCOME`.
- Produces in `portal-actions.ts` (`'use server'`): `signInClient(prev, fd): Promise<SignInResult>`, `requestReset(prev, fd): Promise<ActionResult>`, `setNewPassword(prev, fd): Promise<ActionResult>`, `signOutClient(): Promise<never>`.

- [ ] **Step 1: Failing tests:**
  - guards: `'no claims redirects to /portal/login'`; `'an admin with no client row is signed out locally and told so'` (`signOut({ scope: 'local' })`, redirect `?notice=not-client`); `'terms not accepted redirects to welcome'`; `'requireClientAccount lets an unaccepted client through'`.
  - `signInClient`: bad credentials → `SIGN_IN_MESSAGES.BAD_CREDENTIALS`; signed in but no client row → local sign-out + `PORTAL_MESSAGES.NOT_CLIENT = 'This email is not a Rêve client account.'`; success redirects to `ROUTES.PORTAL`.
  - `requestReset`: always returns `{ ok: true }` whatever Supabase says (no account enumeration); calls `resetPasswordForEmail(email, { redirectTo: confirmUrl(ROUTES.PORTAL_RESET) })`.
  - `setNewPassword`: requires claims; validates with `passwordSchema(email)` and a matching confirm; `updateUser({ password })`; `signOut({ scope: 'others' })`; redirects to `ROUTES.PORTAL`.
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement.** Pages reuse the admin login's look (read `app/admin/login/`); copy addresses the couple ("Sign in to see your invitation"). The login page maps `PORTAL_NOTICE` values to sentences: link-expired "That link has expired or was already used. Message us on WhatsApp for a new one." (with `whatsappLink`), not-client, password-reset "Check your email for a link to choose a new password.". The `(gated)` layout calls `requireClient()`, wraps in `AppSurface`, header with the couple's name, Settings and Sign out. Every gated page ALSO calls `requireClient()` (the layout does not re-run on navigation; see the comment on `requireAdmin`).
- [ ] **Step 4: Run** `pnpm vitest run tests/lib/auth`, expected PASS.
- [ ] **Step 5: Commit** `feat(portal): sign-in, reset and the client guard`.

---

### Task 6: Welcome, set a password and accept the terms

**Files:**
- Create: `app/portal/welcome/{page.tsx,WelcomeForm.tsx}`
- Modify: `lib/auth/portal-actions.ts` (+ `acceptInvite`)
- Test: `tests/lib/auth/accept-invite.test.ts`

**Interfaces:**
- Consumes: `requireClientAccount`, `passwordSchema`, `createAdminClient`.
- Produces: `acceptInvite(prev, fd): Promise<ActionResult>` reading `password`, `confirm`, `terms` (`'on'`).

- [ ] **Step 1: Failing tests:** `'refuses without the terms box'` (`'Tick the box to accept the terms and confirm you are 18 or older.'`); `'refuses mismatched passwords'`; `'sets the password, then stamps terms through the admin client keyed on the claims user id'` (`admin.from('clients').update({ terms_accepted_at: <iso> }).eq('user_id', claimsUserId)`); `'a weak_password refusal is worded'`; `'already accepted redirects to /portal without changing anything'`.
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement.** Page: requireClientAccount; if accepted, redirect to `/portal`. Greeting with first name, the password and confirm fields, the checkbox "I accept the terms and confirm I am 18 or older." linking to the existing terms page if one exists (`lib/routes`/`app/(store)`; if none exists, link to WhatsApp and record it under Known gaps). Success redirects to `/portal`.
- [ ] **Step 4: Run**, expected PASS.
- [ ] **Step 5: Commit** `feat(portal): welcome step`.

---

### Task 7: Dashboard

**Files:**
- Create: `lib/portal/orders.ts`, `app/portal/(gated)/page.tsx`, `components/portal/{OrderPanel.tsx,LiveLink.tsx,LockedCard.tsx}`
- Modify: `lib/schemas/content/checklist.ts` (+ `checklistProgress`)
- Test: `tests/lib/schemas/content/checklist.test.ts`, `tests/lib/portal/orders.test.ts`, `tests/components/portal/order-panel.test.tsx`

**Interfaces:**
- Produces: `checklistProgress(schema: z.ZodObject, content: unknown): (ChecklistItem & { done: boolean })[]`. An item is done when `content` is an object whose value at `key` passes `schema.shape[key]`, is not `undefined`, and is not an empty string or empty array.
- Produces: `getPortalOrders(): Promise<PortalOrder[]>` via the user's client (RLS scopes it), newest first, `PortalOrder = { id; reference; tier: Tier; status: OrderStatus; invitation: { id; slug; status; templateSlug; content: unknown; latestReview: { decision; note; createdAt } | null } | null }`. Cancelled orders are left out.

- [ ] **Step 1: Failing tests:**
  - `checklistProgress`: empty content → all not done; a filled required field → done; `''` and `[]` → not done; content that is not an object → all not done.
  - `getPortalOrders`: selects with `orders(...invitations(..., invitation_reviews(...)))` ordered newest first, excludes `cancelled`, takes only the latest review.
  - `OrderPanel` renders, by status: `in_design`/`brief`/`concept`/`paid` → `STATUS_LABELS[status].client` + "We are working on it."; `review` → a "See your invitation" link to `portalRoutes.preview(invitation.id)` + `ReviewForm` slot; `delivered` → `LiveLink` with `${SITE_URL}/i/${slug}`; `pending_payment` → "Awaiting payment" + a WhatsApp link carrying the reference. Two orders render two panels with their own references (Review Focus 5).
  - Checklist shows only while the order is before `review`, ticked by `checklistProgress` with the invitation's design schema (`getTemplateEntry(templateSlug).schema`); no invitation yet → no checklist.
  - Guest list card: tier `basic` → `LockedCard` with [Upgrade] = `whatsappLink(\`Hi, I would like to upgrade order ${reference} to Managed.\`)`; other tiers → "Your guest list opens here soon." placeholder (Phase 4).
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement.** `LiveLink` (`'use client'`): read-only field, Copy (clipboard API, "Copied" for 2s), "Share on WhatsApp" = `https://wa.me/?text=` + the link. Server components everywhere else.
- [ ] **Step 4: Run**, expected PASS.
- [ ] **Step 5: Commit** `feat(portal): dashboard by order stage`.

---

### Task 8: Review, preview and approval

**Files:**
- Create: `components/invitation/DraftRender.tsx`, `app/portal/preview/[id]/page.tsx`, `lib/portal/review-actions.ts`, `components/portal/ReviewForm.tsx`
- Modify: `app/admin/preview/[id]/page.tsx` (use `DraftRender`)
- Test: `tests/lib/portal/review-actions.test.ts`, `tests/components/portal/review-form.test.tsx`, existing `tests/app/preview.test.tsx`

**Interfaces:**
- Produces: `DraftRender({ templateSlug, content, theme, entitlements }: { templateSlug: string; content: unknown; theme: unknown; entitlements: unknown })`: the admin preview's body (schema `safeParse`, incomplete-content message, `TemplateRenderer`), moved verbatim. The portal's incomplete message: "Your invitation is still being set. Check back soon."; pass it as `incompleteMessage: string`.
- Produces: `submitReview(prev, fd): Promise<ActionResult>` reading `invitationId`, `decision` (`z.enum(['approved', 'changes_requested'])`), `note` (max 1000; required, min 1, when requesting changes: `'Tell us what to change.'`).

- [ ] **Step 1: Failing tests:**
  - `'approving inserts the current content as the snapshot'`: reads `invitations.select('id, content')` as the user, inserts `{ invitation_id, decision, note, content_snapshot: content }` (no `on_behalf`, no `created_by`; the column default and the policy cover both).
  - `'an RLS refusal reads as the draft changing'` (insert error code `42501`) → `'This draft just changed. Reload to see the latest.'` (Review Focus 4).
  - `'changes without a note is refused'`.
  - `ReviewForm`: two buttons; "Request changes" reveals the note field; after success shows "Thank you. We have your approval." or "Thank you. We will be in touch on WhatsApp." The latest decision, if any, shows above the buttons.
  - Portal preview page: `requireClient()`; an invitation the user cannot read (RLS returns null) → `notFound()`.
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement**; `revalidatePath(ROUTES.PORTAL)` and the admin invitation path after a decision.
- [ ] **Step 4: Run** `pnpm vitest run tests/lib/portal tests/components/portal tests/app/preview.test.tsx`, expected PASS.
- [ ] **Step 5: Commit** `feat(portal): review and approve the draft`.

---

### Task 9: Client settings

**Files:**
- Create: `app/portal/(gated)/settings/page.tsx`, `lib/auth/portal-actions.ts` (+ `changeClientPassword`)
- Test: `tests/lib/auth/portal-actions.test.ts`

**Interfaces:**
- Consumes: `changePasswordAs` (Task 2), `requireClient`.
- Produces: `changeClientPassword(prev, fd): Promise<ActionResult>` = `requireClient()` + `changePasswordAs`.

- [ ] **Step 1: Failing test:** `'changeClientPassword requires a client and delegates'`.
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement.** The page reuses the admin settings form component if it is shared (read `app/admin/(gated)/settings/page.tsx`; lift the form to `components/auth/ChangePasswordForm.tsx` taking the action as a prop). Details panel: name, email, phone, read-only, with "To change these, message us on WhatsApp."
- [ ] **Step 4: Run**, expected PASS.
- [ ] **Step 5: Commit** `feat(portal): settings`.

---

### Task 10: Verify and stage docs

- [ ] **Step 1:** `pnpm lint && pnpm typecheck && pnpm test`. Expected: all green.
- [ ] **Step 2: Manual run** (`run` skill) with the built-in Supabase sender (a few emails an hour is enough): create a test client, mark an order paid, Invite, open the email, set a password, see the dashboard; move the order to review in admin, approve from the portal, publish from admin, see the live link. Then delete the test client and confirm the auth user is gone.
- [ ] **Step 3:** Write to `STAGING_CHANGES.md`: portal layout map and client islands, the four traces (invite, accept, review, reset), 0008 policies, the rulings above, Known gaps updates (SMTP and templates still open; Playwright deferred; the "Lin has one frame" gap is resolved, 148 frames ship).
- [ ] **Step 4: Commit** `chore: phase 3 verification`.
