# Portal Phase 4: Guest RSVP and Guest List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest opens a live invitation, replies (coming or not, how many, a note), and the reply is stored. The couple sees a live guest list with a headcount in their portal and can export it as CSV; the operator sees the same list in admin.

**Architecture:** Guests are anonymous, so the write goes through a Server Action with the service-role client (anon gets no INSERT; migration 0004's seal stands). The action is addressed by the invitation's public slug, never its id, and refuses anything not published or not entitled to RSVP. Reading is RLS-first: a new client policy lets a couple read their own replies only when their invitation's entitlements include `rsvp`. Each design keeps its own form markup; one shared hook carries the behaviour, and a form only submits on the live guest page. Every preview says it is a preview.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase (`@supabase/ssr`, service role in `lib/supabase/admin.ts`), zod 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-05-guest-rsvp-design.md` (write path, states, tests), as amended by `docs/superpowers/specs/2026-09-29-client-portal-design.md` section 08 (shared RSVP behaviour placed by each design; guest list in portal through the `rsvps` client policy and in admin under the invitation) and section 05 (`guests/export` CSV, entitled only).

## Global Constraints

- Read `node_modules/next/dist/docs/` for any Next API (Server Actions, Route Handlers) before using it.
- `any` forbidden; `unknown` instead. pnpm only. zod at every boundary.
- Server actions return a discriminated result and never throw to a guest's form.
- Only `lib/supabase/admin.ts` reads the service-role key. Anon gains no privilege on any table.
- Append-only migrations, applied live to "Reve website" (zwsvixzonkqaksfnemgh) with `apply_migration`, then `generate_typescript_types` and `get_advisors`.
- `lib/routes.ts` stays import-free (next.config imports it).
- No magic strings; no mid-sentence em-dashes in guest or client copy.
- `app/(store)/page.tsx` holds the owner's uncommitted change: never stage it. Stage by explicit path.
- Every task ends with `pnpm lint && pnpm typecheck && pnpm test` green; Task 7 also runs `pnpm build`.

## Rulings (decided here)

1. **Open form, no guest tokens** (spec 02). `rsvps.guest_id` stays the seam.
2. **A reply is only sent from the live page.** Templates take `rsvpSlug: string | null`. Only `app/i/[slug]/page.tsx` passes the slug; the store demo, the thumbnails, the admin preview and the client preview pass null, and the form then says "This is a preview. Replies are sent from the live invitation." without writing.
3. **The RSVP section renders only when `entitlements.rsvp` is true** (spec 05). Basic invitations show no form.
4. **Duplicates are kept, the latest counts.** Every submission is stored. The guest list groups replies by normalised name (trimmed, case-folded, inner spaces collapsed) and counts only each guest's latest reply; the full history stays in the table.
5. **A decline forces `party_size` to 1** server-side (spec 06), and the DB enforces it.
6. **Bounds:** name 1 to 80 characters; party size 1 to 10; dietary note and message up to 500 each. Enforced by zod and by DB checks.
7. **Bot protection is a honeypot only** until Cloudflare keys exist: a hidden `company` field; a filled one returns success without writing. Turnstile and rate limiting stay a known gap.
8. **The guest list updates live**: `rsvps` joins the Realtime publication and both lists mount `LiveRefresh` with it.
9. **No notification emails.** Those come with the Resend work after this phase.

## Review Focus

1. **A preview must never write.** Submitting in the store demo, the admin preview or the client preview stores nothing. Test in Task 3.
2. **A guest of one invitation can never write to another** (slug-addressed, and an unpublished or unentitled invitation is refused). Test in Task 2.
3. **A couple can never read another couple's replies, and a Basic couple reads none.** SQL check in Task 1.
4. **A guest who replies twice is counted once**, by the latest reply. Test in Task 4.
5. **CSV export is safe in Excel**: a name starting `=`, `+`, `-` or `@` is neutralised, and commas, quotes and newlines are escaped. Test in Task 4.

---

## File Structure

```
supabase/migrations/0012_rsvp.sql               checks, client read policy, realtime
lib/schemas/rsvp.ts                             rsvpSubmissionSchema, bounds
lib/rsvp/submit.ts                              submitRsvp ('use server')
lib/rsvp/guest-list.ts                          summarise replies (pure)
lib/rsvp/csv.ts                                 toGuestCsv (pure)
lib/rsvp/read.ts                                getGuestList(invitationId) via RLS
components/invitation/rsvp.ts                   copy + useRsvpSubmit hook (shared)
components/invitation/registry.tsx              TemplateProps gains rsvpSlug
components/invitation/TemplateRenderer.tsx      passes rsvpSlug
components/invitation/templates/{lin,jardin}/   RsvpForm uses the hook; section gated
app/i/[slug]/page.tsx                           passes the slug
components/GuestList.tsx                        shared table + headcount (server)
app/portal/(gated)/page.tsx + OrderPanel        guest list card for entitled orders
app/portal/guests/[id]/export/route.ts          CSV, client + entitled only
app/admin/(gated)/invitations/[id]/page.tsx     guest list section
app/admin/invitations/[id]/export/route.ts      CSV, admin only
lib/routes.ts                                   export route builders
```

---

### Task 1: Migration 0012

**Files:** Create `supabase/migrations/0012_rsvp.sql`; regenerate `lib/supabase/database.types.ts`.

**Interfaces:** Produces `private.can_read_rsvps(p_invitation_id uuid) returns boolean` (security definer, `search_path = ''`, execute to authenticated only): `private.owns_invitation(id)` AND the invitation's `entitlements->>'rsvp' = 'true'`.

- [ ] **Step 1: Write the migration.**
  - Checks on `public.rsvps`: `length(btrim(name)) between 1 and 80`, `party_size between 1 and 10`, `attending or party_size = 1`, `dietary_notes` and `message` null or `length <= 500`. Use `not valid` then `validate constraint` only if existing rows could fail; there are none expected (check first with a count).
  - Policy `"rsvps client read own"`: select to authenticated using `private.can_read_rsvps(invitation_id)`.
  - `alter publication supabase_realtime add table public.rsvps` (guarded, as in 0011).
  - Revoke truncate, trigger, references on `rsvps` and `guests` from authenticated.
  - No anon grant of any kind; no client insert, update or delete.
- [ ] **Step 2: Apply live, regenerate types, run advisors.** Expected: no new advisor findings.
- [ ] **Step 3: SQL check in one transaction, rolled back:** two clients, A (Managed, entitled) and B. A reads A's replies only; a Basic client (rsvp false) reads none; anon reads none; inserting a decline with party_size 3 fails the check.
- [ ] **Step 4: Commit** `feat(db): rsvp checks, couple read policy, live replies`.

### Task 2: The write path

**Files:** Create `lib/schemas/rsvp.ts`, `lib/rsvp/submit.ts`. Test `tests/lib/rsvp/submit.test.ts`, `tests/lib/schemas/rsvp.test.ts`.

**Interfaces:**
- `RSVP_LIMITS = { NAME_MAX: 80, PARTY_MAX: 10, NOTE_MAX: 500 }`.
- `rsvpSubmissionSchema`: `{ slug, name, attending: boolean (from 'yes'|'no'), partySize: coerce int, dietaryNotes?, message?, company? }`.
- `submitRsvp(prev: RsvpResult | null, formData: FormData): Promise<RsvpResult>` with `RsvpResult = { ok: true; attending: boolean } | { ok: false; message: string }`.

- [ ] **Step 1: Failing tests:** schema rejects empty name, party 0, party 11, an 81-character name; a decline normalises party to 1; honeypot filled returns `{ ok: true }` with no insert; unknown slug, unpublished invitation, and `entitlements.rsvp` false are each refused with `'Replies are not open for this invitation.'`; a valid reply inserts `{ invitation_id, name, attending, party_size, dietary_notes, message }` (trimmed, empty strings as null); a DB error returns `'We could not send your reply. Please try again.'` and never throws.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with `createAdminClient()`: read `invitations` (id, status, entitlements) by slug, require `status = 'published'` and `entitlementsSchema.parse(...).rsvp`, insert into `rsvps`.
- [ ] **Step 4: Run, expect PASS. Commit** `feat(rsvp): guests can reply to a live invitation`.

### Task 3: Templates send replies

**Files:** Modify `components/invitation/registry.tsx` (`TemplateProps.rsvpSlug: string | null`), `components/invitation/TemplateRenderer.tsx`, `app/i/[slug]/page.tsx`, every other `TemplateRenderer` / template call site (pass `null`), `components/invitation/rsvp.ts` (shared copy + `useRsvpSubmit(rsvpSlug)`), `components/invitation/templates/lin/{index.tsx,RsvpForm.tsx}`, `components/invitation/templates/jardin/{index.tsx,RsvpForm.tsx}`. Test `tests/components/invitation/rsvp-form.test.tsx`.

**Interfaces:** `useRsvpSubmit(rsvpSlug: string | null)` returns `{ state: 'idle' | 'sending' | 'sent' | 'preview' | 'error', message: string | null, attending: boolean | null, submit(formData: FormData): void }`. With a null slug, `submit` sets `'preview'` and never calls the action.

- [ ] **Step 1: Failing tests:** with a null slug, submitting never calls `submitRsvp` and shows the preview line; with a slug, it calls `submitRsvp` with the form data plus the slug and replaces the form with the confirmation ("Thank you, we have your reply." for yes, "Thank you for letting us know." for no); a refused result shows its message and keeps what was typed; the party-size control appears only when "Yes" is chosen; the section is absent when `entitlements.rsvp` is false.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Each design keeps its markup and palette, adds: party size (1 to 10, shown for Yes), dietary note (shown for Yes), message, and the hidden `company` honeypot (`tabIndex={-1}`, `autoComplete="off"`, visually hidden). The confirmation is a line in the design's own type, not an alert. Remove the old `RSVP_NOT_OPEN` copy.
- [ ] **Step 4: Run, expect PASS. Commit** `feat(invitation): the reply card sends from the live page`.

### Task 4: Guest list logic and CSV

**Files:** Create `lib/rsvp/guest-list.ts`, `lib/rsvp/csv.ts`. Tests `tests/lib/rsvp/guest-list.test.ts`, `tests/lib/rsvp/csv.test.ts`.

**Interfaces:**
- `summariseReplies(rows: RsvpRow[]): { guests: GuestReply[]; coming: number; declined: number; replies: number }` where `GuestReply = { name, attending, partySize, dietaryNotes, message, repliedAt, earlierReplies: number }`. Latest per normalised name; `coming` sums party sizes of attending guests; `declined` counts guests; sorted by name.
- `toGuestCsv(guests: GuestReply[]): string`: header `Name,Coming,Guests,Dietary notes,Message,Replied at`; CRLF line endings; UTF-8 BOM so Excel reads Arabic names; fields quoted when they contain `,` `"` or a newline; a cell starting `=` `+` `-` `@` gets a leading `'`.

- [ ] **Step 1: Failing tests** for: two replies from "Maya Haddad" and " maya  haddad" count once, latest wins, `earlierReplies` 1; headcount sums party sizes of Yes only; CSV escaping, injection guard, BOM, Arabic name round-trip.
- [ ] **Step 2: Run, FAIL. Step 3: Implement. Step 4: PASS. Commit** `feat(rsvp): guest list summary and CSV`.

### Task 5: The couple's guest list

**Files:** Create `lib/rsvp/read.ts` (`getGuestList(invitationId)` via the user's cookie client, RLS-scoped, returns `summariseReplies` output), `components/GuestList.tsx` (server: headcount tiles "Coming", "Not coming", "Replies"; table Name / Coming / Guests / Notes; empty state "No replies yet. They appear here as guests answer."), `app/portal/guests/[id]/export/route.ts`. Modify `components/portal/OrderPanel.tsx` (entitled orders with an invitation show `GuestList` + "Download CSV"; Basic keeps `LockedCard`; an entitled order without an invitation keeps "Your guest list opens here soon."), `app/portal/(gated)/page.tsx` (`LiveRefresh` adds `rsvps`), `lib/routes.ts` (`portalRoutes.guestsExport(id)`).

- [ ] **Step 1: Failing tests:** the panel shows the list for Managed and the locked card for Basic; the export route requires a client (`requireClient`), returns 404 for an invitation the client cannot read or that is not entitled, and returns `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="guests-<slug>.csv"`.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS. Commit** `feat(portal): the couple's live guest list and export`.

### Task 6: The operator's guest list

**Files:** Modify `app/admin/(gated)/invitations/[id]/page.tsx` (a "Guests" section with `GuestList`; `LiveRefresh` adds `rsvps`), create `app/admin/invitations/[id]/export/route.ts` (`requireAdmin`), `lib/routes.ts` (`adminRoutes.guestsExport(id)`). Reads through the admin's cookie client (admin RLS).

- [ ] **Step 1: Failing tests:** route requires admin; returns the CSV for any invitation; 404 for an unknown id.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS. Commit** `feat(admin): guest list and export per invitation`.

### Task 7: Verify and docs

- [ ] **Step 1:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- [ ] **Step 2: Live run** on the user's dev server (http://localhost:3000) with the test client (`test.couple@example.com` / `ReveTest-2026`, invitation `/i/test-couple`, published, Managed): reply Yes with 3 guests, reply again as the same name with No, see the portal list update live to one guest declined, download the CSV, confirm the store demo's form says preview and stores nothing (row count unchanged).
- [ ] **Step 3: Docs:** fold the layout, traces, 0012 policy and rulings into `ARCHITECTURE.md`; remove "Guest RSVP forms do not submit yet" and the Phase 4 known gap; add the honeypot-only and no-rate-limit gaps.
- [ ] **Step 4: Commit** `docs: guest RSVP in ARCHITECTURE.md`.
