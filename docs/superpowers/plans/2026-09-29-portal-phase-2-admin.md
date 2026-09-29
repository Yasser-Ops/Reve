# Portal Phase 2 — Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The operator can manage clients and their orders, move each order through its stages, build the client's invitation as JSON with a live preview and uploaded media, record the client's approval, publish it to its link, and upgrade a tier.

**Architecture:** One migration repairs the admin RLS (the helper moves to `private.is_admin()`), drops the `templates` table, adds `clients` and `invitation_reviews`, reshapes `orders`, and creates the `invitation-media` bucket. Every admin read and write runs as the signed-in admin through the cookie client, so RLS is the second wall behind `requireAdmin()`. Pure rules (status moves, upgrades, slugs, content checks, the publish guard) live in small tested modules; server actions compose them. Uploads go browser to Storage through signed URLs, because server actions are capped at 1 MB.

**Tech Stack:** Next.js 16.3 App Router, React 19 (`useActionState`), TypeScript strict, zod 4, `@supabase/ssr` + `@supabase/supabase-js`, Supabase Storage, shadcn/ui (base-nova), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-client-portal-design.md` (Phase 2; sections 01, 03 including "Admin RLS repair", 04, 05, 06 "Operator builds and delivers" and "Upgrade", 09). The client invite is Phase 3 (spec 03, amended).

## Global Constraints

- `pnpm` only. TypeScript strict; `any` forbidden, use `unknown`; no `as` casts where zod or inference can type the value (`toJson` in Task 3 exists for exactly this).
- Every server action begins with `await requireAdmin()` (from `@/lib/auth/guards`), parses input with zod, and returns `ActionResult` instead of throwing for expected failures. `redirect()` is never wrapped in try/catch.
- Every admin page calls `requireAdmin()` itself, not only its layout.
- Admin reads and writes use `createClient()` from `@/lib/supabase/server` (the admin's own session). The service-role key is not used in this phase.
- No magic strings: routes via `ROUTES`/`adminRoutes`, statuses via `ORDER_STATUS`, bucket via `MEDIA_BUCKET`.
- Human-facing copy has no mid-sentence em-dashes (—).
- Schema changes only through an append-only migration file created with the `nextjs-supabase-kit:supabase-migration` skill; regenerate `lib/supabase/database.types.ts` after it.
- shadcn primitives only via `pnpm dlx shadcn@latest add <name>`. NEVER run `shadcn init` again: it rewrites `app/globals.css` and `app/layout.tsx`.
- New route segments via `nextjs-supabase-kit:scaffold-route`; new actions via `nextjs-supabase-kit:server-action`, then matched to the code here.
- `ARCHITECTURE.md` and `CLAUDE.md` are read-only; notes go to `STAGING_CHANGES.md` (untracked).
- A task is done when `pnpm lint && pnpm typecheck && pnpm test` passes.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The operator edits content after the client approved, then publishes:** refused as "content changed since approval", never published unapproved. Pinned in Task 3 (guard) and Task 9 (action).
2. **Search text carrying PostgREST filter syntax** (`maya,email.neq.x`, parentheses, `*`, `%`): must not error or widen the query. Pinned in Task 4.
3. **The same email twice in a different case** (`Maya@Gmail.com` then `maya@gmail.com`): the second is refused with a readable message, not a raw database error. Pinned in Task 4.
4. **Moving an order to review with no invitation, or with content its design rejects:** refused with a message saying why. Pinned in Task 6.
5. **Two clients with the same name provisioned** (two "Maya Haddad"): the second gets `maya-haddad-2`, not a unique-violation error. Pinned in Task 3 (`withSuffix`) and Task 7 (action).

---

## File Structure

```
supabase/migrations/0005_admin_pipeline.sql    RLS repair, clients, orders, reviews, storage
lib/supabase/database.types.ts                 regenerated
lib/supabase/client.ts                         browser client (uploads only)
lib/env.ts                                     + getPublicEnv()
lib/routes.ts                                  + adminRoutes
lib/offer.ts                                   DELIVERY gains hours: 48
lib/orders/status.ts                           ORDER_STATUS, flows, allowedMoves, labels
lib/orders/upgrade.ts                          planUpgrade
lib/invitations/slug.ts                        slugSchema, proposeSlug, withSuffix
lib/invitations/content.ts                     checkContent, ContentIssue, toJson
lib/invitations/publish-guard.ts               canPublish, sameContent
lib/admin/action-result.ts                     ActionResult
lib/admin/clients.ts                           listClients, getClient, searchPattern (reads)
lib/admin/client-actions.ts                    createClientWithOrder, updateClient, addOrder
lib/admin/order-actions.ts                     moveOrder, applyUpgrade, provisionInvitation
lib/admin/invitations.ts                       getInvitationForEditor (read)
lib/admin/invitation-actions.ts                saveContent, updateSlug, approveOnBehalf, publishInvitation
lib/admin/media-paths.ts                       MEDIA_BUCKET, MEDIA_KINDS, mediaPath, allowedTypes
lib/admin/media.ts                             listMedia (read)
lib/admin/media-actions.ts                     createUploadUrl
components/admin/AppSurface.tsx                data-surface wrapper
components/admin/ActionForm.tsx                [CLIENT] the one generic action form
components/admin/StatusBadge.tsx
components/admin/ContentEditor.tsx             [CLIENT]
components/admin/CopyChecklist.tsx             [CLIENT]
components/admin/MediaUploader.tsx             [CLIENT]
app/admin/layout.tsx                           metadata only (surface moves down)
app/admin/error.tsx, not-found.tsx             wrap AppSurface
app/admin/login/page.tsx                       wrap AppSurface
app/admin/(gated)/layout.tsx                   wrap AppSurface
app/admin/(gated)/page.tsx                     client list
app/admin/(gated)/clients/new/page.tsx
app/admin/(gated)/clients/[id]/page.tsx
app/admin/(gated)/invitations/[id]/page.tsx    editor
app/admin/preview/[id]/page.tsx                bare draft render (NO surface)
scripts/optimize-images.mjs                    optional folder argument
tests/helpers/fake-supabase.ts                 chainable fake for action tests
```

---

### Task 1: Migration 0005 — admin RLS repair and the pipeline tables

**Files:**
- Create: `supabase/migrations/0005_admin_pipeline.sql`
- Modify: `lib/supabase/database.types.ts` (regenerated)
- Modify: `lib/constants.ts` (no change expected; confirm `TIERS` still matches the `tier` enum)

**Interfaces:**
- Produces (database): `private.is_admin()`; tables `clients`, `invitation_reviews`; enum `review_decision`; `order_status` gains `brief`, `concept`; `orders.client_id`, `orders.due_at`, `orders.reference` default `RV-0001`…; `invitations.order_id` unique; bucket `invitation-media`. Removes `templates`, `template_status`, `public.is_admin()`, `orders.customer_*`, `orders.template_slug`, `invitations.manage_token_hash`.
- Produces (types): `Database['public']['Enums']['order_status']` including `'brief' | 'concept'`; `Database['public']['Enums']['review_decision']`.

- [ ] **Step 1: Write the RLS failure down as the test**

Run with the Supabase MCP `execute_sql` on project `zwsvixzonkqaksfnemgh`:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d5bef384-f0d0-4f4d-86e1-f848cf3bd4c1","role":"authenticated"}';
select count(*) from orders;
rollback;
```
Expected: ERROR `permission denied for function is_admin`. (`d5bef384…` is the operator's admin user, created 2026-09-29.)

- [ ] **Step 2: Write the migration**

Invoke `nextjs-supabase-kit:supabase-migration` and have it create `supabase/migrations/0005_admin_pipeline.sql` with exactly this content, applied through the MCP `apply_migration` as `admin_pipeline`:

```sql
-- 0005 — Admin pipeline.
--
-- 1. Repairs admin RLS. 0003 revoked EXECUTE on public.is_admin() from
--    `authenticated`, and a policy expression runs with the caller's
--    privileges, so every admin policy failed with "permission denied for
--    function is_admin". 0004 revoked ALL on invitations from `authenticated`.
--    The helper moves to a schema PostgREST does not expose: callable by
--    policies, still not callable over the API.
-- 2. Drops `templates`: the code registry is the one source of truth.
-- 3. Adds clients and invitation_reviews, reshapes orders, adds media storage.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_admin() returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy "orders admin all" on public.orders;
drop policy "invitations admin all" on public.invitations;
drop policy "guests admin all" on public.guests;
drop policy "rsvps admin all" on public.rsvps;
drop policy "custom_leads admin all" on public.custom_leads;

-- Seed data only (verified 2026-09-29): order RV-0001 and its invitation on
-- the deleted cap-blanc design. Deleted, not carried: the new NOT NULL
-- client_id below fails loudly if anything else exists.
delete from public.invitations where slug = 'sarah-and-amine';
delete from public.orders where reference = 'RV-0001';

alter table public.invitations drop constraint invitations_template_slug_fkey;
alter table public.orders drop constraint orders_template_slug_fkey;
drop table public.templates;
drop type public.template_status;
drop function public.is_admin();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null unique check (email = lower(email)),
  phone text not null check (length(trim(phone)) > 0),
  notes text not null default '',
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders
  drop column customer_name,
  drop column customer_phone,
  drop column customer_email,
  drop column template_slug,
  add column client_id uuid not null references public.clients(id) on delete restrict,
  add column due_at timestamptz;

create sequence public.order_reference_seq;
grant usage, select on sequence public.order_reference_seq to authenticated;
alter table public.orders
  alter column reference set default
    'RV-' || lpad(nextval('public.order_reference_seq')::text, 4, '0');

create index orders_client_idx on public.orders (client_id, created_at desc);

alter type public.order_status add value 'brief' after 'paid';
alter type public.order_status add value 'concept' after 'brief';

alter table public.invitations
  drop column manage_token_hash,
  add constraint invitations_order_unique unique (order_id);

create type public.review_decision as enum ('approved', 'changes_requested');

create table public.invitation_reviews (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  decision public.review_decision not null,
  note text not null default '',
  content_snapshot jsonb not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  on_behalf boolean not null default false,
  created_at timestamptz not null default now()
);

create index invitation_reviews_invitation_idx
  on public.invitation_reviews (invitation_id, created_at desc);

alter table public.clients enable row level security;
alter table public.invitation_reviews enable row level security;

-- 0004 revoked everything on invitations from authenticated. Grant it back:
-- RLS now decides what a signed-in user sees. anon stays at zero, and
-- published_invitations remains the only public window.
grant select, insert, update, delete on public.invitations to authenticated;

create policy "clients admin all" on public.clients
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "orders admin all" on public.orders
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "invitations admin all" on public.invitations
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "invitation_reviews admin all" on public.invitation_reviews
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "guests admin all" on public.guests
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "rsvps admin all" on public.rsvps
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "custom_leads admin all" on public.custom_leads
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Media. Public read: every file ends up on a public invitation, and the
-- invitation-id prefix keeps drafts unguessable. The bucket itself refuses
-- anything but WebP and MP4 (rasters are converted before upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invitation-media', 'invitation-media', true, 52428800,
        array['image/webp', 'video/mp4'])
on conflict (id) do nothing;

create policy "invitation-media admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'invitation-media' and private.is_admin());
create policy "invitation-media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invitation-media' and private.is_admin());
create policy "invitation-media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'invitation-media' and private.is_admin())
  with check (bucket_id = 'invitation-media' and private.is_admin());
create policy "invitation-media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'invitation-media' and private.is_admin());
```

- [ ] **Step 3: Verify the repair and the walls**

Run each with `execute_sql`:

```sql
-- admin sees rows (counts, not an error)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"d5bef384-f0d0-4f4d-86e1-f848cf3bd4c1","role":"authenticated"}';
select (select count(*) from orders) o, (select count(*) from invitations) i,
       (select count(*) from clients) c, (select count(*) from invitation_reviews) r;
rollback;
```
Expected: one row of counts (all 0), no error.

```sql
-- a signed-in stranger sees nothing and cannot write
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select (select count(*) from clients) c, (select count(*) from invitations) i;
insert into clients (full_name, email, phone) values ('x', 'x@example.com', '1');
rollback;
```
Expected: counts 0, then ERROR `new row violates row-level security policy for table "clients"`.

```sql
-- anon: no table access, helper not callable
begin; set local role anon; select count(*) from invitations; rollback;
```
Expected: ERROR `permission denied for table invitations`.

```sql
begin; set local role anon; select private.is_admin(); rollback;
```
Expected: ERROR `permission denied for schema private`.

- [ ] **Step 4: Regenerate types**

MCP `generate_typescript_types` for the project; write the output verbatim to `lib/supabase/database.types.ts`.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: pass. `lib/auth/admin-membership.ts` reads `admin_users`, which is unchanged.

Run the MCP `get_advisors` (security). Expected: the known `security_definer_view` on `published_invitations` only. Report anything new.

```bash
git add supabase/migrations/0005_admin_pipeline.sql lib/supabase/database.types.ts
git commit -m "feat: repair admin RLS and add clients, reviews and media storage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Order rules — stages, moves, labels and upgrades

**Files:**
- Create: `lib/orders/status.ts`, `lib/orders/upgrade.ts`
- Modify: `lib/offer.ts` (`DELIVERY.hours`)
- Test: `tests/lib/orders/status.test.ts`, `tests/lib/orders/upgrade.test.ts`

**Interfaces:**
- Consumes: `TIERS`, `Tier` (`@/lib/constants`); `entitlementsForTier` (`@/lib/entitlements`); `Database` enums.
- Produces: `type OrderStatus`; `ORDER_STATUS`; `flowFor(tier: Tier): readonly OrderStatus[]`; `allowedMoves(tier: Tier, from: OrderStatus): OrderStatus[]`; `canMove(tier, from, to): boolean`; `hasReached(tier, status, target): boolean`; `STATUS_LABELS: Record<OrderStatus, { admin: string; client: string }>`; `planUpgrade(current: Tier, target: Tier): { tier: Tier; entitlements: Entitlements } | null`; `upgradeTargets(current: Tier): Tier[]`; `DELIVERY.hours: 48`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/orders/status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TIERS } from '@/lib/constants';
import {
  ORDER_STATUS,
  STATUS_LABELS,
  allowedMoves,
  canMove,
  flowFor,
  hasReached,
} from '@/lib/orders/status';

describe('order stages', () => {
  it('runs a ready-drawn design straight into design once paid', () => {
    expect(flowFor(TIERS.MANAGED)).toEqual([
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PAID,
      ORDER_STATUS.IN_DESIGN,
      ORDER_STATUS.REVIEW,
      ORDER_STATUS.DELIVERED,
    ]);
  });

  it('gives Custom its brief and concept stages', () => {
    expect(flowFor(TIERS.CUSTOM)).toEqual([
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.PAID,
      ORDER_STATUS.BRIEF,
      ORDER_STATUS.CONCEPT,
      ORDER_STATUS.IN_DESIGN,
      ORDER_STATUS.REVIEW,
      ORDER_STATUS.DELIVERED,
    ]);
  });

  it('moves one stage forward or back, or cancels', () => {
    expect(allowedMoves(TIERS.BASIC, ORDER_STATUS.PAID)).toEqual([
      ORDER_STATUS.IN_DESIGN,
      ORDER_STATUS.PENDING_PAYMENT,
      ORDER_STATUS.CANCELLED,
    ]);
  });

  /* Delivery is what publishing does. A button that skipped the publish
     guard would ship an unapproved invitation. */
  it('never moves to delivered directly', () => {
    expect(allowedMoves(TIERS.MANAGED, ORDER_STATUS.REVIEW)).not.toContain(
      ORDER_STATUS.DELIVERED,
    );
    expect(canMove(TIERS.MANAGED, ORDER_STATUS.REVIEW, ORDER_STATUS.DELIVERED)).toBe(false);
  });

  it('refuses a Custom stage on a ready-drawn order', () => {
    expect(canMove(TIERS.BASIC, ORDER_STATUS.PAID, ORDER_STATUS.BRIEF)).toBe(false);
  });

  it('ends at delivered and cancelled', () => {
    expect(allowedMoves(TIERS.BASIC, ORDER_STATUS.DELIVERED)).toEqual([]);
    expect(allowedMoves(TIERS.BASIC, ORDER_STATUS.CANCELLED)).toEqual([]);
  });

  it('knows whether an order has been paid for', () => {
    expect(hasReached(TIERS.BASIC, ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PAID)).toBe(false);
    expect(hasReached(TIERS.BASIC, ORDER_STATUS.REVIEW, ORDER_STATUS.PAID)).toBe(true);
    expect(hasReached(TIERS.BASIC, ORDER_STATUS.CANCELLED, ORDER_STATUS.PAID)).toBe(false);
  });

  it('labels every stage for both audiences, without em-dashes', () => {
    for (const status of Object.values(ORDER_STATUS)) {
      expect(STATUS_LABELS[status].admin.length).toBeGreaterThan(0);
      expect(STATUS_LABELS[status].client).not.toContain('—');
    }
  });
});
```

`tests/lib/orders/upgrade.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TIERS } from '@/lib/constants';
import { planUpgrade, upgradeTargets } from '@/lib/orders/upgrade';

describe('upgrades', () => {
  it('offers only higher tiers', () => {
    expect(upgradeTargets(TIERS.BASIC)).toEqual([TIERS.MANAGED, TIERS.CUSTOM]);
    expect(upgradeTargets(TIERS.CUSTOM)).toEqual([]);
  });

  it('switches RSVP on when Basic becomes Managed', () => {
    expect(planUpgrade(TIERS.BASIC, TIERS.MANAGED)).toEqual({
      tier: TIERS.MANAGED,
      entitlements: { rsvp: true, portal: true, gallery: true },
    });
  });

  it('refuses a downgrade or a sideways move', () => {
    expect(planUpgrade(TIERS.MANAGED, TIERS.BASIC)).toBeNull();
    expect(planUpgrade(TIERS.MANAGED, TIERS.MANAGED)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run tests/lib/orders`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement `lib/orders/status.ts`**

```ts
import { TIERS, type Tier } from '@/lib/constants';
import type { Database } from '@/lib/supabase/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  BRIEF: 'brief',
  CONCEPT: 'concept',
  IN_DESIGN: 'in_design',
  REVIEW: 'review',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, OrderStatus>;

const READY_DRAWN: readonly OrderStatus[] = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.IN_DESIGN,
  ORDER_STATUS.REVIEW,
  ORDER_STATUS.DELIVERED,
];

/**
 * The stages an order passes through, per tier. Custom is a design drawn
 * from scratch, so it gathers a brief and shows a concept before design.
 */
const FLOWS: Record<Tier, readonly OrderStatus[]> = {
  [TIERS.BASIC]: READY_DRAWN,
  [TIERS.MANAGED]: READY_DRAWN,
  [TIERS.CUSTOM]: [
    ORDER_STATUS.PENDING_PAYMENT,
    ORDER_STATUS.PAID,
    ORDER_STATUS.BRIEF,
    ORDER_STATUS.CONCEPT,
    ORDER_STATUS.IN_DESIGN,
    ORDER_STATUS.REVIEW,
    ORDER_STATUS.DELIVERED,
  ],
};

export function flowFor(tier: Tier): readonly OrderStatus[] {
  return FLOWS[tier];
}

/**
 * Where an order may go next: one stage forward, one back, or cancelled.
 *
 * DELIVERED is never offered: an order is delivered by publishing its
 * invitation, which checks the client's approval first.
 */
export function allowedMoves(tier: Tier, from: OrderStatus): OrderStatus[] {
  if (from === ORDER_STATUS.DELIVERED || from === ORDER_STATUS.CANCELLED) return [];

  const flow = FLOWS[tier];
  const at = flow.indexOf(from);
  if (at === -1) return [ORDER_STATUS.CANCELLED];

  const moves: OrderStatus[] = [];
  const next = flow[at + 1];
  if (next && next !== ORDER_STATUS.DELIVERED) moves.push(next);
  const previous = flow[at - 1];
  if (previous) moves.push(previous);
  moves.push(ORDER_STATUS.CANCELLED);

  return moves;
}

export function canMove(tier: Tier, from: OrderStatus, to: OrderStatus): boolean {
  return allowedMoves(tier, from).includes(to);
}

/** Whether `status` is at or past `target` in the tier's flow. */
export function hasReached(tier: Tier, status: OrderStatus, target: OrderStatus): boolean {
  const flow = FLOWS[tier];
  const at = flow.indexOf(status);
  return at !== -1 && at >= flow.indexOf(target);
}

/** One wording per stage, so the admin and the portal cannot disagree. */
export const STATUS_LABELS: Record<OrderStatus, { admin: string; client: string }> = {
  pending_payment: { admin: 'Awaiting payment', client: 'Awaiting payment' },
  paid: { admin: 'Paid', client: 'Payment received' },
  brief: { admin: 'Brief', client: 'Gathering your brief' },
  concept: { admin: 'Concept', client: 'Drawing your concept' },
  in_design: { admin: 'In design', client: 'We are setting your invitation' },
  review: { admin: 'Awaiting approval', client: 'Ready for your approval' },
  delivered: { admin: 'Delivered', client: 'Live' },
  cancelled: { admin: 'Cancelled', client: 'Cancelled' },
};
```

- [ ] **Step 4: Implement `lib/orders/upgrade.ts`**

```ts
import { TIERS, type Tier } from '@/lib/constants';
import { entitlementsForTier } from '@/lib/entitlements';
import type { Entitlements } from '@/lib/schemas/invitation';

const RANK: Record<Tier, number> = {
  [TIERS.BASIC]: 0,
  [TIERS.MANAGED]: 1,
  [TIERS.CUSTOM]: 2,
};

export function upgradeTargets(current: Tier): Tier[] {
  return Object.values(TIERS).filter((tier) => RANK[tier] > RANK[current]);
}

/**
 * The one deliberate exception to "entitlements are a snapshot": a paid
 * upgrade re-resolves them, so Managed's RSVP switches on for an existing
 * Basic invitation. Downgrades do not exist.
 */
export function planUpgrade(
  current: Tier,
  target: Tier,
): { tier: Tier; entitlements: Entitlements } | null {
  if (RANK[target] <= RANK[current]) return null;
  return { tier: target, entitlements: entitlementsForTier(target) };
}
```

- [ ] **Step 5: Give the delivery promise a number**

In `lib/offer.ts`, add to `DELIVERY` (above `excludesTier`):

```ts
  /** The promise in hours; an order marked paid is due this long after. */
  hours: 48,
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm vitest run tests/lib/orders` → PASS (11 tests). Then `pnpm lint && pnpm typecheck && pnpm test`.

```bash
git add lib/orders lib/offer.ts tests/lib/orders
git commit -m "feat: define each tier's order stages, moves and upgrades

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Invitation rules — slugs, content checks and the publish guard

**Files:**
- Create: `lib/invitations/slug.ts`, `lib/invitations/content.ts`, `lib/invitations/publish-guard.ts`
- Test: `tests/lib/invitations/slug.test.ts`, `tests/lib/invitations/content.test.ts`, `tests/lib/invitations/publish-guard.test.ts`

**Interfaces:**
- Consumes: `getTemplateEntry` (registry); `Json` type.
- Produces: `slugSchema`; `proposeSlug(name: string): string`; `withSuffix(base: string, taken: ReadonlySet<string>): string`; `type ContentIssue = { path: string; message: string }`; `checkContent(templateSlug: string, raw: string): { ok: true; content: Json } | { ok: false; issues: ContentIssue[] }`; `toJson(value: unknown): Json`; `type LatestReview = { decision: 'approved' | 'changes_requested'; contentSnapshot: unknown } | null`; `PUBLISH_BLOCK`; `canPublish(content: unknown, latest: LatestReview): { ok: true } | { ok: false; reason: PublishBlock }`; `sameContent(a: unknown, b: unknown): boolean`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/invitations/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { proposeSlug, slugSchema, withSuffix } from '@/lib/invitations/slug';

describe('slugs', () => {
  it('proposes a link from a name', () => {
    expect(proposeSlug('Maya Haddad')).toBe('maya-haddad');
  });

  it('drops accents and punctuation', () => {
    expect(proposeSlug('  Rêve  & Élie!! ')).toBe('reve-elie');
  });

  /* An Arabic-only name has no Latin letters to keep. */
  it('falls back when nothing Latin survives', () => {
    expect(proposeSlug('مايا')).toBe('invitation');
  });

  /* Review Focus 5. */
  it('numbers a slug that is taken', () => {
    expect(withSuffix('maya-haddad', new Set())).toBe('maya-haddad');
    expect(withSuffix('maya-haddad', new Set(['maya-haddad']))).toBe('maya-haddad-2');
    expect(
      withSuffix('maya-haddad', new Set(['maya-haddad', 'maya-haddad-2'])),
    ).toBe('maya-haddad-3');
  });

  it('accepts only lowercase words joined by single hyphens', () => {
    expect(slugSchema.safeParse('maya-karim').success).toBe(true);
    expect(slugSchema.safeParse('Maya').success).toBe(false);
    expect(slugSchema.safeParse('maya--karim').success).toBe(false);
    expect(slugSchema.safeParse('ab').success).toBe(false);
  });
});
```

`tests/lib/invitations/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkContent } from '@/lib/invitations/content';

const valid = {
  coupleFirstName: 'Maya',
  couplePartnerName: 'Karim',
  initials: 'MK',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: { name: 'Villa Rosa', addressLine: 'Broumana' },
};

describe('checkContent', () => {
  it('accepts content its design can render, with defaults applied', () => {
    const result = checkContent('lin', JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.content).toMatchObject({ ...valid, schedule: [] });
  });

  it('reports text that is not JSON', () => {
    const result = checkContent('lin', '{ coupleFirstName: ');
    expect(result).toMatchObject({ ok: false, issues: [{ path: '' }] });
  });

  it('names the field that is wrong', () => {
    const result = checkContent('lin', JSON.stringify({ ...valid, initials: 'MAYAK' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.path)).toContain('initials');
  });

  it('refuses a design the registry does not have', () => {
    expect(checkContent('cap-blanc', JSON.stringify(valid))).toMatchObject({ ok: false });
  });
});
```

`tests/lib/invitations/publish-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PUBLISH_BLOCK, canPublish, sameContent } from '@/lib/invitations/publish-guard';

const content = { coupleFirstName: 'Maya', schedule: [{ time: '19:00', title: 'Dinner' }] };

describe('canPublish', () => {
  it('refuses an invitation nobody approved', () => {
    expect(canPublish(content, null)).toEqual({ ok: false, reason: PUBLISH_BLOCK.NO_APPROVAL });
  });

  it('refuses when the latest word was a request for changes', () => {
    expect(
      canPublish(content, { decision: 'changes_requested', contentSnapshot: content }),
    ).toEqual({ ok: false, reason: PUBLISH_BLOCK.CHANGES_REQUESTED });
  });

  /* Review Focus 1: approval covers exactly what the client saw. */
  it('refuses content edited after the approval', () => {
    const edited = { ...content, coupleFirstName: 'Mayya' };
    expect(canPublish(edited, { decision: 'approved', contentSnapshot: content })).toEqual({
      ok: false,
      reason: PUBLISH_BLOCK.CONTENT_CHANGED,
    });
  });

  it('allows exactly what was approved', () => {
    expect(canPublish(content, { decision: 'approved', contentSnapshot: content })).toEqual({
      ok: true,
    });
  });
});

describe('sameContent', () => {
  /* jsonb does not keep key order, so equality must not depend on it. */
  it('ignores key order', () => {
    expect(sameContent({ a: 1, b: [{ c: 2, d: 3 }] }, { b: [{ d: 3, c: 2 }], a: 1 })).toBe(true);
  });

  it('respects array order', () => {
    expect(sameContent([1, 2], [2, 1])).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run tests/lib/invitations/slug.test.ts tests/lib/invitations/content.test.ts tests/lib/invitations/publish-guard.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement `lib/invitations/slug.ts`**

```ts
import { z } from 'zod';

/** The invitation's own link: /i/<slug>. */
export const slugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens');

const FALLBACK = 'invitation';

/** A first proposal for the link, from a name. Editable until first publish. */
export function proposeSlug(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

  return slug.length >= 3 ? slug : FALLBACK;
}

/** `base`, or `base-2`, `base-3`… whichever is free. */
export function withSuffix(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Implement `lib/invitations/content.ts`**

```ts
import { z } from 'zod';
import { getTemplateEntry } from '@/components/invitation/registry';
import type { Json } from '@/lib/supabase/database.types';

export type ContentIssue = { path: string; message: string };

/**
 * A value as a jsonb column accepts it. Validated rather than asserted: a
 * design's parsed content is JSON by construction, and this proves it to the
 * type system without a cast.
 */
export function toJson(value: unknown): Json {
  return z.json().parse(value);
}

/**
 * The operator's JSON, checked against the design it is for. On success the
 * content comes back PARSED (defaults applied), which is what gets stored.
 */
export function checkContent(
  templateSlug: string,
  raw: string,
): { ok: true; content: Json } | { ok: false; issues: ContentIssue[] } {
  const design = getTemplateEntry(templateSlug);
  if (!design) {
    return { ok: false, issues: [{ path: '', message: `Unknown design "${templateSlug}"` }] };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unreadable';
    return { ok: false, issues: [{ path: '', message: `Not valid JSON: ${detail}` }] };
  }

  const parsed = design.schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  return { ok: true, content: toJson(parsed.data) };
}
```

- [ ] **Step 5: Implement `lib/invitations/publish-guard.ts`**

```ts
export const PUBLISH_BLOCK = {
  NO_APPROVAL: 'The client has not approved this invitation yet.',
  CHANGES_REQUESTED: 'The client asked for changes. Send it back for review once they are made.',
  CONTENT_CHANGED:
    'The content changed after the client approved it. Send it for review again, or record their approval of this version.',
} as const;

export type PublishBlock = (typeof PUBLISH_BLOCK)[keyof typeof PUBLISH_BLOCK];

export type LatestReview = {
  decision: 'approved' | 'changes_requested';
  contentSnapshot: unknown;
} | null;

/** Only exactly what the client approved may go live. */
export function canPublish(
  content: unknown,
  latest: LatestReview,
): { ok: true } | { ok: false; reason: PublishBlock } {
  if (!latest) return { ok: false, reason: PUBLISH_BLOCK.NO_APPROVAL };
  if (latest.decision !== 'approved') {
    return { ok: false, reason: PUBLISH_BLOCK.CHANGES_REQUESTED };
  }
  if (!sameContent(content, latest.contentSnapshot)) {
    return { ok: false, reason: PUBLISH_BLOCK.CONTENT_CHANGED };
  }
  return { ok: true };
}

/** Deep equality for JSON values, blind to object key order. */
export function sameContent(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
```

- [ ] **Step 6: Verify and commit**

Run the three test files → PASS (17 tests). Then `pnpm lint && pnpm typecheck && pnpm test`.

```bash
git add lib/invitations tests/lib/invitations
git commit -m "feat: add slug, content and publish rules for invitations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Clients — reads, actions and a test fake

**Files:**
- Create: `tests/helpers/fake-supabase.ts`
- Create: `lib/admin/action-result.ts`, `lib/admin/clients.ts`, `lib/admin/client-actions.ts`
- Modify: `lib/routes.ts` (`adminRoutes`)
- Test: `tests/lib/admin/clients.test.ts`, `tests/lib/admin/client-actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (Phase 1), `createClient` (server), `ORDER_STATUS`, `OrderStatus` (Task 2), `TIERS`, `ContentIssue` (Task 3).
- Produces: `type ActionResult = { ok: true } | { ok: false; message: string; issues?: readonly ContentIssue[] }`; `type FormAction = (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>`; `adminRoutes.client(id)`, `adminRoutes.invitation(id)`, `adminRoutes.preview(id)`, `ROUTES.ADMIN_NEW_CLIENT`; `clientFiltersSchema`; `searchPattern(q: string): string | null`; `listClients(filters): Promise<ClientListRow[]>`; `getClient(id): Promise<ClientDetail | null>`; actions `createClientWithOrder`, `updateClient`, `addOrder` (all `FormAction`); `orderFieldsSchema`; `fakeSupabase(results)`.

- [ ] **Step 1: Add the test fake**

`tests/helpers/fake-supabase.ts`:

```ts
/**
 * A chainable stand-in for the Supabase query builder. Every call on a table
 * is recorded; awaiting the chain resolves the next queued result for that
 * table. Tests assert on what was ASKED of the database, and on what the
 * action did with the answer.
 */
export type QueuedResult = { data?: unknown; error?: unknown; count?: number };
export type RecordedCall = { table: string; chain: { method: string; args: unknown[] }[] };

export function fakeSupabase(results: Record<string, QueuedResult[]> = {}) {
  const calls: RecordedCall[] = [];

  function from(table: string) {
    const call: RecordedCall = { table, chain: [] };
    calls.push(call);

    const builder: object = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'then') {
            const next = results[table]?.shift() ?? {};
            return (resolve: (value: unknown) => void) =>
              resolve({ data: null, error: null, ...next });
          }
          return (...args: unknown[]) => {
            call.chain.push({ method: String(property), args });
            return builder;
          };
        },
      },
    );

    return builder;
  }

  /** The first recorded call on `table` that used `method`. */
  function find(table: string, method: string) {
    const call = calls.find(
      (candidate) =>
        candidate.table === table && candidate.chain.some((step) => step.method === method),
    );
    return call?.chain.find((step) => step.method === method);
  }

  return { client: { from }, calls, find };
}
```

- [ ] **Step 2: Write the failing tests**

`tests/lib/admin/clients.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { searchPattern } from '@/lib/admin/clients';

describe('searchPattern', () => {
  it('wraps a term for a contains match', () => {
    expect(searchPattern('maya')).toBe('*maya*');
  });

  /* Review Focus 2: PostgREST reads , ( ) as filter syntax inside or=(). */
  it('strips anything PostgREST would read as syntax', () => {
    expect(searchPattern('maya,email.neq.x')).toBe('*maya email.neq.x*');
    expect(searchPattern('(%*maya*)')).toBe('*maya*');
  });

  it('returns null for a blank search', () => {
    expect(searchPattern('  ,() ')).toBeNull();
  });
});
```

`tests/lib/admin/client-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { redirect, state } = vi.hoisted(() => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => state.fake?.client,
}));

import { createClientWithOrder } from '@/lib/admin/client-actions';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const newClient = {
  fullName: 'Maya Haddad',
  email: 'Maya@Gmail.com',
  phone: '+961 70 000 000',
  tier: 'managed',
  amount: '100',
  eventDate: '2027-06-12',
  dueAt: '',
  notes: '',
};

beforeEach(() => {
  state.fake = null;
});

describe('createClientWithOrder', () => {
  it('stores the email lowercased and opens the new client', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: { id: 'client-1' } }],
      orders: [{ data: null }],
    });

    await expect(createClientWithOrder(null, form(newClient))).rejects.toThrow(
      'REDIRECT /admin/clients/client-1',
    );
    expect(state.fake.find('clients', 'insert')?.args[0]).toMatchObject({
      email: 'maya@gmail.com',
      full_name: 'Maya Haddad',
    });
    expect(state.fake.find('orders', 'insert')?.args[0]).toMatchObject({
      client_id: 'client-1',
      tier: 'managed',
      amount: 100,
      event_date: '2027-06-12',
      due_at: null,
    });
  });

  /* Review Focus 3. */
  it('explains a duplicate email instead of surfacing a database error', async () => {
    state.fake = fakeSupabase({ clients: [{ error: { code: '23505' } }] });

    await expect(createClientWithOrder(null, form(newClient))).resolves.toEqual({
      ok: false,
      message: 'A client with this email already exists.',
    });
  });

  it('removes the client again when its order cannot be created', async () => {
    state.fake = fakeSupabase({
      clients: [{ data: { id: 'client-1' } }, { data: null }],
      orders: [{ error: { code: '23514' } }],
    });

    const result = await createClientWithOrder(null, form(newClient));

    expect(result).toMatchObject({ ok: false });
    expect(state.fake.find('clients', 'delete')).toBeDefined();
  });

  it('refuses a tier that does not exist', async () => {
    state.fake = fakeSupabase();
    await expect(
      createClientWithOrder(null, form({ ...newClient, tier: 'platinum' })),
    ).resolves.toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm vitest run tests/lib/admin`
Expected: FAIL, modules missing.

- [ ] **Step 4: Routes and the result type**

Append to `lib/routes.ts`, and add `ADMIN_NEW_CLIENT: '/admin/clients/new'` to `ROUTES`:

```ts
/** Admin pages addressed by id. */
export const adminRoutes = {
  client: (id: string) => `/admin/clients/${id}`,
  invitation: (id: string) => `/admin/invitations/${id}`,
  /** The bare draft render, outside the admin surface's styles. */
  preview: (id: string) => `/admin/preview/${id}`,
} as const;
```

`lib/admin/action-result.ts`:

```ts
import type { ContentIssue } from '@/lib/invitations/content';

/**
 * What every admin action returns. Expected failures come back as a message
 * for the form; only the unexpected throws, into the segment's error.tsx.
 */
export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; issues?: readonly ContentIssue[] };

export type FormAction = (
  previous: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export const UNEXPECTED = 'Something went wrong saving that. Try again.';
```

- [ ] **Step 5: Reads — `lib/admin/clients.ts`**

```ts
import 'server-only';
import { z } from 'zod';
import { TIERS } from '@/lib/constants';
import { ORDER_STATUS } from '@/lib/orders/status';
import { createClient } from '@/lib/supabase/server';

export const clientFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(Object.values(ORDER_STATUS)).optional().catch(undefined),
  tier: z.enum(Object.values(TIERS)).optional().catch(undefined),
});

export type ClientFilters = z.infer<typeof clientFiltersSchema>;

/**
 * A contains-match for PostgREST's `or=()`. Commas, parentheses and the
 * wildcard characters are filter syntax there, so they are removed rather
 * than escaped: a name or phone number never needs them.
 */
export function searchPattern(q: string): string | null {
  const cleaned = q.replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? `*${cleaned}*` : null;
}

const LIST_SELECT =
  'id, full_name, email, phone, user_id, created_at, orders!inner(id, reference, tier, status, due_at, created_at)';

/** Every client has at least one order: they are created together. */
export async function listClients(filters: ClientFilters) {
  const supabase = await createClient();
  let query = supabase.from('clients').select(LIST_SELECT).order('created_at', { ascending: false });

  const pattern = filters.q ? searchPattern(filters.q) : null;
  if (pattern) {
    query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
  }
  if (filters.status) query = query.eq('orders.status', filters.status);
  if (filters.tier) query = query.eq('orders.tier', filters.tier);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type ClientListRow = Awaited<ReturnType<typeof listClients>>[number];

export async function getClient(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, full_name, email, phone, notes, user_id, terms_accepted_at, created_at, orders(id, reference, tier, status, amount, event_date, due_at, notes, created_at, invitations(id, slug, status, template_slug))',
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'orders', ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClient>>>;
```

- [ ] **Step 6: Actions — `lib/admin/client-actions.ts`**

Use `nextjs-supabase-kit:server-action` as the scaffold, then match:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { adminRoutes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const UNIQUE_VIOLATION = '23505';

/** An empty date field arrives as '' and means "not set". */
const optionalDate = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.iso.date().nullable());

const orderFieldsSchema = z.object({
  tier: z.enum(Object.values(TIERS)),
  amount: z.coerce.number().min(0).max(100_000),
  eventDate: optionalDate,
  dueAt: optionalDate,
  notes: z.string().trim().max(2000),
});

const clientFieldsSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  notes: z.string().trim().max(2000).optional(),
});

function fields(formData: FormData, names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [name, formData.get(name) ?? '']));
}

function orderRow(order: z.infer<typeof orderFieldsSchema>, clientId: string) {
  return {
    client_id: clientId,
    tier: order.tier,
    amount: order.amount,
    event_date: order.eventDate,
    due_at: order.dueAt,
    notes: order.notes || null,
  };
}

const ORDER_FIELDS = ['tier', 'amount', 'eventDate', 'dueAt', 'notes'] as const;

export async function createClientWithOrder(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const client = clientFieldsSchema
    .extend({ email: z.email().transform((value) => value.toLowerCase()) })
    .safeParse(fields(formData, ['fullName', 'email', 'phone']));
  const order = orderFieldsSchema.safeParse(fields(formData, ORDER_FIELDS));
  if (!client.success || !order.success) {
    return { ok: false, message: 'Check the highlighted details and try again.' };
  }

  const supabase = await createClient();
  const created = await supabase
    .from('clients')
    .insert({ full_name: client.data.fullName, email: client.data.email, phone: client.data.phone })
    .select('id')
    .single();

  if (created.error) {
    return created.error.code === UNIQUE_VIOLATION
      ? { ok: false, message: 'A client with this email already exists.' }
      : { ok: false, message: UNEXPECTED };
  }

  const clientId = created.data.id;
  const ordered = await supabase.from('orders').insert(orderRow(order.data, clientId));

  /* Two inserts, no transaction over PostgREST: undo the first rather than
     leave a client with no order, which the client list could not show. */
  if (ordered.error) {
    await supabase.from('clients').delete().eq('id', clientId);
    return { ok: false, message: UNEXPECTED };
  }

  redirect(adminRoutes.client(clientId));
}

export async function updateClient(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = z.uuid().safeParse(formData.get('clientId'));
  const client = clientFieldsSchema.safeParse(fields(formData, ['fullName', 'phone', 'notes']));
  if (!id.success || !client.success) return { ok: false, message: 'Check the details.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clients')
    .update({
      full_name: client.data.fullName,
      phone: client.data.phone,
      notes: client.data.notes ?? '',
    })
    .eq('id', id.data);
  if (error) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(id.data));
  return { ok: true };
}

export async function addOrder(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = z.uuid().safeParse(formData.get('clientId'));
  const order = orderFieldsSchema.safeParse(fields(formData, ORDER_FIELDS));
  if (!id.success || !order.success) return { ok: false, message: 'Check the order details.' };

  const supabase = await createClient();
  const { error } = await supabase.from('orders').insert(orderRow(order.data, id.data));
  if (error) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(id.data));
  return { ok: true };
}
```

The email is not editable in `updateClient`: from Phase 3 it is the client's sign-in identity.

- [ ] **Step 7: Verify and commit**

Run: `pnpm vitest run tests/lib/admin` → PASS (7 tests). Then `pnpm lint && pnpm typecheck && pnpm test`.

If typecheck rejects `z.enum(Object.values(ORDER_STATUS))` (zod needs a non-empty tuple), use `z.enum(ORDER_STATUS)` / `z.enum(TIERS)`, which zod 4 accepts for const objects.

```bash
git add tests/helpers lib/admin lib/routes.ts tests/lib/admin
git commit -m "feat: create, find and edit clients and their orders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The admin surface moves down, and the client pages

**Files:**
- Create: `components/admin/AppSurface.tsx`, `components/admin/ActionForm.tsx`, `components/admin/StatusBadge.tsx`, `components/admin/fields.tsx` (`Field`, `OrderFields`)
- Modify: `app/admin/layout.tsx`, `app/admin/error.tsx`, `app/admin/not-found.tsx`, `app/admin/login/page.tsx`, `app/admin/(gated)/layout.tsx`
- Modify: `app/admin/(gated)/page.tsx` (client list)
- Create: `app/admin/(gated)/clients/new/page.tsx`, `app/admin/(gated)/clients/[id]/page.tsx`
- Create: `components/ui/*` via `pnpm dlx shadcn@latest add table textarea badge native-select`
- Test: `tests/components/admin/action-form.test.tsx`

**Interfaces:**
- Consumes: Task 4 reads and actions; `STATUS_LABELS` (Task 2).
- Produces: `Field({ label, name, type?, required?, defaultValue? })` and `OrderFields()` in `components/admin/fields.tsx`; `AppSurface({ children })`; `ActionForm({ action, submitLabel, pendingLabel?, successMessage?, variant?, className?, children })`; `StatusBadge({ status })`. The client page renders an `OrderPanel` slot per order that Task 6 fills.

The draft preview (Task 7) renders a design inside `/admin`, and `[data-surface="app"] *` would repaint its borders and type. So the surface moves from `app/admin/layout.tsx` down into the segments that are admin UI; `/admin/preview/[id]` stays bare.

- [ ] **Step 1: Write the failing test**

`tests/components/admin/action-form.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionForm } from '@/components/admin/ActionForm';
import type { ActionResult } from '@/lib/admin/action-result';

describe('ActionForm', () => {
  it('shows the message an action refuses with', async () => {
    const refuse = async (): Promise<ActionResult> => ({ ok: false, message: 'Not yet.' });

    render(
      <ActionForm action={refuse} submitLabel="Save">
        <input name="x" defaultValue="1" />
      </ActionForm>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Not yet.')).toBeInTheDocument());
  });

  it('confirms a success when asked to', async () => {
    const accept = async (): Promise<ActionResult> => ({ ok: true });

    render(<ActionForm action={accept} submitLabel="Save" successMessage="Saved." />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByText('Saved.')).toBeInTheDocument());
  });
});
```

Run: `pnpm vitest run tests/components/admin` → FAIL (module missing).

- [ ] **Step 2: The primitives and the three shared components**

```bash
pnpm dlx shadcn@latest add table textarea badge native-select
git diff --stat app/globals.css app/layout.tsx
```
Expected: the diff is EMPTY. If `add` touched either file, revert that file (`git checkout -- <file>`) and keep only `components/ui/*`. If `native-select` is not in the registry, skip it and use a plain `<select>` with the classes of `components/ui/input.tsx` wherever this plan says `NativeSelect`.

`components/admin/AppSurface.tsx`:

```tsx
import type { ReactNode } from 'react';

/**
 * The attribute that switches shadcn's tokens and base styles on. Wraps admin
 * UI only: the draft preview renders a design and must not inherit them.
 */
export function AppSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-dvh text-[14px]"
      data-surface="app"
      style={{ WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility' }}
    >
      {children}
    </div>
  );
}
```

`components/admin/ActionForm.tsx`:

```tsx
'use client';

import { useActionState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ActionResult, FormAction } from '@/lib/admin/action-result';

type ActionFormProps = {
  action: FormAction;
  submitLabel: string;
  pendingLabel?: string;
  successMessage?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  className?: string;
  children?: ReactNode;
};

/**
 * The one client island every admin form shares. The fields are server-
 * rendered children; this owns only the pending state and the result line.
 */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  successMessage,
  variant,
  className,
  children,
}: ActionFormProps) {
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={run} className={className ?? 'grid gap-3'}>
      {children}
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}
      {result?.ok && successMessage ? (
        <p className="text-muted-foreground">{successMessage}</p>
      ) : null}
      <Button disabled={pending} type="submit" variant={variant}>
        {pending ? (pendingLabel ?? submitLabel) : submitLabel}
      </Button>
    </form>
  );
}
```

`components/admin/StatusBadge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type OrderStatus } from '@/lib/orders/status';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant="secondary">{STATUS_LABELS[status].admin}</Badge>;
}
```

- [ ] **Step 3: Move the surface**

`app/admin/layout.tsx` keeps its `metadata` and becomes `return children;` (typed `{ children: ReactNode }`), with its doc comment rewritten to: "Metadata only. The admin surface is applied by the segments that are admin UI (`AppSurface`); the draft preview under `/admin/preview` renders a design and must stay bare." Wrap the returned JSX of `app/admin/error.tsx`, `app/admin/not-found.tsx`, `app/admin/login/page.tsx` and `app/admin/(gated)/layout.tsx` in `<AppSurface>…</AppSurface>`.

- [ ] **Step 4: The client list — `app/admin/(gated)/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { clientFiltersSchema, listClients } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS } from '@/lib/orders/status';
import { ROUTES, adminRoutes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Clients' };

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filters = clientFiltersSchema.parse(await searchParams);
  const clients = await listClients(filters);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Clients</h1>
        <Button render={<Link href={ROUTES.ADMIN_NEW_CLIENT} />}>New client</Button>
      </div>

      {/* A plain GET form: filtering needs no JavaScript and the URL is
          shareable. */}
      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <Input
          className="w-64"
          defaultValue={filters.q ?? ''}
          name="q"
          placeholder="Name, email or phone"
        />
        <NativeSelect defaultValue={filters.status ?? ''} name="status">
          <option value="">Any stage</option>
          {Object.values(ORDER_STATUS).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status].admin}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect defaultValue={filters.tier ?? ''} name="tier">
          <option value="">Any tier</option>
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {clients.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No clients match.</p>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Latest order</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const latest = [...client.orders].sort((a, b) =>
                b.created_at.localeCompare(a.created_at),
              )[0];

              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link className="font-medium hover:underline" href={adminRoutes.client(client.id)}>
                      {client.full_name}
                    </Link>
                    <div className="text-muted-foreground">{client.email}</div>
                  </TableCell>
                  <TableCell>
                    {latest.reference} · {latest.tier}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={latest.status} />
                  </TableCell>
                  <TableCell>
                    {latest.due_at ? dateFormat.format(new Date(latest.due_at)) : ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
```

`Button render={<Link />}` is how base-nova (Base UI) renders a button as a link. If the generated `button.tsx` exposes `asChild` instead, use `<Button asChild><Link …/></Button>`.

- [ ] **Step 5: New client — `app/admin/(gated)/clients/new/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { ActionForm } from '@/components/admin/ActionForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { createClientWithOrder } from '@/lib/admin/client-actions';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-medium">New client</h1>
      <p className="mt-1 text-muted-foreground">
        The client and their first order. They get no account until you invite them.
      </p>

      <ActionForm action={createClientWithOrder} className="mt-6 grid gap-4" submitLabel="Create client">
        <Field label="Full name" name="fullName" required />
        <Field label="Email" name="email" required type="email" />
        <Field label="Phone (WhatsApp)" name="phone" required />
        <OrderFields />
      </ActionForm>
    </main>
  );
}

export function OrderFields() {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="tier">Tier</Label>
        <NativeSelect defaultValue={TIERS.MANAGED} id="tier" name="tier">
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Field label="Amount (USD)" name="amount" required type="number" />
      <Field label="Event date" name="eventDate" type="date" />
      <Field label="Due (leave empty: set to 48 hours once paid)" name="dueAt" type="date" />
      <div className="grid gap-2">
        <Label htmlFor="notes">Order notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input defaultValue={defaultValue} id={name} name={name} required={required} type={type} />
    </div>
  );
}
```

A page module may not export components Next does not expect: move `OrderFields` and `Field` to `components/admin/fields.tsx` and import them here and in Step 6.

- [ ] **Step 6: Client detail — `app/admin/(gated)/clients/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { Field, OrderFields } from '@/components/admin/fields';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addOrder, updateClient } from '@/lib/admin/client-actions';
import { getClient } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { adminRoutes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Client' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const client = await getClient(id.data);
  if (!client) notFound();

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[1fr_2fr]">
      <section>
        <h1 className="text-xl font-medium">{client.full_name}</h1>
        <p className="text-muted-foreground">{client.email}</p>
        <p className="mt-1 text-muted-foreground">
          {client.user_id ? 'Has an account' : 'Not invited yet'}
        </p>

        <ActionForm action={updateClient} className="mt-6 grid gap-4" submitLabel="Save" successMessage="Saved.">
          <input name="clientId" type="hidden" value={client.id} />
          <Field defaultValue={client.full_name} label="Full name" name="fullName" required />
          <Field defaultValue={client.phone} label="Phone" name="phone" required />
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea defaultValue={client.notes} id="notes" name="notes" />
          </div>
        </ActionForm>
      </section>

      <section className="grid content-start gap-4">
        {client.orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {order.reference} · {order.tier} · ${order.amount}
                <StatusBadge status={order.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {order.invitations ? (
                <Link className="underline" href={adminRoutes.invitation(order.invitations.id)}>
                  Invitation /i/{order.invitations.slug} ({order.invitations.status})
                </Link>
              ) : null}
              {/* Task 6 renders <OrderPanel order={order} /> here. */}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Add an order</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={addOrder} className="grid gap-4" submitLabel="Add order" successMessage="Order added.">
              <input name="clientId" type="hidden" value={client.id} />
              <OrderFields />
            </ActionForm>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
```

`order.invitations` is an object or null because Task 1 made `invitations.order_id` unique (PostgREST embeds one-to-one as an object). If the regenerated types still say array, use `order.invitations[0]`.

- [ ] **Step 7: Verify**

Run: `pnpm vitest run tests/components/admin` → PASS (2 tests). Then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

In the browser, signed in as the admin (`pnpm dev` if no server is running on :3000): create a client "Test Client" / `test.client@example.com` / Managed / 100; land on its page; search "test" on `/admin` finds it; search `test,email.neq.x` returns it or nothing, never an error page; create the same email in capitals → "A client with this email already exists."

- [ ] **Step 8: Commit**

```bash
git add components/admin components/ui app/admin tests/components/admin package.json pnpm-lock.yaml
git commit -m "feat: list, create and open clients in the admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Orders move through their stages, and upgrade

**Files:**
- Create: `lib/admin/order-actions.ts` (`moveOrder`, `applyUpgrade`; `provisionInvitation` arrives in Task 7)
- Create: `components/admin/OrderPanel.tsx`
- Modify: `app/admin/(gated)/clients/[id]/page.tsx` (render `OrderPanel`)
- Test: `tests/lib/admin/order-actions.test.ts`

**Interfaces:**
- Consumes: `allowedMoves`, `canMove`, `ORDER_STATUS`, `STATUS_LABELS` (Task 2); `planUpgrade`, `upgradeTargets` (Task 2); `checkContent`, `toJson` (Task 3); `DELIVERY.hours`; `fakeSupabase`; `ActionForm`.
- Produces: `moveOrder: FormAction` (fields `orderId`, `to`); `applyUpgrade: FormAction` (fields `orderId`, `tier`, `amount`); `OrderPanel({ order })` where `order` is one element of `ClientDetail['orders']`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/admin/order-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { applyUpgrade, moveOrder } from '@/lib/admin/order-actions';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const validContent = {
  coupleFirstName: 'Maya',
  couplePartnerName: 'Karim',
  initials: 'MK',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: { name: 'Villa Rosa', addressLine: 'Broumana' },
};

beforeEach(() => {
  state.fake = null;
});

describe('moveOrder', () => {
  it('refuses a move the tier does not allow', async () => {
    state.fake = fakeSupabase({
      orders: [{ data: { id: ORDER_ID, tier: 'basic', status: 'paid', due_at: null, client_id: 'c', invitations: null } }],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'brief' }))).resolves.toMatchObject({
      ok: false,
    });
    expect(state.fake.find('orders', 'update')).toBeUndefined();
  });

  it('sets the 48-hour due date when a ready-drawn order is paid', async () => {
    state.fake = fakeSupabase({
      orders: [
        { data: { id: ORDER_ID, tier: 'managed', status: 'pending_payment', due_at: null, client_id: 'c', invitations: null } },
        { data: null },
      ],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'paid' }))).resolves.toEqual({ ok: true });
    const update = state.fake.find('orders', 'update')?.args[0];
    expect(update).toMatchObject({ status: 'paid' });
    expect(typeof (update as { due_at: unknown }).due_at).toBe('string');
  });

  /* Review Focus 4. */
  it('refuses review when there is no invitation', async () => {
    state.fake = fakeSupabase({
      orders: [{ data: { id: ORDER_ID, tier: 'managed', status: 'in_design', due_at: null, client_id: 'c', invitations: null } }],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'review' }))).resolves.toEqual({
      ok: false,
      message: 'Create the invitation before sending it for review.',
    });
  });

  it('refuses review while the content does not satisfy its design', async () => {
    state.fake = fakeSupabase({
      orders: [
        {
          data: {
            id: ORDER_ID, tier: 'managed', status: 'in_design', due_at: null, client_id: 'c',
            invitations: { id: 'inv', template_slug: 'lin', content: {} },
          },
        },
      ],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'review' }))).resolves.toMatchObject({
      ok: false,
      message: 'The invitation content is not complete for its design yet.',
    });
  });

  it('sends complete content for review', async () => {
    state.fake = fakeSupabase({
      orders: [
        {
          data: {
            id: ORDER_ID, tier: 'managed', status: 'in_design', due_at: '2026-10-01T00:00:00Z', client_id: 'c',
            invitations: { id: 'inv', template_slug: 'lin', content: validContent },
          },
        },
        { data: null },
      ],
    });

    await expect(moveOrder(null, form({ orderId: ORDER_ID, to: 'review' }))).resolves.toEqual({ ok: true });
  });
});

describe('applyUpgrade', () => {
  it('raises the tier and re-resolves the invitation\'s entitlements', async () => {
    state.fake = fakeSupabase({
      orders: [{ data: { id: ORDER_ID, tier: 'basic', client_id: 'c' } }, { data: null }],
      invitations: [{ data: null }],
    });

    await expect(
      applyUpgrade(null, form({ orderId: ORDER_ID, tier: 'managed', amount: '100' })),
    ).resolves.toEqual({ ok: true });
    expect(state.fake.find('orders', 'update')?.args[0]).toEqual({ tier: 'managed', amount: 100 });
    expect(state.fake.find('invitations', 'update')?.args[0]).toEqual({
      entitlements: { rsvp: true, portal: true, gallery: true },
    });
  });

  it('refuses a downgrade', async () => {
    state.fake = fakeSupabase({ orders: [{ data: { id: ORDER_ID, tier: 'managed', client_id: 'c' } }] });

    await expect(
      applyUpgrade(null, form({ orderId: ORDER_ID, tier: 'basic', amount: '50' })),
    ).resolves.toMatchObject({ ok: false });
  });
});
```

Run: `pnpm vitest run tests/lib/admin/order-actions.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement `lib/admin/order-actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { checkContent } from '@/lib/invitations/content';
import { DELIVERY } from '@/lib/offer';
import { ORDER_STATUS, canMove } from '@/lib/orders/status';
import { planUpgrade } from '@/lib/orders/upgrade';
import { adminRoutes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const moveSchema = z.object({
  orderId: z.uuid(),
  to: z.enum(ORDER_STATUS),
});

export async function moveOrder(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = moveSchema.safeParse({ orderId: formData.get('orderId'), to: formData.get('to') });
  if (!input.success) return { ok: false, message: 'Unknown stage.' };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, tier, status, due_at, client_id, invitations(id, template_slug, content)')
    .eq('id', input.data.orderId)
    .maybeSingle();
  if (error) return { ok: false, message: UNEXPECTED };
  if (!order) return { ok: false, message: 'That order no longer exists.' };

  const { to } = input.data;
  if (!canMove(order.tier, order.status, to)) {
    return { ok: false, message: 'That order cannot move to that stage from here.' };
  }

  /* Review needs something the client can actually approve. */
  if (to === ORDER_STATUS.REVIEW) {
    const invitation = order.invitations;
    if (!invitation) {
      return { ok: false, message: 'Create the invitation before sending it for review.' };
    }
    const check = checkContent(invitation.template_slug, JSON.stringify(invitation.content));
    if (!check.ok) {
      return {
        ok: false,
        message: 'The invitation content is not complete for its design yet.',
        issues: check.issues,
      };
    }
  }

  /* The delivery promise starts when payment lands. Custom makes no promise. */
  const dueAt =
    to === ORDER_STATUS.PAID && !order.due_at && order.tier !== DELIVERY.excludesTier
      ? new Date(Date.now() + DELIVERY.hours * 3_600_000).toISOString()
      : order.due_at;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: to, due_at: dueAt, updated_at: new Date().toISOString() })
    .eq('id', order.id);
  if (updateError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(order.client_id));
  return { ok: true };
}

const upgradeSchema = z.object({
  orderId: z.uuid(),
  tier: z.enum(TIERS),
  amount: z.coerce.number().min(0).max(100_000),
});

export async function applyUpgrade(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = upgradeSchema.safeParse({
    orderId: formData.get('orderId'),
    tier: formData.get('tier'),
    amount: formData.get('amount'),
  });
  if (!input.success) return { ok: false, message: 'Check the upgrade details.' };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, tier, client_id')
    .eq('id', input.data.orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, message: UNEXPECTED };

  const plan = planUpgrade(order.tier, input.data.tier);
  if (!plan) return { ok: false, message: 'An upgrade must be to a higher tier.' };

  const { error: orderError } = await supabase
    .from('orders')
    .update({ tier: plan.tier, amount: input.data.amount })
    .eq('id', order.id);
  if (orderError) return { ok: false, message: UNEXPECTED };

  const { error: invitationError } = await supabase
    .from('invitations')
    .update({ entitlements: plan.entitlements })
    .eq('order_id', order.id);
  if (invitationError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(order.client_id));
  return { ok: true };
}
```

If `order.invitations` is typed as an array in the regenerated types, take `order.invitations[0]` (see Task 5 Step 6).

- [ ] **Step 3: `components/admin/OrderPanel.tsx`**

```tsx
import { ActionForm } from '@/components/admin/ActionForm';
import { Field } from '@/components/admin/fields';
import { NativeSelect } from '@/components/ui/native-select';
import type { ClientDetail } from '@/lib/admin/clients';
import { applyUpgrade, moveOrder } from '@/lib/admin/order-actions';
import { STATUS_LABELS, allowedMoves } from '@/lib/orders/status';
import { upgradeTargets } from '@/lib/orders/upgrade';

type Order = ClientDetail['orders'][number];

/** An order's stage buttons and, where one exists, its upgrade. */
export function OrderPanel({ order }: { order: Order }) {
  const moves = allowedMoves(order.tier, order.status);
  const targets = upgradeTargets(order.tier);

  return (
    <div className="grid gap-4">
      {moves.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {moves.map((to) => (
            <ActionForm
              action={moveOrder}
              className="contents"
              key={to}
              submitLabel={STATUS_LABELS[to].admin}
              variant="outline"
            >
              <input name="orderId" type="hidden" value={order.id} />
              <input name="to" type="hidden" value={to} />
            </ActionForm>
          ))}
        </div>
      ) : null}

      {targets.length > 0 ? (
        <ActionForm action={applyUpgrade} className="flex flex-wrap items-end gap-2" submitLabel="Upgrade">
          <input name="orderId" type="hidden" value={order.id} />
          <NativeSelect name="tier">
            {targets.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </NativeSelect>
          <Field defaultValue={String(order.amount)} label="New total (USD)" name="amount" type="number" />
        </ActionForm>
      ) : null}
    </div>
  );
}
```

Render it in the client page where the Task 5 comment stands: `<OrderPanel order={order} />`, and delete the comment.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/lib/admin/order-actions.test.ts` → PASS (7 tests). Then `pnpm lint && pnpm typecheck && pnpm test`.

In the browser: on the test client, "Paid" moves the order and a due date appears 48 hours out; "In design" is next; "Awaiting approval" is refused with "Create the invitation before sending it for review."

```bash
git add lib/admin/order-actions.ts components/admin/OrderPanel.tsx app/admin tests/lib/admin/order-actions.test.ts
git commit -m "feat: move orders through their stages and upgrade their tier

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Create the invitation, edit its content, preview it

**Files:**
- Modify: `lib/admin/order-actions.ts` (add `provisionInvitation`)
- Create: `lib/admin/invitations.ts`, `lib/admin/invitation-actions.ts` (`saveContent`, `updateSlug`)
- Create: `components/admin/ContentEditor.tsx`, `components/admin/CopyChecklist.tsx`
- Create: `app/admin/(gated)/invitations/[id]/page.tsx`, `app/admin/preview/[id]/page.tsx`
- Modify: `components/admin/OrderPanel.tsx` (provision form)
- Test: `tests/lib/admin/provision.test.ts`, `tests/lib/admin/invitation-actions.test.ts`

**Interfaces:**
- Consumes: `proposeSlug`, `withSuffix`, `slugSchema` (Task 3); `checkContent`, `toJson`; `hasReached` (Task 2); `entitlementsForTier`; `themeSchema`; `TEMPLATES`, `getTemplateEntry`, `VISIBILITY`; `checklistFor`, `checklistMessage` (Phase 1); `TemplateRenderer`.
- Produces: `provisionInvitation: FormAction` (fields `orderId`, `templateSlug`); `getInvitationForEditor(id)`; `saveContent: FormAction` (fields `invitationId`, `content`); `updateSlug: FormAction` (fields `invitationId`, `slug`); `ContentEditor({ invitationId, initial, previewUrl })`; `CopyChecklist({ message })`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/admin/provision.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { redirect, state } = vi.hoisted(() => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  },
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { provisionInvitation } from '@/lib/admin/order-actions';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const paidOrder = {
  id: ORDER_ID, tier: 'basic', status: 'paid', client_id: 'c',
  clients: { full_name: 'Maya Haddad' }, invitations: null,
};

beforeEach(() => {
  state.fake = null;
});

describe('provisionInvitation', () => {
  /* Review Focus 5. */
  it('numbers the link when the name is taken', async () => {
    state.fake = fakeSupabase({
      orders: [{ data: paidOrder }],
      invitations: [{ data: [{ slug: 'maya-haddad' }] }, { data: { id: 'inv-1' } }],
    });

    await expect(
      provisionInvitation(null, form({ orderId: ORDER_ID, templateSlug: 'lin' })),
    ).rejects.toThrow('REDIRECT /admin/invitations/inv-1');
    expect(state.fake.find('invitations', 'insert')?.args[0]).toMatchObject({
      order_id: ORDER_ID,
      slug: 'maya-haddad-2',
      template_slug: 'lin',
      status: 'draft',
      entitlements: { rsvp: false, portal: false, gallery: true },
    });
  });

  it('refuses an order that has not been paid', async () => {
    state.fake = fakeSupabase({ orders: [{ data: { ...paidOrder, status: 'pending_payment' } }] });

    await expect(
      provisionInvitation(null, form({ orderId: ORDER_ID, templateSlug: 'lin' })),
    ).resolves.toEqual({ ok: false, message: 'Mark the order paid before creating its invitation.' });
  });

  it('refuses a design the registry does not have', async () => {
    state.fake = fakeSupabase({ orders: [{ data: paidOrder }] });

    await expect(
      provisionInvitation(null, form({ orderId: ORDER_ID, templateSlug: 'cap-blanc' })),
    ).resolves.toMatchObject({ ok: false });
  });
});
```

`tests/lib/admin/invitation-actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { saveContent, updateSlug } from '@/lib/admin/invitation-actions';

const INV = '22222222-2222-4222-8222-222222222222';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.fake = null;
});

describe('saveContent', () => {
  it('saves nothing and lists what is wrong', async () => {
    state.fake = fakeSupabase({ invitations: [{ data: { id: INV, template_slug: 'lin' } }] });

    const result = await saveContent(null, form({ invitationId: INV, content: '{"initials":"MAYAK"}' }));

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? [] : (result.issues ?? []).length).toBeGreaterThan(0);
    expect(state.fake.find('invitations', 'update')).toBeUndefined();
  });

  it('stores the parsed content', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, template_slug: 'lin' } }, { data: null }],
    });
    const content = {
      coupleFirstName: 'Maya', couplePartnerName: 'Karim', initials: 'MK',
      eventDate: '2027-06-12T17:00:00.000Z', venue: { name: 'Villa Rosa', addressLine: 'Broumana' },
    };

    await expect(
      saveContent(null, form({ invitationId: INV, content: JSON.stringify(content) })),
    ).resolves.toEqual({ ok: true });
    expect(state.fake.find('invitations', 'update')?.args[0]).toMatchObject({
      content: { ...content, schedule: [], gallery: [] },
    });
  });
});

describe('updateSlug', () => {
  it('refuses to move a link that has already been published', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, published_at: '2026-10-01T00:00:00Z' } }],
    });

    await expect(updateSlug(null, form({ invitationId: INV, slug: 'maya-karim' }))).resolves.toEqual({
      ok: false,
      message: 'This invitation has been published: its link is already with guests.',
    });
  });

  it('explains a link that is taken', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, published_at: null } }, { error: { code: '23505' } }],
    });

    await expect(updateSlug(null, form({ invitationId: INV, slug: 'maya-karim' }))).resolves.toEqual({
      ok: false,
      message: 'Another invitation already uses that link.',
    });
  });
});
```

Run both → FAIL (functions missing).

- [ ] **Step 2: `provisionInvitation`**

Append to `lib/admin/order-actions.ts` (and add the imports: `redirect` from `next/navigation`; `getTemplateEntry` from the registry; `entitlementsForTier`; `themeSchema`; `proposeSlug`, `withSuffix`; `hasReached`):

```ts
const provisionSchema = z.object({ orderId: z.uuid(), templateSlug: z.string().min(1) });

export async function provisionInvitation(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = provisionSchema.safeParse({
    orderId: formData.get('orderId'),
    templateSlug: formData.get('templateSlug'),
  });
  if (!input.success) return { ok: false, message: 'Choose a design.' };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, tier, status, client_id, clients(full_name), invitations(id)')
    .eq('id', input.data.orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, message: UNEXPECTED };

  if (!hasReached(order.tier, order.status, ORDER_STATUS.PAID)) {
    return { ok: false, message: 'Mark the order paid before creating its invitation.' };
  }
  if (order.invitations) return { ok: false, message: 'This order already has an invitation.' };
  if (!getTemplateEntry(input.data.templateSlug)) {
    return { ok: false, message: 'That design does not exist.' };
  }

  /* Proposed from the client's name; renamed in the editor until the first
     publish. Taken slugs are read up front so the insert does not collide. */
  const base = proposeSlug(order.clients?.full_name ?? '');
  const { data: taken, error: takenError } = await supabase
    .from('invitations')
    .select('slug')
    .like('slug', `${base}%`);
  if (takenError) return { ok: false, message: UNEXPECTED };

  const { data: created, error: insertError } = await supabase
    .from('invitations')
    .insert({
      order_id: order.id,
      slug: withSuffix(base, new Set((taken ?? []).map((row) => row.slug))),
      template_slug: input.data.templateSlug,
      status: 'draft',
      content: {},
      theme: themeSchema.parse({}),
      entitlements: entitlementsForTier(order.tier),
    })
    .select('id')
    .single();
  if (insertError) return { ok: false, message: UNEXPECTED };

  redirect(adminRoutes.invitation(created.id));
}
```

In `OrderPanel`, above the moves, when the order has no invitation and `hasReached(order.tier, order.status, ORDER_STATUS.PAID)` and it is not cancelled, render:

```tsx
<ActionForm action={provisionInvitation} className="flex flex-wrap items-end gap-2" submitLabel="Create invitation">
  <input name="orderId" type="hidden" value={order.id} />
  <NativeSelect name="templateSlug">
    {TEMPLATES.map((design) => (
      <option key={design.slug} value={design.slug}>
        {design.name}
        {design.visibility === VISIBILITY.LISTED ? '' : ` (${design.visibility})`}
      </option>
    ))}
  </NativeSelect>
</ActionForm>
```

- [ ] **Step 3: The editor read — `lib/admin/invitations.ts`**

```ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getInvitationForEditor(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invitations')
    .select(
      'id, slug, status, template_slug, content, theme, entitlements, published_at, orders(id, reference, status, tier, client_id, clients(full_name)), invitation_reviews(id, decision, note, on_behalf, content_snapshot, created_at)',
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'invitation_reviews', ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type EditorInvitation = NonNullable<Awaited<ReturnType<typeof getInvitationForEditor>>>;
```

- [ ] **Step 4: `saveContent` and `updateSlug` — `lib/admin/invitation-actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { requireAdmin } from '@/lib/auth/guards';
import { checkContent } from '@/lib/invitations/content';
import { slugSchema } from '@/lib/invitations/slug';
import { adminRoutes } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const UNIQUE_VIOLATION = '23505';

export async function saveContent(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  const raw = z.string().max(200_000).safeParse(formData.get('content'));
  if (!id.success || !raw.success) return { ok: false, message: 'Nothing to save.' };

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, template_slug')
    .eq('id', id.data)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  const check = checkContent(invitation.template_slug, raw.data);
  if (!check.ok) {
    return { ok: false, message: 'Not saved: fix these first.', issues: check.issues };
  }

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ content: check.content })
    .eq('id', invitation.id);
  if (updateError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}

export async function updateSlug(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  const slug = slugSchema.safeParse(formData.get('slug'));
  if (!id.success) return { ok: false, message: UNEXPECTED };
  if (!slug.success) {
    return { ok: false, message: 'Use 3 to 60 lowercase letters, digits and single hyphens.' };
  }

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, published_at')
    .eq('id', id.data)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  /* Once published the link is in guests' WhatsApp threads. */
  if (invitation.published_at) {
    return { ok: false, message: 'This invitation has been published: its link is already with guests.' };
  }

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ slug: slug.data })
    .eq('id', invitation.id);
  if (updateError) {
    return updateError.code === UNIQUE_VIOLATION
      ? { ok: false, message: 'Another invitation already uses that link.' }
      : { ok: false, message: UNEXPECTED };
  }

  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}
```

- [ ] **Step 5: The two islands**

`components/admin/CopyChecklist.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

/** The design's "what we need from you", ready to paste into WhatsApp. */
export function CopyChecklist({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      onClick={async () => {
        await navigator.clipboard.writeText(message);
        setCopied(true);
      }}
      type="button"
      variant="outline"
    >
      {copied ? 'Copied' : 'Copy what we need'}
    </Button>
  );
}
```

`components/admin/ContentEditor.tsx`:

```tsx
'use client';

import { useActionState, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/lib/admin/action-result';
import { saveContent } from '@/lib/admin/invitation-actions';

type ContentEditorProps = {
  invitationId: string;
  initial: string;
  previewUrl: string;
};

/**
 * JSON on the left, the real invitation on the right. The preview is an
 * iframe onto the bare draft route, reloaded after each successful save, so
 * it shows exactly what was stored.
 */
export function ContentEditor({ invitationId, initial, previewUrl }: ContentEditorProps) {
  const [text, setText] = useState(initial);
  const [version, setVersion] = useState(0);
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await saveContent(previous, formData);
      if (next.ok) setVersion((current) => current + 1);
      return next;
    },
    null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <form action={run} className="grid content-start gap-3">
        <input name="invitationId" type="hidden" value={invitationId} />
        <Textarea
          className="min-h-[560px] font-mono text-[13px]"
          name="content"
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          value={text}
        />
        {result && !result.ok ? (
          <Alert variant="destructive">
            <AlertDescription>
              {result.message}
              {result.issues?.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {result.issues.map((issue) => (
                    <li key={`${issue.path}:${issue.message}`}>
                      <code>{issue.path || '(whole document)'}</code>: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {result?.ok ? <p className="text-muted-foreground">Saved.</p> : null}
        <Button disabled={pending} type="submit">
          {pending ? 'Saving' : 'Save content'}
        </Button>
      </form>

      <iframe
        className="h-[800px] w-[400px] rounded-xl border"
        key={version}
        src={previewUrl}
        title="Invitation preview"
      />
    </div>
  );
}
```

- [ ] **Step 6: The editor page — `app/admin/(gated)/invitations/[id]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { CopyChecklist } from '@/components/admin/CopyChecklist';
import { Field } from '@/components/admin/fields';
import { getTemplateEntry } from '@/components/invitation/registry';
import { getInvitationForEditor } from '@/lib/admin/invitations';
import { updateSlug } from '@/lib/admin/invitation-actions';
import { requireAdmin } from '@/lib/auth/guards';
import { checklistFor, checklistMessage } from '@/lib/schemas/content/checklist';
import { adminRoutes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Invitation' };

export default async function InvitationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const invitation = await getInvitationForEditor(id.data);
  if (!invitation) notFound();

  const design = getTemplateEntry(invitation.template_slug);
  if (!design) throw new Error(`Invitation ${invitation.id} names unknown design ${invitation.template_slug}`);

  const checklist = checklistFor(design.schema);
  const order = invitation.orders;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium">
            {design.name} · /i/{invitation.slug}
          </h1>
          {order ? (
            <Link className="text-muted-foreground underline" href={adminRoutes.client(order.client_id)}>
              {order.clients?.full_name} · {order.reference}
            </Link>
          ) : null}
        </div>
        <CopyChecklist message={checklistMessage(checklist)} />
      </header>

      <section className="grid gap-2">
        <h2 className="font-medium">Fields this design draws</h2>
        <ul className="grid gap-1 text-muted-foreground">
          {checklist.map((item) => (
            <li key={item.key}>
              <code className="text-foreground">{item.key}</code>
              {item.required ? '' : ' (optional)'}: {item.ask}
            </li>
          ))}
        </ul>
      </section>

      {invitation.published_at ? null : (
        <ActionForm action={updateSlug} className="flex items-end gap-2" submitLabel="Change link" successMessage="Link changed.">
          <input name="invitationId" type="hidden" value={invitation.id} />
          <Field defaultValue={invitation.slug} label="Link (/i/…)" name="slug" />
        </ActionForm>
      )}

      <ContentEditor
        initial={JSON.stringify(invitation.content, null, 2)}
        invitationId={invitation.id}
        previewUrl={adminRoutes.preview(invitation.id)}
      />

      {/* Task 9 renders <ReviewPanel invitation={invitation} /> here.
          Task 8 renders <MediaSection invitationId={invitation.id} /> here. */}
    </main>
  );
}
```

- [ ] **Step 7: The bare preview — `app/admin/preview/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { TemplateRenderer } from '@/components/invitation/TemplateRenderer';
import { getTemplateEntry } from '@/components/invitation/registry';
import { getInvitationForEditor } from '@/lib/admin/invitations';
import { requireAdmin } from '@/lib/auth/guards';
import { entitlementsSchema, themeSchema } from '@/lib/schemas/invitation';

export const metadata = { robots: { index: false, follow: false } };

/**
 * The draft, rendered exactly as a guest will see it, and deliberately
 * OUTSIDE AppSurface: shadcn's base styles would repaint the design.
 */
export default async function DraftPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const invitation = await getInvitationForEditor(id.data);
  const design = invitation ? getTemplateEntry(invitation.template_slug) : undefined;
  if (!invitation || !design) notFound();

  const content = design.schema.safeParse(invitation.content);
  if (!content.success) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 24, fontSize: 14 }}>
        <p>The content is not complete for this design yet. Save it on the left to see it here.</p>
      </main>
    );
  }

  return (
    <TemplateRenderer
      content={content.data}
      entitlements={entitlementsSchema.parse(invitation.entitlements)}
      templateSlug={invitation.template_slug}
      theme={themeSchema.parse(invitation.theme)}
    />
  );
}
```

- [ ] **Step 8: Verify and commit**

Run the two test files → PASS (7 tests). Then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

In the browser: on the test client's paid order, create a Lin invitation → the editor opens at `/i/test-client`; paste valid content (the `content.test.ts` fixture), save → the preview shows Lin with those names; paste `{"initials":"TOOLONG"}` → issues listed, preview unchanged; "Copy what we need" puts a numbered list on the clipboard.

```bash
git add lib/admin components/admin app/admin tests/lib/admin
git commit -m "feat: create an invitation and edit its content against a live preview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Media uploads

**Files:**
- Create: `lib/admin/media-paths.ts`, `lib/admin/media.ts`, `lib/admin/media-actions.ts`
- Create: `lib/supabase/client.ts`
- Modify: `lib/env.ts` (`getPublicEnv`)
- Create: `components/admin/MediaUploader.tsx`, `components/admin/MediaSection.tsx`
- Modify: `app/admin/(gated)/invitations/[id]/page.tsx` (render `MediaSection`)
- Modify: `scripts/optimize-images.mjs` (optional folder argument)
- Test: `tests/lib/admin/media-paths.test.ts`, `tests/lib/env.test.ts` (extend)

**Interfaces:**
- Produces: `MEDIA_BUCKET = 'invitation-media'`; `MEDIA_KINDS = { PHOTOS: 'photos', HERO: 'hero', ENVELOPE: 'envelope' }`; `type MediaKind`; `mediaPath(invitationId, kind, fileName): string`; `acceptsType(kind, contentType): boolean`; `listMedia(invitationId): Promise<{ kind: MediaKind; name: string; url: string }[]>`; `createUploadUrl(input: { invitationId: string; kind: string; fileName: string; contentType: string }): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }>`; `getPublicEnv(): { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string }`; browser `createClient()`.

Uploads bypass server actions (1 MB cap; an envelope is ~15 MB over ~150 frames). The admin asks the server for a signed URL per file, and the browser uploads straight to Storage. The bucket refuses anything but WebP and MP4, so photos from WhatsApp are converted first with `pnpm optimize:images <folder>`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/admin/media-paths.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MEDIA_KINDS, acceptsType, mediaPath } from '@/lib/admin/media-paths';

const INV = '22222222-2222-4222-8222-222222222222';

describe('media paths', () => {
  it('files an upload under its invitation and kind', () => {
    expect(mediaPath(INV, MEDIA_KINDS.PHOTOS, 'Beach Day.webp')).toBe(`${INV}/photos/beach-day.webp`);
  });

  it('keeps envelope frame numbers', () => {
    expect(mediaPath(INV, MEDIA_KINDS.ENVELOPE, '0042.webp')).toBe(`${INV}/envelope/0042.webp`);
  });

  it('cannot be steered out of its folder', () => {
    expect(mediaPath(INV, MEDIA_KINDS.PHOTOS, '../../other/x.webp')).toBe(`${INV}/photos/other-x.webp`);
  });

  it('takes video only for the opening screen', () => {
    expect(acceptsType(MEDIA_KINDS.HERO, 'video/mp4')).toBe(true);
    expect(acceptsType(MEDIA_KINDS.PHOTOS, 'video/mp4')).toBe(false);
    expect(acceptsType(MEDIA_KINDS.PHOTOS, 'image/jpeg')).toBe(false);
  });
});
```

Add to `tests/lib/env.test.ts`:

```ts
import { getPublicEnv } from '@/lib/env';

describe('getPublicEnv', () => {
  it('reads only the two public values', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    });
  });
});
```

(Merge the import into the file's existing imports; if the file restores `process.env` in an `afterEach`, keep that.)

Run both → FAIL.

- [ ] **Step 2: `lib/admin/media-paths.ts`**

```ts
export const MEDIA_BUCKET = 'invitation-media';

export const MEDIA_KINDS = {
  PHOTOS: 'photos',
  HERO: 'hero',
  ENVELOPE: 'envelope',
} as const;

export type MediaKind = (typeof MEDIA_KINDS)[keyof typeof MEDIA_KINDS];

const ACCEPTS: Record<MediaKind, readonly string[]> = {
  photos: ['image/webp'],
  hero: ['image/webp', 'video/mp4'],
  envelope: ['image/webp'],
};

export function acceptsType(kind: MediaKind, contentType: string): boolean {
  return ACCEPTS[kind].includes(contentType);
}

/**
 * `<invitationId>/<kind>/<clean-name>.<ext>`. The name is reduced to
 * lowercase words so no upload can climb out of its folder or collide on case.
 */
export function mediaPath(invitationId: string, kind: MediaKind, fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const stem = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';

  return `${invitationId}/${kind}/${stem}${ext ? `.${ext}` : ''}`;
}
```

- [ ] **Step 3: Public env and the browser client**

Append to `lib/env.ts`:

```ts
const publicEnvSchema = envSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

/**
 * The two values safe in a browser. Written out by literal name because Next
 * inlines NEXT_PUBLIC_* into client bundles only where `process.env.NAME`
 * appears in full; `env` above would reach for the service key and throw.
 */
export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
```

`lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/** Browser client. Used only to upload through a signed URL. */
export function createClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
```

- [ ] **Step 4: Server side — read and sign**

`lib/admin/media.ts`:

```ts
import 'server-only';
import { MEDIA_BUCKET, MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/server';

export async function listMedia(invitationId: string) {
  const supabase = await createClient();
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const files: { kind: MediaKind; name: string; url: string }[] = [];

  for (const kind of Object.values(MEDIA_KINDS)) {
    const folder = `${invitationId}/${kind}`;
    const { data, error } = await bucket.list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    for (const file of data) {
      files.push({ kind, name: file.name, url: bucket.getPublicUrl(`${folder}/${file.name}`).data.publicUrl });
    }
  }

  return files;
}
```

`lib/admin/media-actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { MEDIA_BUCKET, MEDIA_KINDS, acceptsType, mediaPath } from '@/lib/admin/media-paths';
import { requireAdmin } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

const uploadSchema = z.object({
  invitationId: z.uuid(),
  kind: z.enum(MEDIA_KINDS),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
});

/**
 * A one-time URL for the browser to upload a single file to. Signed as the
 * admin, so the storage policies decide; re-uploading the same name
 * replaces it, which is how a frame is corrected.
 */
export async function createUploadUrl(
  input: z.input<typeof uploadSchema>,
): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }> {
  await requireAdmin();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'That upload is not allowed.' };

  const { invitationId, kind, fileName, contentType } = parsed.data;
  if (!acceptsType(kind, contentType)) {
    return {
      ok: false,
      message: `${fileName}: ${kind} takes WebP${kind === MEDIA_KINDS.HERO ? ' or MP4' : ''}. Convert it with pnpm optimize:images <folder>.`,
    };
  }

  const supabase = await createClient();
  const path = mediaPath(invitationId, kind, fileName);
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error) return { ok: false, message: `${fileName}: could not start the upload.` };

  return { ok: true, path: data.path, token: data.token };
}
```

- [ ] **Step 5: The uploader**

`components/admin/MediaUploader.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { createUploadUrl } from '@/lib/admin/media-actions';
import { MEDIA_BUCKET, MEDIA_KINDS, type MediaKind } from '@/lib/admin/media-paths';
import { createClient } from '@/lib/supabase/client';

/** Files go browser to Storage, one signed URL each, never through a server action. */
export function MediaUploader({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<MediaKind>(MEDIA_KINDS.PHOTOS);
  const [files, setFiles] = useState<File[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload() {
    setBusy(true);
    const bucket = createClient().storage.from(MEDIA_BUCKET);
    const lines: string[] = [];

    for (const file of files) {
      const signed = await createUploadUrl({
        invitationId,
        kind,
        fileName: file.name,
        contentType: file.type,
      });
      if (!signed.ok) {
        lines.push(signed.message);
        continue;
      }
      const { error } = await bucket.uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type,
      });
      lines.push(error ? `${file.name}: upload failed.` : `${file.name}: uploaded.`);
    }

    setLog(lines);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect onChange={(event) => setKind(z.enum(MEDIA_KINDS).parse(event.target.value))} value={kind}>
          <option value={MEDIA_KINDS.PHOTOS}>Gallery photos</option>
          <option value={MEDIA_KINDS.HERO}>Opening photo or video</option>
          <option value={MEDIA_KINDS.ENVELOPE}>Envelope frames</option>
        </NativeSelect>
        <input
          accept="image/webp,video/mp4"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          type="file"
        />
        <Button disabled={busy || files.length === 0} onClick={upload} type="button">
          {busy ? 'Uploading' : `Upload ${files.length || ''}`.trim()}
        </Button>
      </div>
      {log.length ? (
        <ul className="text-muted-foreground">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

`components/admin/MediaSection.tsx`:

```tsx
import { MediaUploader } from '@/components/admin/MediaUploader';
import { listMedia } from '@/lib/admin/media';

/** Uploaded files with the URL to paste into the content JSON. */
export async function MediaSection({ invitationId }: { invitationId: string }) {
  const files = await listMedia(invitationId);

  return (
    <section className="grid gap-4">
      <h2 className="font-medium">Media</h2>
      <MediaUploader invitationId={invitationId} />
      {files.length ? (
        <ul className="grid gap-1 font-mono text-[12px]">
          {files.map((file) => (
            <li key={`${file.kind}/${file.name}`}>
              <span className="text-muted-foreground">{file.kind}/</span>
              {file.name} <span className="select-all text-muted-foreground">{file.url}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nothing uploaded yet.</p>
      )}
    </section>
  );
}
```

Render `<MediaSection invitationId={invitation.id} />` in the editor page where the Task 7 comment names it.

- [ ] **Step 6: Convert any folder**

In `scripts/optimize-images.mjs`, replace the fixed root with an optional argument and update the header comment:

```js
/* `pnpm optimize:images` converts public/. `pnpm optimize:images <folder>`
   converts that folder instead, e.g. photos saved from a client's WhatsApp,
   before they are uploaded to an invitation. */
const ROOT = process.argv[2] ? resolve(process.argv[2]) : PUBLIC_DIR;
```

and walk `ROOT` instead of `PUBLIC_DIR`.

- [ ] **Step 7: Verify and commit**

Run the tests → PASS. Then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

In the browser: on the test invitation upload one `.webp` as a gallery photo → "uploaded", and it lists with its public URL, which opens in a new tab; upload a `.jpg` → refused with the conversion hint.

```bash
git add lib/admin/media* lib/supabase/client.ts lib/env.ts components/admin/Media* app/admin scripts/optimize-images.mjs tests
git commit -m "feat: upload invitation media straight to storage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Approval and publishing

**Files:**
- Modify: `lib/admin/invitation-actions.ts` (add `approveOnBehalf`, `publishInvitation`)
- Create: `components/admin/ReviewPanel.tsx`
- Modify: `app/admin/(gated)/invitations/[id]/page.tsx` (render `ReviewPanel`)
- Test: `tests/lib/admin/publish.test.ts`

**Interfaces:**
- Consumes: `canPublish`, `PUBLISH_BLOCK` (Task 3); `ORDER_STATUS`; `EditorInvitation` (Task 7).
- Produces: `approveOnBehalf: FormAction` (fields `invitationId`, `note`); `publishInvitation: FormAction` (field `invitationId`); `ReviewPanel({ invitation })`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/admin/publish.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const { state } = vi.hoisted(() => ({
  state: { fake: null as ReturnType<typeof fakeSupabase> | null },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: async () => ({ userId: 'admin-1', email: 'ops@reve.lb' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { approveOnBehalf, publishInvitation } from '@/lib/admin/invitation-actions';
import { PUBLISH_BLOCK } from '@/lib/invitations/publish-guard';

const INV = '22222222-2222-4222-8222-222222222222';
const content = { coupleFirstName: 'Maya' };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function invitation(reviews: unknown[], orderStatus = 'review') {
  return {
    data: {
      id: INV, content, published_at: null,
      orders: { id: 'order-1', status: orderStatus, client_id: 'c' },
      invitation_reviews: reviews,
    },
  };
}

beforeEach(() => {
  state.fake = null;
});

describe('publishInvitation', () => {
  it('refuses without an approval', async () => {
    state.fake = fakeSupabase({ invitations: [invitation([])] });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({
      ok: false,
      message: PUBLISH_BLOCK.NO_APPROVAL,
    });
    expect(state.fake.find('invitations', 'update')).toBeUndefined();
  });

  /* Review Focus 1, through the action. */
  it('refuses content edited after approval', async () => {
    state.fake = fakeSupabase({
      invitations: [
        invitation([{ decision: 'approved', content_snapshot: { coupleFirstName: 'Mayya' }, created_at: '2026-10-01T00:00:00Z' }]),
      ],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({
      ok: false,
      message: PUBLISH_BLOCK.CONTENT_CHANGED,
    });
  });

  it('refuses while the order is not awaiting approval', async () => {
    state.fake = fakeSupabase({
      invitations: [invitation([{ decision: 'approved', content_snapshot: content, created_at: '2026-10-01T00:00:00Z' }], 'in_design')],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toMatchObject({ ok: false });
  });

  it('publishes exactly what was approved and delivers the order', async () => {
    state.fake = fakeSupabase({
      invitations: [
        invitation([{ decision: 'approved', content_snapshot: content, created_at: '2026-10-01T00:00:00Z' }]),
        { data: null },
      ],
      orders: [{ data: null }],
    });

    await expect(publishInvitation(null, form({ invitationId: INV }))).resolves.toEqual({ ok: true });
    expect(state.fake.find('invitations', 'update')?.args[0]).toMatchObject({ status: 'published' });
    expect(state.fake.find('orders', 'update')?.args[0]).toMatchObject({ status: 'delivered' });
  });
});

describe('approveOnBehalf', () => {
  it('records the current content as approved on the client\'s behalf', async () => {
    state.fake = fakeSupabase({
      invitations: [{ data: { id: INV, content } }],
      invitation_reviews: [{ data: null }],
    });

    await expect(
      approveOnBehalf(null, form({ invitationId: INV, note: 'Approved on WhatsApp 1 Oct' })),
    ).resolves.toEqual({ ok: true });
    expect(state.fake.find('invitation_reviews', 'insert')?.args[0]).toEqual({
      invitation_id: INV,
      decision: 'approved',
      content_snapshot: content,
      on_behalf: true,
      note: 'Approved on WhatsApp 1 Oct',
    });
  });
});
```

Run → FAIL (functions missing).

- [ ] **Step 2: Implement the two actions**

Append to `lib/admin/invitation-actions.ts` (imports: `canPublish` from `@/lib/invitations/publish-guard`; `ORDER_STATUS` from `@/lib/orders/status`):

```ts
export async function approveOnBehalf(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  const note = z.string().trim().max(500).safeParse(formData.get('note') ?? '');
  if (!id.success || !note.success) return { ok: false, message: UNEXPECTED };

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, content')
    .eq('id', id.data)
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  /* The snapshot IS the approval: it records exactly what was agreed. */
  const { error: insertError } = await supabase.from('invitation_reviews').insert({
    invitation_id: invitation.id,
    decision: 'approved',
    content_snapshot: invitation.content,
    on_behalf: true,
    note: note.data,
  });
  if (insertError) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.invitation(invitation.id));
  return { ok: true };
}

export async function publishInvitation(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get('invitationId'));
  if (!id.success) return { ok: false, message: UNEXPECTED };

  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, content, published_at, orders(id, status, client_id), invitation_reviews(decision, content_snapshot, created_at)')
    .eq('id', id.data)
    .order('created_at', { referencedTable: 'invitation_reviews', ascending: false })
    .limit(1, { referencedTable: 'invitation_reviews' })
    .maybeSingle();
  if (error || !invitation) return { ok: false, message: UNEXPECTED };

  const order = invitation.orders;
  if (!order || order.status !== ORDER_STATUS.REVIEW) {
    return { ok: false, message: 'Send the order for review before publishing.' };
  }

  const latest = invitation.invitation_reviews[0];
  const verdict = canPublish(
    invitation.content,
    latest ? { decision: latest.decision, contentSnapshot: latest.content_snapshot } : null,
  );
  if (!verdict.ok) return { ok: false, message: verdict.reason };

  const now = new Date().toISOString();
  const { error: publishError } = await supabase
    .from('invitations')
    .update({ status: 'published', published_at: invitation.published_at ?? now })
    .eq('id', invitation.id);
  if (publishError) return { ok: false, message: UNEXPECTED };

  /* Re-running after a failure here is safe: the content still matches its
     approval, so publishing again changes nothing and delivers the order. */
  const { error: deliverError } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.DELIVERED, updated_at: now })
    .eq('id', order.id);
  if (deliverError) return { ok: false, message: 'Published, but the order was not marked delivered. Publish again.' };

  revalidatePath(adminRoutes.invitation(invitation.id));
  revalidatePath(adminRoutes.client(order.client_id));
  return { ok: true };
}
```

- [ ] **Step 3: `components/admin/ReviewPanel.tsx`**

```tsx
import { ActionForm } from '@/components/admin/ActionForm';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EditorInvitation } from '@/lib/admin/invitations';
import { approveOnBehalf, publishInvitation } from '@/lib/admin/invitation-actions';

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function ReviewPanel({ invitation }: { invitation: EditorInvitation }) {
  return (
    <section className="grid gap-4">
      <h2 className="font-medium">Approval</h2>

      {invitation.invitation_reviews.length ? (
        <ul className="grid gap-1">
          {invitation.invitation_reviews.map((review) => (
            <li key={review.id}>
              {review.decision === 'approved' ? 'Approved' : 'Changes requested'}
              {review.on_behalf ? ' (recorded by Rêve)' : ''} · {when.format(new Date(review.created_at))}
              {review.note ? <span className="text-muted-foreground"> · {review.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No decision yet.</p>
      )}

      <ActionForm action={approveOnBehalf} submitLabel="Record approval of this version" variant="outline" successMessage="Approval recorded.">
        <input name="invitationId" type="hidden" value={invitation.id} />
        <Label htmlFor="note">Where they approved it</Label>
        <Textarea id="note" name="note" placeholder="Approved on WhatsApp, 1 October" />
      </ActionForm>

      <ActionForm action={publishInvitation} submitLabel={invitation.published_at ? 'Publish again' : 'Publish'} successMessage="Live.">
        <input name="invitationId" type="hidden" value={invitation.id} />
      </ActionForm>
    </section>
  );
}
```

Render `<ReviewPanel invitation={invitation} />` in the editor page where the Task 7 comment names it, and delete that comment.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/lib/admin/publish.test.ts` → PASS (5 tests). Then `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

In the browser, the whole pipeline on the test client: order "Awaiting approval" → "Publish" refused ("has not approved") → record approval → edit one letter and save → "Publish" refused ("changed after") → record approval again → "Publish" → "Live." → `/i/test-client` opens the envelope and the invitation; the client page shows the order Delivered.

```bash
git add lib/admin/invitation-actions.ts components/admin/ReviewPanel.tsx app/admin tests/lib/admin/publish.test.ts
git commit -m "feat: record approval and publish only what was approved

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Clean up the test data, staging notes, phase verification

**Files:**
- Modify: `STAGING_CHANGES.md` (untracked)

- [ ] **Step 1: Remove the browser-test records**

With `execute_sql` (data, not schema), after reading back what will go:

```sql
select c.id, c.email, o.reference, i.slug
from clients c join orders o on o.client_id = c.id
left join invitations i on i.order_id = o.id
where c.email like 'test.client%@example.com';
```

Then delete that invitation's storage objects (`delete from storage.objects where bucket_id = 'invitation-media' and name like '<invitation id>/%'`), then `delete from invitations where order_id in (...)`, `delete from orders where client_id in (...)`, `delete from clients where email like 'test.client%@example.com'`. Report the rows removed.

- [ ] **Step 2: Staging notes**

Append to `STAGING_CHANGES.md`:

```markdown
## Phase 2 — Admin
- Migration 0005: `private.is_admin()` (schema not exposed by PostgREST, EXECUTE to authenticated) replaces `public.is_admin()`; every admin policy recreated on it; `authenticated` regains table grants on `invitations`. INVARIANT: a helper used in RLS must be executable by the role the policy runs as; revoking it from `authenticated` silently breaks every policy that calls it.
- `templates` table dropped; the registry is the only list of designs. `orders` lost customer_* and template_slug, gained client_id, due_at, RV-#### reference default. `invitations.order_id` unique. `invitation_reviews` (snapshot = the approval). Bucket `invitation-media` (public read, admin write, WebP/MP4 only, 50 MB).
- Pure rules: lib/orders/status.ts (flows per tier; DELIVERED only via publish), lib/orders/upgrade.ts, lib/invitations/{slug,content,publish-guard}.ts.
- Admin actions return ActionResult; one generic client island `ActionForm`. Reads in lib/admin/*.ts.
- AppSurface moved from app/admin/layout.tsx into the admin UI segments; /admin/preview/[id] is bare so the design is not repainted.
- Uploads: signed upload URL per file (server action) + browser `uploadToSignedUrl`; server actions are capped at 1 MB.

## Trace: build and deliver
client page -> OrderPanel moveOrder(paid) -> due_at = now + 48h -> provisionInvitation(design) -> slug from name (+suffix) -> editor
editor -> saveContent -> checkContent(design schema) -> content stored parsed -> iframe /admin/preview/[id] reloads
-> moveOrder(review) requires valid content -> approveOnBehalf (snapshot) -> publishInvitation -> canPublish(content == snapshot) -> invitation published, order delivered -> /i/<slug> live
```

- [ ] **Step 3: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all pass; report the test count.
Run: MCP `get_advisors` (security) → only the known `security_definer_view`; report anything else.
```

That is the last task. Review then goes to the whole branch.
