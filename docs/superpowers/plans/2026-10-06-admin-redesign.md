# Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Rêve admin look like the brand, replace the JSON editor with a schema-driven form, give the client page a clear next action, and let the operator delete a client safely.

**Architecture:** The admin's shadcn tokens are remapped to the Rêve palette at `[data-surface="app"]`, so every primitive re-skins at once. New pure helpers (`summarize`, `nextMove`, `formModel`, `pruneContent`, `publishReadiness`) carry the logic and are unit-tested; pages and small client islands only render them. Client deletion is one Postgres function (one transaction, RLS applies) followed by storage cleanup in the server action.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, shadcn (base-ui, `base-nova`), zod 4, Supabase (`@supabase/ssr`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-admin-redesign-design.md`

## Global Constraints

- `pnpm` only. Verification before every commit: `pnpm lint && pnpm typecheck && pnpm test`.
- TypeScript strict; `any` is forbidden (use `unknown`). No `as` casts where a type guard or zod parse works.
- shadcn primitives are added with `pnpm dlx shadcn@latest add <name>` and never hand-edited (`components/ui/*`).
- Schema changes only through an append-only migration in `supabase/migrations/` (`0007_admin_delete_client.sql`), applied with the Supabase MCP `apply_migration`, then regenerate `lib/supabase/database.types.ts`.
- Every admin page and action starts with `await requireAdmin()`. Inputs are zod-validated at every action boundary.
- No magic strings: routes in `lib/routes.ts`, notices as constants, statuses via `ORDER_STATUS`.
- Copy: no mid-sentence em-dashes in user-facing text. Em-dashes are fine in code comments.
- Small or monospaced type keeps `WebkitFontSmoothing: 'antialiased'` (already on `AppSurface`); pixel font floors (`text-[11px]` minimum).
- The storefront must not change: storefront tokens live outside `[data-surface="app"]`; `PhoneFrame` keeps its current default width.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Record structural notes in `STAGING_CHANGES.md` (untracked) during work; ARCHITECTURE.md is updated only in Task 7.

## Review Focus

1. Typing the client's name with different case or stray spaces must still enable Delete, and the server must agree with the dialog (`namesMatch` test in Task 4; the SQL uses `lower(btrim())`).
2. A page left open while the invitation gets published elsewhere: Delete must be refused by the server with "Unpublish their invitation first." (RV002 mapping test in Task 4).
3. Invalid JSON typed in the Advanced tab must not be thrown away when switching back to the form (`parseContentText` test in Task 5).
4. Clearing an optional field (headline) must save it as absent, never `""`; keys the form does not know must survive a save (`pruneContent` tests in Task 5).
5. An event at 23:30 local time must come back as the same local time after a save, in any time zone (`isoToLocalInput`/`localInputToIso` round-trip test in Task 5).

---

## File Structure

| File | Responsibility |
|---|---|
| `app/globals.css` | Admin tokens → Rêve palette; heading face; no faux bold |
| `components/admin/Breadcrumbs.tsx` | Trail on inner admin pages |
| `components/admin/Eyebrow.tsx` | Small tracked uppercase label |
| `components/admin/StatusBadge.tsx` | Per-stage tone badge |
| `app/admin/(gated)/layout.tsx` | Branded top bar |
| `app/i/[slug]/not-found.tsx` | Branded unavailable page |
| `lib/constants.ts` | + `TIER_LABELS` |
| `lib/admin/summary.ts` | `CLIENT_VIEWS`, `isActive`, `isDueSoon`, `isOverdue`, `summarize` |
| `lib/admin/clients.ts` | + `view` filter, `getOrderSummary` |
| `components/admin/AutoSubmitForm.tsx` | GET form that submits when a select changes |
| `components/admin/SummaryTiles.tsx` | Four count tiles |
| `components/admin/ClientRows.tsx` | Table on desktop, cards on mobile |
| `app/admin/(gated)/page.tsx` | Clients list composition |
| `lib/orders/status.ts` | + `nextMove`, `previousMove` |
| `lib/contact.ts` | + `whatsappChat(phone)` |
| `components/admin/StageStepper.tsx` | Stage progress for one order |
| `components/admin/OrderMenu.tsx` | "⋯" menu with back / upgrade / cancel dialogs |
| `components/admin/OrderCard.tsx` | One order: header, stepper, primary move, invitation row |
| `components/admin/ActionForm.tsx` | + `onSuccess`, `disabled` |
| `components/admin/OrderPanel.tsx` | Deleted (folded into OrderCard + OrderMenu) |
| `app/admin/(gated)/clients/[id]/page.tsx` | Client page composition |
| `supabase/migrations/0007_admin_delete_client.sql` | `admin_delete_client` function |
| `lib/admin/names.ts` | `namesMatch` (shared by dialog and action messages) |
| `lib/admin/media.ts` | + `removeInvitationMedia` |
| `lib/admin/client-actions.ts` | + `deleteClient` |
| `components/admin/DeleteClientDialog.tsx` | Typed-name confirm dialog |
| `lib/routes.ts` | `NOTICE_PARAM` (renamed), `ADMIN_NOTICE` |
| `tests/helpers/fake-supabase.ts` | + `rpc`, `storage` |
| `lib/schemas/content/core.ts`, `blocks.ts` | + `label`, `multiline`, `media` meta |
| `lib/admin/content-form.ts` | `formModel`, `pruneContent`, `emptyValue`, date helpers, `parseContentText` |
| `components/admin/content-form/FieldControl.tsx` | One field, recursive for groups and lists |
| `components/admin/ContentEditor.tsx` | Form / JSON tabs, save, sticky phone preview |
| `components/store/PhoneFrame.tsx` | + optional `maxWidth` |
| `lib/invitations/publish-guard.ts` | + `publishReadiness`, `NOT_IN_REVIEW` |
| `lib/admin/invitation-actions.ts` | `publishInvitation` uses `publishReadiness` |
| `components/admin/ReviewPanel.tsx` | Timeline; Publish disabled with reason |
| `components/admin/MediaUploader.tsx` | Drop zone |
| `components/admin/MediaSection.tsx` | Takes files as a prop |
| `app/admin/(gated)/invitations/[id]/page.tsx` | Editor page composition |

---

### Task 1: Brand surface, shell, breadcrumbs, badges, not-found

**Files:**
- Modify: `app/globals.css` (the `@theme inline` `--font-heading` line and the `[data-surface="app"]` block, around lines 89 and 278-306)
- Create: `components/admin/Breadcrumbs.tsx`, `components/admin/Eyebrow.tsx`
- Modify: `components/admin/StatusBadge.tsx`, `app/admin/(gated)/layout.tsx`, `app/i/[slug]/not-found.tsx`, `app/admin/login/page.tsx`
- Test: `tests/components/admin/breadcrumbs.test.tsx`, `tests/components/admin/status-badge.test.tsx`

**Interfaces:**
- Produces: `Breadcrumbs({ items: readonly Crumb[] })`, `type Crumb = { label: string; href?: string }`; `Eyebrow({ children, className? })`; `StatusBadge({ status })` renders `<span data-status={status}>`.

- [ ] **Step 1: Write the failing tests**

`tests/components/admin/breadcrumbs.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('links every crumb but the last, which marks the current page', () => {
    render(<Breadcrumbs items={[{ label: 'Clients', href: '/admin' }, { label: 'Maya Haddad' }]} />);

    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/admin');
    expect(screen.getByText('Maya Haddad')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Maya Haddad' })).toBeNull();
  });
});
```

`tests/components/admin/status-badge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/admin/StatusBadge';

describe('StatusBadge', () => {
  it('shows the admin wording and carries the stage for styling', () => {
    render(<StatusBadge status="review" />);
    const badge = screen.getByText('Awaiting approval');
    expect(badge).toHaveAttribute('data-status', 'review');
  });

  it('strikes through a cancelled order', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled').className).toContain('line-through');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/components/admin/breadcrumbs.test.tsx tests/components/admin/status-badge.test.tsx`
Expected: FAIL (Breadcrumbs module not found; StatusBadge has no `data-status`).

- [ ] **Step 3: Implement**

`components/admin/Breadcrumbs.tsx`:
```tsx
import Link from 'next/link';

export type Crumb = { label: string; href?: string };

/** Where an inner admin page sits. The last crumb is the page itself. */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li className="flex items-center gap-1.5" key={`${index}:${item.label}`}>
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link className="hover:text-foreground" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

`components/admin/Eyebrow.tsx`:
```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The small tracked capitals the storefront uses over a heading ("GUEST LIST"). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] uppercase tracking-[0.2em] text-muted-foreground', className)}>
      {children}
    </p>
  );
}
```

`components/admin/StatusBadge.tsx` (replace the file; a plain span, because `Badge`'s variant classes would fight the tone classes):
```tsx
import { STATUS_LABELS, type OrderStatus } from '@/lib/orders/status';
import { cn } from '@/lib/utils';

const EARLY = 'bg-secondary text-secondary-foreground';

/* Early stages recede; the stage that needs the client (review) is wine;
   delivered is the one solid mark. */
const TONE: Record<OrderStatus, string> = {
  pending_payment: EARLY,
  paid: EARLY,
  brief: EARLY,
  concept: EARLY,
  in_design: 'bg-taupe/25 text-cocoa',
  review: 'bg-wine/10 text-wine',
  delivered: 'bg-ink text-bone',
  cancelled: 'text-muted-foreground line-through',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap',
        TONE[status],
      )}
      data-status={status}
    >
      {STATUS_LABELS[status].admin}
    </span>
  );
}
```

`app/globals.css`: in `@theme inline`, replace `--font-heading: var(--font-sans);` with
```css
  --font-heading: var(--font-marcellus), Georgia, "Times New Roman", serif;
```
(only `components/ui/card.tsx` and admin code use `font-heading`; confirm with `grep -rn "font-heading" app components` that nothing in the storefront does.)

Replace the `[data-surface="app"] { ... }` token block with:
```css
[data-surface="app"] {
  --background: var(--reve-bone);
  --foreground: var(--reve-ink);
  --card: #fffdf9;
  --card-foreground: var(--reve-ink);
  --popover: #fffdf9;
  --popover-foreground: var(--reve-ink);
  --primary: var(--reve-ink);
  --primary-foreground: var(--reve-bone);
  --secondary: #efe7dc;
  --secondary-foreground: var(--reve-ink);
  --muted: #efe7dc;
  --muted-foreground: var(--reve-cocoa);
  --accent: #efe7dc;
  --accent-foreground: var(--reve-ink);
  --destructive: var(--reve-wine);
  --border: var(--reve-sand);
  --input: var(--reve-sand);
  --ring: var(--reve-taupe);
  --radius: 0.75rem;
}
```
Update the comment above it: the private surfaces now use the Rêve palette through shadcn's token names. In the `@layer base` block, add `font-synthesis-weight: none;` to the `[data-surface="app"]` rule (Marcellus has one weight; a synthesised bold looks smeared):
```css
  [data-surface="app"] {
    @apply bg-background text-foreground font-sans;
    font-synthesis-weight: none;
  }
```

`app/admin/(gated)/layout.tsx` (replace the header):
```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppSurface } from '@/components/admin/AppSurface';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/actions';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES } from '@/lib/routes';

/* /admin/login sits OUTSIDE this group: inside it, the guard would redirect
   the login page to itself. */
export default async function GatedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <AppSurface>
      <header className="border-b bg-card/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-6">
            <Link className="font-heading text-[22px] tracking-wide" href={ROUTES.ADMIN}>
              Rêve
            </Link>
            <nav aria-label="Admin">
              <Link className="text-[13px] text-muted-foreground hover:text-foreground" href={ROUTES.ADMIN}>
                Clients
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-muted-foreground sm:inline">{admin.email}</span>
            <form action={signOut}>
              <Button size="sm" type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </AppSurface>
  );
}
```

`app/admin/login/page.tsx`: replace `<CardTitle>Rêve admin</CardTitle>` with
```tsx
<p className="font-heading text-[26px] tracking-wide">Rêve</p>
<p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Studio sign in</p>
```
and drop the now-unused `CardTitle` import.

`app/i/[slug]/not-found.tsx`:
```tsx
export default function InvitationNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bone px-6 text-center text-ink">
      <div className="grid justify-items-center gap-5">
        <p className="font-display text-[15px] uppercase tracking-[0.3em] text-cocoa">Rêve</p>
        <h1 className="font-display text-[32px] leading-tight sm:text-[40px]">
          This invitation is <span className="font-accent italic text-wine">not available</span>
        </h1>
        <p className="max-w-sm text-[15px] text-cocoa">
          The link may be incorrect, or the invitation may not be published yet.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/components/admin`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add app/globals.css components/admin/Breadcrumbs.tsx components/admin/Eyebrow.tsx components/admin/StatusBadge.tsx "app/admin/(gated)/layout.tsx" app/admin/login/page.tsx "app/i/[slug]/not-found.tsx" tests/components/admin/breadcrumbs.test.tsx tests/components/admin/status-badge.test.tsx
git commit -m "feat: dress the admin in the Rêve palette and type"
```

---

### Task 2: Clients list

**Files:**
- Create: `lib/admin/summary.ts`, `components/admin/AutoSubmitForm.tsx`, `components/admin/SummaryTiles.tsx`, `components/admin/ClientRows.tsx`
- Modify: `lib/constants.ts`, `lib/admin/clients.ts`, `app/admin/(gated)/page.tsx`
- Test: `tests/lib/admin/summary.test.ts`, `tests/lib/admin/clients.test.ts`

**Interfaces:**
- Consumes: `StatusBadge`, `Eyebrow` (Task 1).
- Produces: `CLIENT_VIEWS = { ACTIVE: 'active', DUE: 'due', OVERDUE: 'overdue', REVIEW: 'review' }`, `type ClientView`; `isActive(status)`, `isDueSoon(order, now)`, `isOverdue(order, now)`, `summarize(orders, now): Record<ClientView, number>`; `TIER_LABELS: Record<Tier, string>`; `listClients(filters, now?)`; `getOrderSummary(now?)`; `clientFiltersSchema` gains `view`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/admin/summary.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isDueSoon, isOverdue, summarize } from '@/lib/admin/summary';

const now = new Date('2026-10-06T12:00:00.000Z');
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

describe('order summary', () => {
  it('counts active, due within 48 hours, overdue and awaiting approval', () => {
    expect(
      summarize(
        [
          { status: 'paid', due_at: hours(10) },
          { status: 'in_design', due_at: hours(-1) },
          { status: 'review', due_at: null },
          { status: 'pending_payment', due_at: hours(72) },
          { status: 'delivered', due_at: hours(-50) },
          { status: 'cancelled', due_at: hours(-50) },
        ],
        now,
      ),
    ).toEqual({ active: 4, due: 1, overdue: 1, review: 1 });
  });

  it('never calls a delivered or cancelled order overdue', () => {
    expect(isOverdue({ status: 'delivered', due_at: hours(-5) }, now)).toBe(false);
    expect(isOverdue({ status: 'cancelled', due_at: hours(-5) }, now)).toBe(false);
  });

  it('treats the 48-hour edge as due and anything past it as not yet', () => {
    expect(isDueSoon({ status: 'paid', due_at: hours(48) }, now)).toBe(true);
    expect(isDueSoon({ status: 'paid', due_at: hours(49) }, now)).toBe(false);
  });
});
```

Append to `tests/lib/admin/clients.test.ts` (keep the existing `searchPattern` block; add the mocks at the top of the file, above the existing import):
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { clientFiltersSchema, listClients, searchPattern } from '@/lib/admin/clients';

beforeEach(() => {
  state.fake = fakeSupabase({ clients: [{ data: [] }] });
});

describe('clientFiltersSchema', () => {
  it('ignores a view it does not know rather than failing the page', () => {
    expect(clientFiltersSchema.parse({ view: 'everything' }).view).toBeUndefined();
    expect(clientFiltersSchema.parse({ view: 'overdue' }).view).toBe('overdue');
  });
});

describe('listClients views', () => {
  const now = new Date('2026-10-06T12:00:00.000Z');

  it('asks for active orders past their due time for the overdue view', async () => {
    await listClients({ view: 'overdue' }, now);
    expect(state.fake?.find('clients', 'lt')?.args).toEqual(['orders.due_at', now.toISOString()]);
    expect(state.fake?.find('clients', 'not')?.args).toEqual([
      'orders.status',
      'in',
      '(delivered,cancelled)',
    ]);
  });

  it('asks for orders in review for the awaiting-approval view', async () => {
    await listClients({ view: 'review' }, now);
    expect(state.fake?.find('clients', 'eq')?.args).toEqual(['orders.status', 'review']);
  });
});
```
(Replace the file's original first import line `import { describe, expect, it } from 'vitest';` and `import { searchPattern } ...` with the lines above.)

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/lib/admin/summary.test.ts tests/lib/admin/clients.test.ts`
Expected: FAIL (`@/lib/admin/summary` missing; `view` not in schema).

- [ ] **Step 3: Implement**

`lib/constants.ts`, after `TIERS`/`Tier`:
```ts
export const TIER_LABELS: Record<Tier, string> = {
  basic: 'Basic',
  managed: 'Managed',
  custom: 'Custom',
};
```

`lib/admin/summary.ts`:
```ts
import { ORDER_STATUS, type OrderStatus } from '@/lib/orders/status';

/** The list's quick views, carried in `?view=`. */
export const CLIENT_VIEWS = {
  ACTIVE: 'active',
  DUE: 'due',
  OVERDUE: 'overdue',
  REVIEW: 'review',
} as const;

export type ClientView = (typeof CLIENT_VIEWS)[keyof typeof CLIENT_VIEWS];

/** "Due soon" means due within this window from now. */
export const DUE_WINDOW_MS = 48 * 60 * 60 * 1000;

export const CLOSED_STATUSES: readonly OrderStatus[] = [
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
];

type SummaryOrder = { status: OrderStatus; due_at: string | null };

export function isActive(status: OrderStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}

export function isOverdue(order: SummaryOrder, now: Date): boolean {
  return (
    isActive(order.status) &&
    order.due_at !== null &&
    new Date(order.due_at).getTime() < now.getTime()
  );
}

export function isDueSoon(order: SummaryOrder, now: Date): boolean {
  if (!isActive(order.status) || order.due_at === null) return false;
  const due = new Date(order.due_at).getTime();
  return due >= now.getTime() && due <= now.getTime() + DUE_WINDOW_MS;
}

export function summarize(
  orders: readonly SummaryOrder[],
  now: Date,
): Record<ClientView, number> {
  return {
    active: orders.filter((order) => isActive(order.status)).length,
    due: orders.filter((order) => isDueSoon(order, now)).length,
    overdue: orders.filter((order) => isOverdue(order, now)).length,
    review: orders.filter((order) => order.status === ORDER_STATUS.REVIEW).length,
  };
}
```

`lib/admin/clients.ts`: add imports `import { CLIENT_VIEWS, CLOSED_STATUSES, DUE_WINDOW_MS, summarize } from '@/lib/admin/summary';`, then:
```ts
export const clientFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(ORDER_STATUS).optional().catch(undefined),
  tier: z.enum(TIERS).optional().catch(undefined),
  view: z.enum(CLIENT_VIEWS).optional().catch(undefined),
});

/* PostgREST's `in` list for the embedded orders filter. */
const CLOSED_LIST = `(${CLOSED_STATUSES.join(',')})`;
```
Change the list signature to `export async function listClients(filters: ClientFilters, now = new Date())` and add after the tier filter:
```ts
  if (filters.view === CLIENT_VIEWS.REVIEW) {
    query = query.eq('orders.status', ORDER_STATUS.REVIEW);
  } else if (filters.view) {
    query = query.not('orders.status', 'in', CLOSED_LIST);
    if (filters.view === CLIENT_VIEWS.OVERDUE) {
      query = query.lt('orders.due_at', now.toISOString());
    }
    if (filters.view === CLIENT_VIEWS.DUE) {
      query = query
        .gte('orders.due_at', now.toISOString())
        .lte('orders.due_at', new Date(now.getTime() + DUE_WINDOW_MS).toISOString());
    }
  }
```
Add:
```ts
/** Counts for the summary tiles, over every open order. */
export async function getOrderSummary(now = new Date()) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('status, due_at')
    .not('status', 'in', CLOSED_LIST);
  if (error) throw error;
  return summarize(data, now);
}
```

`components/admin/AutoSubmitForm.tsx`:
```tsx
'use client';

import type { ReactNode } from 'react';

/**
 * The list's GET form. A select applies as soon as it changes; the search box
 * still waits for Enter, so typing does not navigate on every key. Without
 * JavaScript it is an ordinary form.
 */
export function AutoSubmitForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form
      className={className}
      method="get"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
```

`components/admin/SummaryTiles.tsx`:
```tsx
import Link from 'next/link';
import { CLIENT_VIEWS, type ClientView } from '@/lib/admin/summary';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const TILES: { view: ClientView; label: string }[] = [
  { view: CLIENT_VIEWS.ACTIVE, label: 'Active' },
  { view: CLIENT_VIEWS.DUE, label: 'Due in 48h' },
  { view: CLIENT_VIEWS.OVERDUE, label: 'Overdue' },
  { view: CLIENT_VIEWS.REVIEW, label: 'Awaiting approval' },
];

/** The guest-list card's counter row, reused for the studio's own numbers. */
export function SummaryTiles({
  counts,
  current,
}: {
  counts: Record<ClientView, number>;
  current: ClientView | undefined;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card sm:grid-cols-4">
      {TILES.map((tile) => {
        const active = current === tile.view;
        return (
          <Link
            aria-current={active ? 'true' : undefined}
            className={cn(
              'border-b p-5 transition-colors hover:bg-muted sm:border-b-0 sm:border-r sm:last:border-r-0',
              active && 'bg-muted',
            )}
            href={active ? ROUTES.ADMIN : `${ROUTES.ADMIN}?view=${tile.view}`}
            key={tile.view}
          >
            <span
              className={cn(
                'block text-[32px] leading-none',
                tile.view === CLIENT_VIEWS.OVERDUE && counts.overdue > 0 && 'text-wine',
              )}
            >
              {counts[tile.view]}
            </span>
            <span className="mt-3 block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {tile.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
```

`components/admin/ClientRows.tsx`:
```tsx
import Link from 'next/link';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { ClientListRow } from '@/lib/admin/clients';
import { isOverdue } from '@/lib/admin/summary';
import { TIER_LABELS } from '@/lib/constants';
import { adminRoutes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function latestOrder(client: ClientListRow) {
  return [...client.orders].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

function Due({ order, now }: { order: ClientListRow['orders'][number]; now: Date }) {
  if (!order.due_at) return <span className="text-muted-foreground">No date</span>;
  const late = isOverdue(order, now);
  return (
    <span className={cn(late && 'font-medium text-wine')}>
      {late ? 'Overdue · ' : ''}
      {dateFormat.format(new Date(order.due_at))}
    </span>
  );
}

/** A table from md up, stacked cards below it. Same data, same links. */
export function ClientRows({ clients, now }: { clients: readonly ClientListRow[]; now: Date }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="hidden w-full text-left md:table">
        <thead className="border-b text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-normal">Client</th>
            <th className="px-5 py-3 font-normal">Latest order</th>
            <th className="px-5 py-3 font-normal">Stage</th>
            <th className="px-5 py-3 font-normal">Due</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const latest = latestOrder(client);
            return (
              <tr className="border-b last:border-b-0 hover:bg-muted/50" key={client.id}>
                <td className="px-5 py-4">
                  <Link className="font-medium hover:underline" href={adminRoutes.client(client.id)}>
                    {client.full_name}
                  </Link>
                  <div className="text-muted-foreground">{client.phone}</div>
                </td>
                <td className="px-5 py-4">
                  {latest.reference} · {TIER_LABELS[latest.tier]}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={latest.status} />
                </td>
                <td className="px-5 py-4">
                  <Due now={now} order={latest} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="md:hidden">
        {clients.map((client) => {
          const latest = latestOrder(client);
          return (
            <li className="border-b last:border-b-0" key={client.id}>
              <Link className="grid gap-2 p-4" href={adminRoutes.client(client.id)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{client.full_name}</span>
                  <StatusBadge status={latest.status} />
                </span>
                <span className="flex justify-between gap-3 text-muted-foreground">
                  <span>
                    {latest.reference} · {TIER_LABELS[latest.tier]}
                  </span>
                  <Due now={now} order={latest} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

`app/admin/(gated)/page.tsx` (replace):
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoSubmitForm } from '@/components/admin/AutoSubmitForm';
import { ClientRows } from '@/components/admin/ClientRows';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { SummaryTiles } from '@/components/admin/SummaryTiles';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { clientFiltersSchema, getOrderSummary, listClients } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS, TIER_LABELS } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS } from '@/lib/orders/status';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filters = clientFiltersSchema.parse(params);
  const now = new Date();
  const [clients, counts] = await Promise.all([listClients(filters, now), getOrderSummary(now)]);
  const filtering = Boolean(filters.q || filters.status || filters.tier || filters.view);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Studio</Eyebrow>
          <h1 className="mt-2 font-heading text-[34px] leading-tight">Clients</h1>
        </div>
        <Link className={buttonVariants({ size: 'lg' })} href={ROUTES.ADMIN_NEW_CLIENT}>
          New client
        </Link>
      </header>

      <SummaryTiles counts={counts} current={filters.view} />

      <AutoSubmitForm className="flex flex-wrap gap-2">
        {filters.view ? <input name="view" type="hidden" value={filters.view} /> : null}
        <Input
          aria-label="Search clients"
          className="w-full sm:w-64"
          defaultValue={filters.q ?? ''}
          name="q"
          placeholder="Name, email or phone"
        />
        <NativeSelect aria-label="Stage" defaultValue={filters.status ?? ''} name="status">
          <option value="">Any stage</option>
          {Object.values(ORDER_STATUS).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status].admin}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Tier" defaultValue={filters.tier ?? ''} name="tier">
          <option value="">Any tier</option>
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </NativeSelect>
        {filtering ? (
          <Link className={buttonVariants({ variant: 'ghost' })} href={ROUTES.ADMIN}>
            Clear
          </Link>
        ) : null}
      </AutoSubmitForm>

      {clients.length > 0 ? (
        <ClientRows clients={clients} now={now} />
      ) : filtering ? (
        <p className="text-muted-foreground">No clients match.</p>
      ) : (
        <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <p className="font-heading text-[24px]">No clients yet</p>
          <p className="max-w-sm text-muted-foreground">
            Add the first one when an order comes in on WhatsApp.
          </p>
          <Link className={buttonVariants()} href={ROUTES.ADMIN_NEW_CLIENT}>
            New client
          </Link>
        </div>
      )}
    </main>
  );
}
```
(`LIST_SELECT` already selects `phone`; no change needed there.)

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/lib/admin`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add lib/constants.ts lib/admin/summary.ts lib/admin/clients.ts components/admin/AutoSubmitForm.tsx components/admin/SummaryTiles.tsx components/admin/ClientRows.tsx "app/admin/(gated)/page.tsx" tests/lib/admin/summary.test.ts tests/lib/admin/clients.test.ts
git commit -m "feat: summarise the studio's orders and flag what is overdue"
```

---

### Task 3: Client page, stage stepper, order menu

**Files:**
- Run: `pnpm dlx shadcn@latest add dialog dropdown-menu`
- Modify: `lib/orders/status.ts`, `lib/contact.ts`, `components/admin/ActionForm.tsx`, `app/admin/(gated)/clients/[id]/page.tsx`
- Create: `components/admin/StageStepper.tsx`, `components/admin/OrderMenu.tsx`, `components/admin/OrderCard.tsx`
- Delete: `components/admin/OrderPanel.tsx`
- Test: `tests/lib/orders/status.test.ts`, `tests/lib/contact.test.ts`, `tests/components/admin/action-form.test.tsx`, `tests/components/admin/stage-stepper.test.tsx`

**Interfaces:**
- Consumes: `Breadcrumbs`, `Eyebrow`, `StatusBadge` (Task 1); `TIER_LABELS` (Task 2).
- Produces: `nextMove(tier, from): OrderStatus | null`; `previousMove(tier, from): OrderStatus | null`; `whatsappChat(phone): string | null`; `ActionForm` props `onSuccess?: () => void`, `disabled?: boolean`; `StageStepper({ tier, status })`; `OrderCard({ order })` with `order: ClientDetail['orders'][number]`.

- [ ] **Step 1: Add the primitives**

Run: `pnpm dlx shadcn@latest add dialog dropdown-menu`
Then read `components/ui/dialog.tsx` and `components/ui/dropdown-menu.tsx` and confirm the export names used below: `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger` and `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger`. In base-nova these triggers take a `render` prop (not `asChild`). If a name differs, use the generated one.

- [ ] **Step 2: Write the failing tests**

Append to `tests/lib/orders/status.test.ts` (add `nextMove, previousMove` to the existing import):
```ts
describe('the primary and back moves', () => {
  it('offers the next stage forward as the primary move', () => {
    expect(nextMove(TIERS.MANAGED, ORDER_STATUS.PAID)).toBe(ORDER_STATUS.IN_DESIGN);
    expect(nextMove(TIERS.CUSTOM, ORDER_STATUS.PAID)).toBe(ORDER_STATUS.BRIEF);
  });

  it('offers no primary move in review: publishing delivers', () => {
    expect(nextMove(TIERS.MANAGED, ORDER_STATUS.REVIEW)).toBeNull();
  });

  it('offers nothing once delivered or cancelled', () => {
    for (const status of [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED]) {
      expect(nextMove(TIERS.BASIC, status)).toBeNull();
      expect(previousMove(TIERS.BASIC, status)).toBeNull();
    }
  });

  it('steps back one stage, and not before the first', () => {
    expect(previousMove(TIERS.MANAGED, ORDER_STATUS.IN_DESIGN)).toBe(ORDER_STATUS.PAID);
    expect(previousMove(TIERS.MANAGED, ORDER_STATUS.PENDING_PAYMENT)).toBeNull();
  });
});
```

`tests/lib/contact.test.ts` exists; append (add `whatsappChat` to its import from `@/lib/contact`):
```ts
describe('whatsappChat', () => {
  it('opens a chat with the digits of an international number', () => {
    expect(whatsappChat('+961 70 123 456')).toBe('https://wa.me/96170123456');
    expect(whatsappChat('00961 70 123 456')).toBe('https://wa.me/96170123456');
  });

  it('gives nothing for a number too short to dial', () => {
    expect(whatsappChat('123')).toBeNull();
  });
});
```

Append to `tests/components/admin/action-form.test.tsx`:
```tsx
  it('tells its owner when the action succeeded', async () => {
    const accept = async (): Promise<ActionResult> => ({ ok: true });
    let succeeded = false;

    render(<ActionForm action={accept} onSuccess={() => (succeeded = true)} submitLabel="Go" />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() => expect(succeeded).toBe(true));
  });

  it('can be held shut', () => {
    render(<ActionForm action={async () => ({ ok: true })} disabled submitLabel="Publish" />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
```
(place inside the existing `describe`).

`tests/components/admin/stage-stepper.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StageStepper } from '@/components/admin/StageStepper';

describe('StageStepper', () => {
  it('marks stages done up to the current one', () => {
    const { container } = render(<StageStepper status="in_design" tier="managed" />);

    expect(container.querySelectorAll('[data-state="done"]')).toHaveLength(2);
    expect(screen.getByText('In design').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('greys every stage of a cancelled order', () => {
    const { container } = render(<StageStepper status="cancelled" tier="managed" />);
    expect(container.querySelectorAll('[data-state="off"]')).toHaveLength(5);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm vitest run tests/lib/orders/status.test.ts tests/lib/contact.test.ts tests/components/admin`
Expected: FAIL (missing exports and component).

- [ ] **Step 4: Implement**

`lib/orders/status.ts`, after `allowedMoves`:
```ts
/** The forward move an order's primary button offers, or null. */
export function nextMove(tier: Tier, from: OrderStatus): OrderStatus | null {
  const flow = FLOWS[tier];
  const at = flow.indexOf(from);
  const next = at === -1 ? undefined : flow[at + 1];
  return next && allowedMoves(tier, from).includes(next) ? next : null;
}

/** The one step back an order may take, or null. */
export function previousMove(tier: Tier, from: OrderStatus): OrderStatus | null {
  const flow = FLOWS[tier];
  const at = flow.indexOf(from);
  const previous = at > 0 ? flow[at - 1] : undefined;
  return previous && allowedMoves(tier, from).includes(previous) ? previous : null;
}
```

`lib/contact.ts`, append:
```ts
/**
 * A wa.me chat with a client, from the number as it was typed. A leading 00
 * is the international prefix; wa.me wants the digits alone.
 */
export function whatsappChat(phone: string): string | null {
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
```

`components/admin/ActionForm.tsx`: add `onSuccess?: () => void;` and `disabled?: boolean;` to the props type and destructuring, then:
```tsx
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.ok) onSuccess?.();
      return next;
    },
    null,
  );
```
and `<Button disabled={pending || disabled} ...>`.

`components/admin/StageStepper.tsx`:
```tsx
import type { Tier } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS, flowFor, type OrderStatus } from '@/lib/orders/status';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'current' | 'todo' | 'off';

const BAR: Record<StepState, string> = {
  done: 'bg-ink',
  current: 'bg-wine',
  todo: 'bg-sand',
  off: 'bg-sand',
};

/** The tier's stages, the order's place among them. */
export function StageStepper({ tier, status }: { tier: Tier; status: OrderStatus }) {
  const flow = flowFor(tier);
  const at = flow.indexOf(status);
  const cancelled = status === ORDER_STATUS.CANCELLED;

  return (
    <ol aria-label="Order stages" className="grid grid-flow-col gap-1.5">
      {flow.map((stage, index) => {
        const state: StepState = cancelled
          ? 'off'
          : index < at
            ? 'done'
            : index === at
              ? 'current'
              : 'todo';
        return (
          <li
            aria-current={state === 'current' ? 'step' : undefined}
            className="grid gap-1.5"
            data-state={state}
            key={stage}
          >
            <span className={cn('h-1.5 rounded-full', BAR[state])} />
            <span
              className={cn(
                'hidden text-[11px] sm:block',
                state === 'current' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {STATUS_LABELS[stage].admin}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
```
(The label is in the DOM at every width; `hidden sm:block` hides it visually on phones, so the test's `getByText` still finds it.)

`components/admin/OrderMenu.tsx`:
```tsx
'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { ActionForm } from '@/components/admin/ActionForm';
import { Field } from '@/components/admin/fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NativeSelect } from '@/components/ui/native-select';
import { applyUpgrade, moveOrder } from '@/lib/admin/order-actions';
import { TIER_LABELS, type Tier } from '@/lib/constants';
import { ORDER_STATUS, STATUS_LABELS, type OrderStatus } from '@/lib/orders/status';

type Pending = 'back' | 'upgrade' | 'cancel' | null;

type OrderMenuProps = {
  orderId: string;
  reference: string;
  amount: number;
  back: OrderStatus | null;
  canCancel: boolean;
  upgrades: readonly Tier[];
};

/** The order's secondary moves, each behind a dialog so none is one stray click. */
export function OrderMenu({ orderId, reference, amount, back, canCancel, upgrades }: OrderMenuProps) {
  const [open, setOpen] = useState<Pending>(null);
  const close = () => setOpen(null);

  if (!back && !canCancel && upgrades.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button aria-label={`More actions for ${reference}`} size="icon-sm" variant="ghost" />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {back ? (
            <DropdownMenuItem onClick={() => setOpen('back')}>
              Move back to {STATUS_LABELS[back].admin}
            </DropdownMenuItem>
          ) : null}
          {upgrades.length > 0 ? (
            <DropdownMenuItem onClick={() => setOpen('upgrade')}>Upgrade tier</DropdownMenuItem>
          ) : null}
          {canCancel ? (
            <DropdownMenuItem className="text-wine" onClick={() => setOpen('cancel')}>
              Cancel order
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={(next) => (next ? null : close())} open={open !== null}>
        <DialogContent>
          {open === 'back' && back ? (
            <>
              <DialogHeader>
                <DialogTitle>Move {reference} back?</DialogTitle>
                <DialogDescription>It returns to {STATUS_LABELS[back].admin}.</DialogDescription>
              </DialogHeader>
              <ActionForm action={moveOrder} onSuccess={close} submitLabel={`Move back to ${STATUS_LABELS[back].admin}`}>
                <input name="orderId" type="hidden" value={orderId} />
                <input name="to" type="hidden" value={back} />
              </ActionForm>
            </>
          ) : null}

          {open === 'upgrade' ? (
            <>
              <DialogHeader>
                <DialogTitle>Upgrade {reference}</DialogTitle>
                <DialogDescription>Set the new tier and the new total the client pays.</DialogDescription>
              </DialogHeader>
              <ActionForm action={applyUpgrade} className="grid gap-4" onSuccess={close} submitLabel="Upgrade">
                <input name="orderId" type="hidden" value={orderId} />
                <NativeSelect aria-label="New tier" name="tier">
                  {upgrades.map((tier) => (
                    <option key={tier} value={tier}>
                      {TIER_LABELS[tier]}
                    </option>
                  ))}
                </NativeSelect>
                <Field defaultValue={String(amount)} label="New total (USD)" name="amount" type="number" />
              </ActionForm>
            </>
          ) : null}

          {open === 'cancel' ? (
            <>
              <DialogHeader>
                <DialogTitle>Cancel {reference}?</DialogTitle>
                <DialogDescription>A cancelled order cannot be moved again.</DialogDescription>
              </DialogHeader>
              <ActionForm action={moveOrder} onSuccess={close} submitLabel="Cancel order" variant="destructive">
                <input name="orderId" type="hidden" value={orderId} />
                <input name="to" type="hidden" value={ORDER_STATUS.CANCELLED} />
              </ActionForm>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
```
Check `allowedMoves` in `lib/orders/status.ts` for whether cancelling is final; the copy "cannot be moved again" is correct because `allowedMoves` returns `[]` from CANCELLED.

`components/admin/OrderCard.tsx`:
```tsx
import Link from 'next/link';
import { ActionForm } from '@/components/admin/ActionForm';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { OrderMenu } from '@/components/admin/OrderMenu';
import { StageStepper } from '@/components/admin/StageStepper';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TEMPLATES, VISIBILITY, getTemplateEntry } from '@/components/invitation/registry';
import { buttonVariants } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import type { ClientDetail } from '@/lib/admin/clients';
import { moveOrder, provisionInvitation } from '@/lib/admin/order-actions';
import { TIER_LABELS } from '@/lib/constants';
import {
  ORDER_STATUS,
  STATUS_LABELS,
  allowedMoves,
  hasReached,
  nextMove,
  previousMove,
} from '@/lib/orders/status';
import { upgradeTargets } from '@/lib/orders/upgrade';
import { adminRoutes } from '@/lib/routes';

type Order = ClientDetail['orders'][number];

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** One order: where it stands, the one obvious next step, everything else in the menu. */
export function OrderCard({ order }: { order: Order }) {
  const forward = nextMove(order.tier, order.status);
  const canProvision =
    !order.invitations && hasReached(order.tier, order.status, ORDER_STATUS.PAID);
  const invitation = order.invitations;

  return (
    <article className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <Eyebrow>Order {order.reference}</Eyebrow>
          <p className="flex flex-wrap items-center gap-3 font-heading text-[22px]">
            {TIER_LABELS[order.tier]} · ${order.amount}
            <StatusBadge status={order.status} />
          </p>
          {order.due_at ? (
            <p className="text-muted-foreground">Due {when.format(new Date(order.due_at))}</p>
          ) : null}
        </div>
        <OrderMenu
          amount={order.amount}
          back={previousMove(order.tier, order.status)}
          canCancel={allowedMoves(order.tier, order.status).includes(ORDER_STATUS.CANCELLED)}
          orderId={order.id}
          reference={order.reference}
          upgrades={upgradeTargets(order.tier)}
        />
      </header>

      <StageStepper status={order.status} tier={order.tier} />

      <div className="flex flex-wrap items-center gap-3">
        {forward ? (
          <ActionForm action={moveOrder} className="contents" submitLabel={`Move to ${STATUS_LABELS[forward].admin}`}>
            <input name="orderId" type="hidden" value={order.id} />
            <input name="to" type="hidden" value={forward} />
          </ActionForm>
        ) : order.status === ORDER_STATUS.REVIEW ? (
          <p className="text-muted-foreground">Publishing the invitation delivers this order.</p>
        ) : null}

        {canProvision ? (
          <ActionForm action={provisionInvitation} className="flex flex-wrap items-center gap-2" submitLabel="Create invitation" variant="outline">
            <input name="orderId" type="hidden" value={order.id} />
            <NativeSelect aria-label="Design" name="templateSlug">
              {TEMPLATES.map((design) => (
                <option key={design.slug} value={design.slug}>
                  {design.name}
                  {design.visibility === VISIBILITY.LISTED ? '' : ` (${design.visibility})`}
                </option>
              ))}
            </NativeSelect>
          </ActionForm>
        ) : null}
      </div>

      {invitation ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
          <div>
            <p className="font-medium">
              {getTemplateEntry(invitation.template_slug)?.name ?? invitation.template_slug} · /i/{invitation.slug}
            </p>
            <p className="text-muted-foreground capitalize">{invitation.status}</p>
          </div>
          <Link className={buttonVariants({ variant: 'outline' })} href={adminRoutes.invitation(invitation.id)}>
            Open editor
          </Link>
        </div>
      ) : null}
    </article>
  );
}
```

Delete `components/admin/OrderPanel.tsx` (`git rm`).

`app/admin/(gated)/clients/[id]/page.tsx` (replace the JSX; keep the guard, id parse and `getClient` lines as they are):
```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/admin/ActionForm';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { Eyebrow } from '@/components/admin/Eyebrow';
import { Field, OrderFields, TextareaField } from '@/components/admin/fields';
import { OrderCard } from '@/components/admin/OrderCard';
import { addOrder, updateClient } from '@/lib/admin/client-actions';
import { getClient } from '@/lib/admin/clients';
import { requireAdmin } from '@/lib/auth/guards';
import { whatsappChat } from '@/lib/contact';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Client' };

const PANEL = 'rounded-2xl border bg-card p-5 sm:p-6';
const SUMMARY = 'cursor-pointer select-none font-medium marker:text-muted-foreground';

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const client = await getClient(id.data);
  if (!client) notFound();

  const chat = whatsappChat(client.phone);

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: 'Clients', href: ROUTES.ADMIN }, { label: client.full_name }]} />

      <header>
        <Eyebrow>Client</Eyebrow>
        <h1 className="mt-2 font-heading text-[34px] leading-tight">{client.full_name}</h1>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span>{client.email}</span>
          {chat ? (
            <a className="text-wine hover:underline" href={chat} rel="noreferrer" target="_blank">
              {client.phone} · WhatsApp
            </a>
          ) : (
            <span>{client.phone}</span>
          )}
          <span>{client.user_id ? 'Has an account' : 'Not invited yet'}</span>
        </p>
        {client.notes ? <p className="mt-3 max-w-prose">{client.notes}</p> : null}
      </header>

      <details className={PANEL}>
        <summary className={SUMMARY}>Edit details</summary>
        <ActionForm action={updateClient} className="mt-5 grid gap-4" submitLabel="Save" successMessage="Saved.">
          <input name="clientId" type="hidden" value={client.id} />
          <Field defaultValue={client.full_name} label="Full name" name="fullName" required />
          <Field defaultValue={client.phone} label="Phone" name="phone" required />
          <TextareaField defaultValue={client.notes} label="Notes" name="notes" />
        </ActionForm>
      </details>

      <section className="grid gap-4">
        <h2 className="font-heading text-[24px]">Orders</h2>
        {client.orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        <details className={PANEL}>
          <summary className={SUMMARY}>Add an order</summary>
          <ActionForm action={addOrder} className="mt-5 grid gap-4" submitLabel="Add order" successMessage="Order added.">
            <input name="clientId" type="hidden" value={client.id} />
            <OrderFields />
          </ActionForm>
        </details>
      </section>
    </main>
  );
}
```
(The danger zone is added in Task 4.)

`components/admin/fields.tsx`: in `OrderFields`, show `TIER_LABELS[tier]` as the option text (import `TIER_LABELS`).

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/lib/orders tests/lib/contact.test.ts tests/components/admin`
Expected: PASS.

- [ ] **Step 6: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add components/ui/dialog.tsx components/ui/dropdown-menu.tsx lib/orders/status.ts lib/contact.ts components/admin/ActionForm.tsx components/admin/StageStepper.tsx components/admin/OrderMenu.tsx components/admin/OrderCard.tsx components/admin/fields.tsx "app/admin/(gated)/clients/[id]/page.tsx" tests/lib/orders/status.test.ts tests/lib/contact.test.ts tests/components/admin/action-form.test.tsx tests/components/admin/stage-stepper.test.tsx
git rm components/admin/OrderPanel.tsx
git commit -m "feat: give each order one clear next step and tuck the rest in a menu"
```
(If `pnpm dlx shadcn add` also touched `package.json`/`pnpm-lock.yaml`, add them too.)

---

### Task 4: Delete a client

**Files:**
- Create: `supabase/migrations/0007_admin_delete_client.sql`, `lib/admin/names.ts`, `components/admin/DeleteClientDialog.tsx`
- Modify: `lib/supabase/database.types.ts` (regenerated), `lib/routes.ts`, `lib/auth/guards.ts`, `app/admin/login/page.tsx`, `lib/admin/media.ts`, `lib/admin/client-actions.ts`, `tests/helpers/fake-supabase.ts`, `app/admin/(gated)/clients/[id]/page.tsx`, `app/admin/(gated)/page.tsx`
- Test: `tests/lib/admin/names.test.ts`, `tests/lib/admin/delete-client.test.ts`

**Interfaces:**
- Consumes: `ActionResult`, `UNEXPECTED`; `MEDIA_BUCKET`, `MEDIA_KINDS`.
- Produces: SQL `public.admin_delete_client(p_client_id uuid, p_confirm_name text) returns uuid[]`; `namesMatch(a, b): boolean`; `removeInvitationMedia(supabase, ids): Promise<boolean>`; `deleteClient(previous, formData): Promise<ActionResult>`; `NOTICE_PARAM = 'notice'`; `ADMIN_NOTICE = { CLIENT_DELETED: 'client-deleted', CLIENT_DELETED_FILES_LEFT: 'client-deleted-files-left' }`; `fakeSupabase(results, storage?)` with `client.rpc`, `client.storage`, `storageCalls`.

- [ ] **Step 1: Write the migration**

Use the `supabase-migration` skill to create `supabase/migrations/0007_admin_delete_client.sql` with this body:
```sql
-- 0007: delete a client and everything under it, in one transaction.
--
-- Security invoker: the admin RLS policies on clients, orders and
-- invitations decide, exactly as for the admin's other writes. The explicit
-- is_admin() check gives a clean refusal instead of a silent no-op.
-- Invitation reviews, guests and RSVPs go with their invitation (on delete
-- cascade). Storage objects are removed by the caller: SQL must not delete
-- from storage.objects directly.

create function public.admin_delete_client(p_client_id uuid, p_confirm_name text)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text;
  v_ids uuid[];
begin
  if not private.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select full_name into v_name
  from public.clients
  where id = p_client_id
  for update;

  if not found then
    return null;
  end if;

  if lower(btrim(v_name)) <> lower(btrim(coalesce(p_confirm_name, ''))) then
    raise exception 'confirm name does not match' using errcode = 'RV001';
  end if;

  if exists (
    select 1
    from public.invitations i
    join public.orders o on o.id = i.order_id
    where o.client_id = p_client_id and i.status = 'published'
  ) then
    raise exception 'client has a published invitation' using errcode = 'RV002';
  end if;

  select coalesce(array_agg(i.id), '{}') into v_ids
  from public.invitations i
  join public.orders o on o.id = i.order_id
  where o.client_id = p_client_id;

  delete from public.invitations where id = any(v_ids);
  delete from public.orders where client_id = p_client_id;
  delete from public.clients where id = p_client_id;

  return v_ids;
end;
$$;

revoke all on function public.admin_delete_client(uuid, text) from public, anon;
grant execute on function public.admin_delete_client(uuid, text) to authenticated;
```
Apply it with the Supabase MCP `apply_migration` (project `zwsvixzonkqaksfnemgh`, name `admin_delete_client`). Then regenerate types with the MCP `generate_typescript_types` and write the output to `lib/supabase/database.types.ts`. Confirm `Functions.admin_delete_client` appears with `Args: { p_client_id: string; p_confirm_name: string }` and `Returns: string[]`.

- [ ] **Step 2: Prove the function against the live project (rolled back)**

Run through the MCP `execute_sql` (everything is rolled back; it runs as `postgres`, so call the body's checks by simulating an admin with `set local role authenticated` and the admin's claims):
```sql
begin;
select set_config('request.jwt.claims', '{"sub":"d5bef384-f0d0-4f4d-86e1-f848cf3bd4c1","role":"authenticated"}', true);
set local role authenticated;
insert into public.clients (id, full_name, email, phone) values ('00000000-0000-0000-0000-0000000000c1', 'Probe Client', 'probe@example.com', '+96170000000');
insert into public.orders (id, client_id, tier, amount, template_slug) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'managed', 1, 'lin');
insert into public.invitations (id, order_id, slug, template_slug, status) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'probe-client', 'lin', 'published');
do $$ begin perform public.admin_delete_client('00000000-0000-0000-0000-0000000000c1', 'probe client'); exception when sqlstate 'RV002' then raise notice 'published blocked: ok'; end $$;
update public.invitations set status = 'draft' where id = '00000000-0000-0000-0000-0000000000b1';
do $$ begin perform public.admin_delete_client('00000000-0000-0000-0000-0000000000c1', 'Someone Else'); exception when sqlstate 'RV001' then raise notice 'name mismatch: ok'; end $$;
select public.admin_delete_client('00000000-0000-0000-0000-0000000000c1', '  PROBE client ');
select (select count(*) from public.clients where id = '00000000-0000-0000-0000-0000000000c1') as client_left;
rollback;
```
Expected: the two notices, the third call returns `{00000000-0000-0000-0000-0000000000b1}`, `client_left = 0`. Before running, check the `orders` insert columns against `database.types.ts` (Phase 2 reshaped `orders`; drop `template_slug` if it no longer exists, add any new not-null column). Then run the MCP `get_advisors` (security) and confirm nothing new about this function.

- [ ] **Step 3: Write the failing tests**

`tests/lib/admin/names.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { namesMatch } from '@/lib/admin/names';

describe('namesMatch', () => {
  it('ignores case and surrounding spaces, as the database does', () => {
    expect(namesMatch('  maya HADDAD ', 'Maya Haddad')).toBe(true);
  });

  it('does not match a different or empty name', () => {
    expect(namesMatch('Maya', 'Maya Haddad')).toBe(false);
    expect(namesMatch('', 'Maya Haddad')).toBe(false);
  });
});
```

Extend `tests/helpers/fake-supabase.ts` first (tests depend on it). Replace the function signature and return, keeping `from` and `find` as they are:
```ts
export type FakeStorage = {
  /** Files per folder, as `list(folder)` returns them. */
  files?: Record<string, { name: string }[]>;
  listError?: unknown;
  removeError?: unknown;
};

export function fakeSupabase(results: Record<string, QueuedResult[]> = {}, storage: FakeStorage = {}) {
  const calls: RecordedCall[] = [];
  const storageCalls: { method: string; args: unknown[] }[] = [];

  // ... existing from() unchanged ...

  /** `rpc(name)` resolves the next result queued under `rpc:<name>`. */
  async function rpc(name: string, args: unknown) {
    calls.push({ table: `rpc:${name}`, chain: [{ method: 'rpc', args: [args] }] });
    const next = results[`rpc:${name}`]?.shift() ?? {};
    return { data: null, error: null, ...next };
  }

  const storageApi = {
    from(bucket: string) {
      return {
        async list(folder: string) {
          storageCalls.push({ method: 'list', args: [bucket, folder] });
          return { data: storage.files?.[folder] ?? [], error: storage.listError ?? null };
        },
        async remove(paths: string[]) {
          storageCalls.push({ method: 'remove', args: [bucket, paths] });
          return { data: null, error: storage.removeError ?? null };
        },
      };
    },
  };

  // ... existing find() unchanged ...

  return { client: { from, rpc, storage: storageApi }, calls, find, storageCalls };
}
```

`tests/lib/admin/delete-client.test.ts`:
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

import { deleteClient } from '@/lib/admin/client-actions';

const CLIENT = '11111111-1111-4111-8111-111111111111';
const INVITATION = '22222222-2222-4222-8222-222222222222';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.fake = null;
});

describe('deleteClient', () => {
  it('deletes through the database function, then removes every uploaded file', async () => {
    state.fake = fakeSupabase(
      { 'rpc:admin_delete_client': [{ data: [INVITATION] }] },
      {
        files: {
          [`${INVITATION}/photos`]: [{ name: 'one.webp' }],
          [`${INVITATION}/hero`]: [{ name: 'hero.mp4' }],
        },
      },
    );

    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Maya Haddad' })),
    ).rejects.toThrow('REDIRECT /admin?notice=client-deleted');

    expect(state.fake.find('rpc:admin_delete_client', 'rpc')?.args[0]).toEqual({
      p_client_id: CLIENT,
      p_confirm_name: 'Maya Haddad',
    });
    expect(state.fake.storageCalls.filter((call) => call.method === 'list')).toHaveLength(3);
    expect(state.fake.storageCalls.find((call) => call.method === 'remove')?.args).toEqual([
      'invitation-media',
      [`${INVITATION}/photos/one.webp`, `${INVITATION}/hero/hero.mp4`],
    ]);
  });

  it('refuses a name that does not match', async () => {
    state.fake = fakeSupabase({ 'rpc:admin_delete_client': [{ error: { code: 'RV001' } }] });
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Someone' })),
    ).resolves.toEqual({ ok: false, message: 'The name does not match.' });
  });

  /* Review Focus 2: the page was stale; the database still says no. */
  it('refuses while an invitation is published', async () => {
    state.fake = fakeSupabase({ 'rpc:admin_delete_client': [{ error: { code: 'RV002' } }] });
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Maya Haddad' })),
    ).resolves.toEqual({ ok: false, message: 'Unpublish their invitation first.' });
    expect(state.fake.storageCalls).toHaveLength(0);
  });

  it('still lands on the list when files could not be removed, and says so', async () => {
    state.fake = fakeSupabase(
      { 'rpc:admin_delete_client': [{ data: [INVITATION] }] },
      { files: { [`${INVITATION}/photos`]: [{ name: 'one.webp' }] }, removeError: { message: 'x' } },
    );
    await expect(
      deleteClient(null, form({ clientId: CLIENT, confirmName: 'Maya Haddad' })),
    ).rejects.toThrow('REDIRECT /admin?notice=client-deleted-files-left');
  });

  it('asks for the name when none was typed', async () => {
    state.fake = fakeSupabase();
    await expect(deleteClient(null, form({ clientId: CLIENT, confirmName: '  ' }))).resolves.toEqual({
      ok: false,
      message: 'Type the client’s full name to confirm.',
    });
    expect(state.fake.calls).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run them to see them fail**

Run: `pnpm vitest run tests/lib/admin/names.test.ts tests/lib/admin/delete-client.test.ts`
Expected: FAIL (`namesMatch`, `deleteClient` missing).

- [ ] **Step 5: Implement**

`lib/admin/names.ts`:
```ts
/**
 * The typed-name check for destructive actions. Mirrors the database's
 * `lower(btrim(...))` so the dialog and admin_delete_client agree.
 */
export function namesMatch(typed: string, actual: string): boolean {
  const normal = (value: string) => value.trim().toLowerCase();
  return normal(typed) !== '' && normal(typed) === normal(actual);
}
```

`lib/routes.ts`: rename `LOGIN_NOTICE_PARAM` to `NOTICE_PARAM` (update its doc comment to "Why a page is showing a notice, carried in `?notice=`") and add:
```ts
export const ADMIN_NOTICE = {
  CLIENT_DELETED: 'client-deleted',
  CLIENT_DELETED_FILES_LEFT: 'client-deleted-files-left',
} as const;
```
Update the two importers: `lib/auth/guards.ts` and `app/admin/login/page.tsx` (`grep -rn LOGIN_NOTICE_PARAM app lib tests` must come back empty).

`lib/admin/media.ts`, append (add `import type { SupabaseClient } from '@supabase/supabase-js';` and `import type { Database } from '@/lib/supabase/database.types';`):
```ts
/**
 * Removes every uploaded file under the given invitations. Returns false if
 * any listing or the removal failed; the caller decides what that means.
 */
export async function removeInvitationMedia(
  supabase: SupabaseClient<Database>,
  invitationIds: readonly string[],
): Promise<boolean> {
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const paths: string[] = [];

  for (const id of invitationIds) {
    for (const kind of Object.values(MEDIA_KINDS)) {
      const folder = `${id}/${kind}`;
      const { data, error } = await bucket.list(folder, { limit: 1000 });
      if (error) return false;
      paths.push(...data.map((file) => `${folder}/${file.name}`));
    }
  }

  if (paths.length === 0) return true;
  const { error } = await bucket.remove(paths);
  return !error;
}
```
(If `createClient()` in `lib/supabase/server.ts` returns a differently typed client, use `Awaited<ReturnType<typeof createClient>>` as the parameter type instead.)

`lib/admin/client-actions.ts`: add imports `import { removeInvitationMedia } from '@/lib/admin/media';` and `import { ADMIN_NOTICE, NOTICE_PARAM, ROUTES, adminRoutes } from '@/lib/routes';`, then append:
```ts
const deleteSchema = z.object({
  clientId: z.uuid(),
  confirmName: z.string().trim().min(1).max(120),
});

/* Raised by admin_delete_client (migration 0007). */
const DELETE_REFUSALS: Record<string, string> = {
  RV001: 'The name does not match.',
  RV002: 'Unpublish their invitation first.',
};

export async function deleteClient(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = deleteSchema.safeParse(fields(formData, ['clientId', 'confirmName']));
  if (!input.success) return { ok: false, message: 'Type the client’s full name to confirm.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_delete_client', {
    p_client_id: input.data.clientId,
    p_confirm_name: input.data.confirmName,
  });
  if (error) {
    const code = typeof error.code === 'string' ? error.code : '';
    return {
      ok: false,
      message: Object.hasOwn(DELETE_REFUSALS, code) ? DELETE_REFUSALS[code] : UNEXPECTED,
    };
  }

  /* null: the client was already gone. Either way the list is where to land. */
  const filesRemoved = await removeInvitationMedia(supabase, data ?? []);
  revalidatePath(ROUTES.ADMIN);
  redirect(
    `${ROUTES.ADMIN}?${NOTICE_PARAM}=${
      filesRemoved ? ADMIN_NOTICE.CLIENT_DELETED : ADMIN_NOTICE.CLIENT_DELETED_FILES_LEFT
    }`,
  );
}
```

`components/admin/DeleteClientDialog.tsx`:
```tsx
'use client';

import { useActionState, useId, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/lib/admin/action-result';
import { deleteClient } from '@/lib/admin/client-actions';
import { namesMatch } from '@/lib/admin/names';

function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

type DeleteClientDialogProps = {
  clientId: string;
  fullName: string;
  orders: number;
  invitations: number;
  /** A published invitation: the server refuses, so the dialog does not offer. */
  blocked: boolean;
};

export function DeleteClientDialog({ clientId, fullName, orders, invitations, blocked }: DeleteClientDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(deleteClient, null);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>Delete client</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {fullName}?</DialogTitle>
          <DialogDescription>
            {blocked
              ? 'One of their invitations is live. Unpublish it first, then delete the client.'
              : `This removes ${count(orders, 'order')}, ${count(invitations, 'invitation')} and every uploaded file. It cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {blocked ? null : (
          <form action={run} className="grid gap-3">
            <input name="clientId" type="hidden" value={clientId} />
            <Label htmlFor={inputId}>Type {fullName} to confirm</Label>
            <Input
              autoComplete="off"
              id={inputId}
              name="confirmName"
              onChange={(event) => setTyped(event.target.value)}
              value={typed}
            />
            {result && !result.ok ? (
              <Alert variant="destructive">
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Keep</DialogClose>
              <Button disabled={!namesMatch(typed, fullName) || pending} type="submit" variant="destructive">
                {pending ? 'Deleting' : 'Delete for good'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

`app/admin/(gated)/clients/[id]/page.tsx`: import `DeleteClientDialog` and `INVITATION_STATUS` from `@/lib/constants`; before the return compute
```tsx
  const invitations = client.orders.flatMap((order) => (order.invitations ? [order.invitations] : []));
  const blocked = invitations.some((invitation) => invitation.status === INVITATION_STATUS.PUBLISHED);
```
and add after the Orders section:
```tsx
      <section className="grid gap-3 rounded-2xl border border-wine/30 p-5 sm:p-6">
        <h2 className="font-heading text-[20px]">Delete client</h2>
        <p className="text-muted-foreground">
          Removes the client with their orders, invitations and uploaded files. Use it for test
          records and clients who never went ahead.
        </p>
        <div>
          <DeleteClientDialog
            blocked={blocked}
            clientId={client.id}
            fullName={client.full_name}
            invitations={invitations.length}
            orders={client.orders.length}
          />
        </div>
      </section>
```

`app/admin/(gated)/page.tsx`: render the notice above the summary tiles (import `ADMIN_NOTICE`, `NOTICE_PARAM`):
```tsx
const NOTICES: Record<string, string> = {
  [ADMIN_NOTICE.CLIENT_DELETED]: 'Client deleted.',
  [ADMIN_NOTICE.CLIENT_DELETED_FILES_LEFT]:
    'Client deleted. Some uploaded files could not be removed; they are harmless but take space.',
};
```
in the component: `const raw = params[NOTICE_PARAM]; const notice = typeof raw === 'string' && Object.hasOwn(NOTICES, raw) ? NOTICES[raw] : null;` and
```tsx
      {notice ? (
        <p className="rounded-xl border bg-card px-4 py-3" role="status">
          {notice}
        </p>
      ) : null}
```
(`clientFiltersSchema` is a non-strict object, so the extra `notice` param is ignored by it.)

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run tests/lib/admin`
Expected: PASS (the existing action tests still pass with the extended fake).

- [ ] **Step 7: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add supabase/migrations/0007_admin_delete_client.sql lib/supabase/database.types.ts lib/admin/names.ts lib/admin/media.ts lib/admin/client-actions.ts lib/routes.ts lib/auth/guards.ts app/admin/login/page.tsx components/admin/DeleteClientDialog.tsx "app/admin/(gated)/clients/[id]/page.tsx" "app/admin/(gated)/page.tsx" tests/helpers/fake-supabase.ts tests/lib/admin/names.test.ts tests/lib/admin/delete-client.test.ts
git commit -m "feat: delete a client with everything under it, never a live one"
```

---

### Task 5: Form model and editor

**Files:**
- Modify: `lib/schemas/content/core.ts`, `lib/schemas/content/blocks.ts`, `components/admin/ContentEditor.tsx`, `components/store/PhoneFrame.tsx`, `app/admin/(gated)/invitations/[id]/page.tsx`, `components/admin/MediaSection.tsx`
- Create: `lib/admin/content-form.ts`, `components/admin/content-form/FieldControl.tsx`
- Test: `tests/lib/admin/content-form.test.ts`

**Interfaces:**
- Consumes: `MediaKind` from `@/lib/admin/media-paths`; `listMedia` from `@/lib/admin/media`; `saveContent`; `Breadcrumbs`, `Eyebrow`.
- Produces:
  ```ts
  type FormField =
    | { kind: 'text' | 'textarea' | 'datetime' | 'url'; key: string; label: string; required: boolean }
    | { kind: 'choice'; key: string; label: string; required: boolean; options: string[] }
    | { kind: 'media'; key: string; label: string; required: boolean; media: MediaKind }
    | { kind: 'group'; key: string; label: string; required: boolean; fields: FormField[] }
    | { kind: 'list'; key: string; label: string; required: boolean; item: FormField[] };
  formModel(schema: z.ZodObject): FormField[]
  pruneContent(fields: readonly FormField[], value: Record<string, unknown>): Record<string, unknown>
  emptyValue(fields: readonly FormField[]): Record<string, unknown>
  isoToLocalInput(iso: string): string
  localInputToIso(local: string): string
  parseContentText(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; message: string }
  type MediaOptions = Record<MediaKind, string[]>
  ```
  `MediaSection({ files })` with `files: Awaited<ReturnType<typeof listMedia>>`. `PhoneFrame({ children, maxWidth? })`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/admin/content-form.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jardinContentSchema } from '@/components/invitation/templates/jardin/schema';
import { linContentSchema } from '@/components/invitation/templates/lin/schema';
import {
  emptyValue,
  formModel,
  isoToLocalInput,
  localInputToIso,
  parseContentText,
  pruneContent,
} from '@/lib/admin/content-form';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

describe('formModel', () => {
  it('reads Lin into labelled fields of the right kinds', () => {
    const fields = formModel(linContentSchema);
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));

    expect(byKey.coupleFirstName).toMatchObject({ kind: 'text', label: 'First name', required: true });
    expect(byKey.eventDate).toMatchObject({ kind: 'datetime', required: true });
    expect(byKey.message).toMatchObject({ kind: 'textarea', required: false });
    expect(byKey.venue).toMatchObject({ kind: 'group', required: true });
    expect(byKey.schedule).toMatchObject({ kind: 'list', required: false });
    expect(byKey.heroMedia).toMatchObject({ kind: 'group', required: false });
  });

  it('reads nested fields: venue map link is a url, gallery photos pick from uploads', () => {
    const fields = formModel(jardinContentSchema);
    const venue = fields.find((field) => field.key === 'venue');
    const gallery = fields.find((field) => field.key === 'gallery');

    expect(venue?.kind === 'group' && venue.fields.find((f) => f.key === 'mapUrl')).toMatchObject({
      kind: 'url',
      required: false,
    });
    expect(gallery?.kind === 'list' && gallery.item.find((f) => f.key === 'src')).toMatchObject({
      kind: 'media',
      media: 'photos',
    });
  });

  it('refuses a field with no label, naming its path', () => {
    const schema = z.object({ venue: z.object({ name: z.string() }).meta({ label: 'Venue' }) });
    expect(() => formModel(schema)).toThrow('venue.name');
  });

  it('refuses a type the editor cannot show', () => {
    const schema = z.object({ guests: z.number().meta({ label: 'Guests' }) });
    expect(() => formModel(schema)).toThrow('guests');
  });
});

describe('pruneContent', () => {
  const fields = formModel(linContentSchema);

  it('leaves complete content exactly as it was', () => {
    expect(pruneContent(fields, SAMPLE_CONTENT)).toEqual(SAMPLE_CONTENT);
  });

  /* Review Focus 4. */
  it('drops an emptied optional field instead of saving ""', () => {
    const pruned = pruneContent(fields, { ...SAMPLE_CONTENT, headline: '  ' });
    expect(pruned).not.toHaveProperty('headline');
  });

  it('keeps an emptied required field so the server can say it is missing', () => {
    expect(pruneContent(fields, { ...SAMPLE_CONTENT, coupleFirstName: '' }).coupleFirstName).toBe('');
  });

  it('keeps keys the form does not know', () => {
    expect(pruneContent(fields, { ...SAMPLE_CONTENT, legacyNote: 'kept' })).toHaveProperty('legacyNote', 'kept');
  });

  it('drops an optional detail inside a schedule row', () => {
    const pruned = pruneContent(fields, {
      ...SAMPLE_CONTENT,
      schedule: [{ time: '7 pm', title: 'Dinner', description: '' }],
    });
    expect(pruned.schedule).toEqual([{ time: '7 pm', title: 'Dinner' }]);
  });
});

describe('emptyValue', () => {
  it('starts a schedule row with its required fields empty and its optional ones absent', () => {
    const schedule = formModel(linContentSchema).find((field) => field.key === 'schedule');
    expect(schedule?.kind === 'list' && emptyValue(schedule.item)).toEqual({ time: '', title: '' });
  });
});

describe('date and time', () => {
  /* Review Focus 5: the stored instant survives the local-time round trip in any zone. */
  it('round-trips the stored instant through the local input', () => {
    for (const iso of ['2027-05-27T18:30:00.000Z', '2027-05-27T21:30:00.000Z', '2027-12-31T23:45:00.000Z']) {
      expect(localInputToIso(isoToLocalInput(iso))).toBe(iso);
    }
  });

  it('turns an empty or broken value into an empty input, not "Invalid Date"', () => {
    expect(isoToLocalInput('')).toBe('');
    expect(isoToLocalInput('soon')).toBe('');
    expect(localInputToIso('')).toBe('');
  });
});

describe('parseContentText', () => {
  /* Review Focus 3. */
  it('refuses text that is not a JSON object, with a reason', () => {
    expect(parseContentText('{"a":')).toMatchObject({ ok: false });
    expect(parseContentText('[1,2]')).toEqual({ ok: false, message: 'The content must be one JSON object.' });
  });

  it('accepts an object', () => {
    expect(parseContentText('{"initials":"MS"}')).toEqual({ ok: true, value: { initials: 'MS' } });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run tests/lib/admin/content-form.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Label the schemas**

`lib/schemas/content/core.ts`: extend the module augmentation (add `import type { MediaKind } from '@/lib/admin/media-paths';` at the top):
```ts
declare module 'zod' {
  interface GlobalMeta {
    ask?: string;
    /** The editor's label for the field. `formModel` refuses a field without one. */
    label?: string;
    /** Show as a multi-line box. */
    multiline?: boolean;
    /** The field holds an uploaded file of this kind; the editor offers the uploads. */
    media?: MediaKind;
  }
}
```
Update the comment above it to mention `label`. Then:
```ts
export const venueSchema = z.object({
  name: z.string().min(1).meta({ label: 'Venue name' }),
  addressLine: z.string().min(1).meta({ label: 'Address' }),
  mapUrl: z.url().optional().meta({ label: 'Google Maps link' }),
});
```
and add `label` beside each `ask`: `coupleFirstName` → `'First name'`, `couplePartnerName` → `'Second name'`, `initials` → `'Initials'`, `eventDate` → `'Date and arrival time'`, `venue` → `'Venue'`.

`lib/schemas/content/blocks.ts`:
```ts
const scheduleItemSchema = z.object({
  time: z.string().min(1).meta({ label: 'Time' }),
  title: z.string().min(1).meta({ label: 'Moment' }),
  description: z.string().optional().meta({ label: 'Detail' }),
});

const galleryItemSchema = z.object({
  src: z.string().min(1).meta({ label: 'Photo', media: 'photos' }),
  alt: z.string().min(1).meta({ label: 'Description' }),
});

const heroMediaSchema = z.object({
  type: z.enum(['image', 'video']).meta({ label: 'Type' }),
  src: z.string().min(1).meta({ label: 'File', media: 'hero' }),
});
```
and in `BLOCKS` add: `headline` → `label: 'Headline'`; `message` → `label: 'Message', multiline: true`; `schedule` → `label: 'Schedule'`; `gallery` → `label: 'Gallery'`; `heroMedia` → `label: 'Opening photo or video'`; `registryMessage` → `label: 'Gifts note', multiline: true`.

Run `pnpm vitest run tests/lib/schemas tests/lib/sample-invitation.test.ts` to confirm nothing that reads `ask` broke.

- [ ] **Step 4: Implement the model**

`lib/admin/content-form.ts`:
```ts
import { z } from 'zod';
import type { MediaKind } from '@/lib/admin/media-paths';

type Base = { key: string; label: string; required: boolean };

/** One field of a design's content, as the editor draws it. Plain data: it crosses to the client. */
export type FormField =
  | (Base & { kind: 'text' | 'textarea' | 'datetime' | 'url' })
  | (Base & { kind: 'choice'; options: string[] })
  | (Base & { kind: 'media'; media: MediaKind })
  | (Base & { kind: 'group'; fields: FormField[] })
  | (Base & { kind: 'list'; item: FormField[] });

/** Uploaded file URLs per kind, offered by media fields. */
export type MediaOptions = Record<MediaKind, string[]>;

function unwrap(schema: z.ZodType): z.ZodType {
  let inner = schema;
  while (inner instanceof z.ZodOptional || inner instanceof z.ZodDefault) inner = inner.unwrap();
  return inner;
}

function describe(key: string, path: string, schema: z.ZodType): FormField {
  const inner = unwrap(schema);
  /* `.meta()` may sit on the wrapper (`.optional().meta()`) or on the inner type. */
  const meta = { ...inner.meta(), ...schema.meta() };
  if (!meta.label) {
    throw new Error(
      `Content field "${path}" has no label. Add .meta({ label }) so the editor can show it.`,
    );
  }

  const base: Base = { key, label: meta.label, required: !schema.safeParse(undefined).success };

  if (meta.media) return { ...base, kind: 'media', media: meta.media };
  if (inner instanceof z.ZodISODateTime) return { ...base, kind: 'datetime' };
  if (inner instanceof z.ZodURL) return { ...base, kind: 'url' };
  if (inner instanceof z.ZodString) return { ...base, kind: meta.multiline ? 'textarea' : 'text' };
  if (inner instanceof z.ZodEnum) return { ...base, kind: 'choice', options: inner.options.map(String) };
  if (inner instanceof z.ZodObject) return { ...base, kind: 'group', fields: fieldsOf(inner, path) };
  if (inner instanceof z.ZodArray && inner.element instanceof z.ZodObject) {
    return { ...base, kind: 'list', item: fieldsOf(inner.element, path) };
  }

  throw new Error(
    `Content field "${path}" has a type the editor cannot show. Teach formModel about it.`,
  );
}

function fieldsOf(schema: z.ZodObject, prefix: string): FormField[] {
  return Object.entries(schema.shape).map(([key, field]) =>
    describe(key, prefix ? `${prefix}.${key}` : key, field),
  );
}

/** The editor's form for a design, read off the design's own schema. */
export function formModel(schema: z.ZodObject): FormField[] {
  return fieldsOf(schema, '');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pruneField(field: FormField, current: unknown): unknown {
  if (field.kind === 'group') {
    if (!isRecord(current)) return current;
    const inner = pruneContent(field.fields, current);
    return !field.required && Object.keys(inner).length === 0 ? undefined : inner;
  }
  if (field.kind === 'list') {
    return Array.isArray(current)
      ? current.map((row) => (isRecord(row) ? pruneContent(field.item, row) : row))
      : current;
  }
  if (!field.required && typeof current === 'string' && current.trim() === '') return undefined;
  return current;
}

/**
 * The form's value as it should be saved: emptied optional fields are
 * removed, never stored as "". Required fields stay, even empty, so the
 * server's check names what is missing. Keys the form does not know are kept.
 */
export function pruneContent(
  fields: readonly FormField[],
  value: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...value };
  for (const field of fields) {
    if (!(field.key in out)) continue;
    const pruned = pruneField(field, out[field.key]);
    if (pruned === undefined) delete out[field.key];
    else out[field.key] = pruned;
  }
  return out;
}

/** A fresh value for a group or list row: required fields empty, optional ones absent. */
export function emptyValue(fields: readonly FormField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.required) continue;
    if (field.kind === 'group') out[field.key] = emptyValue(field.fields);
    else if (field.kind === 'list') out[field.key] = [];
    else if (field.kind === 'choice') out[field.key] = field.options[0] ?? '';
    else out[field.key] = '';
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A stored instant as a `datetime-local` value in the browser's zone. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A `datetime-local` value (browser zone) as the stored ISO instant. */
export function localInputToIso(local: string): string {
  if (!local) return '';
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** The Advanced tab's text, read back for the form. */
export function parseContentText(
  text: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: `Not valid JSON: ${error instanceof Error ? error.message : 'unreadable'}` };
  }
  return isRecord(value) ? { ok: true, value } : { ok: false, message: 'The content must be one JSON object.' };
}
```
Note `localInputToIso(isoToLocalInput(x)) === x` only when `x` has zero seconds; stored event dates are minute-precision, which the tests use.

- [ ] **Step 5: Run the model tests**

Run: `pnpm vitest run tests/lib/admin/content-form.test.ts`
Expected: PASS. If `z.ZodISODateTime`/`z.ZodURL` are not exported under these names in the installed zod, log `Object.keys(z).filter(k => k.includes('Date') || k.includes('URL'))` and use the exported class.

- [ ] **Step 6: Build the field control**

`components/admin/content-form/FieldControl.tsx`:
```tsx
'use client';

import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyValue,
  isRecord,
  isoToLocalInput,
  localInputToIso,
  type FormField,
  type MediaOptions,
} from '@/lib/admin/content-form';

type FieldControlProps = {
  field: FormField;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Dotted path, matching the server's issue paths ("venue.name", "schedule.0.time"). */
  path: string;
  issues: ReadonlyMap<string, string>;
  media: MediaOptions;
};

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

function Issue({ message }: { message: string | undefined }) {
  return message ? <p className="text-[12px] text-wine">{message}</p> : null;
}

function Fields({
  fields,
  value,
  onChange,
  path,
  issues,
  media,
}: Omit<FieldControlProps, 'field'> & { fields: readonly FormField[] }) {
  const record = asRecord(value);
  return (
    <div className="grid gap-4">
      {fields.map((child) => (
        <FieldControl
          field={child}
          issues={issues}
          key={child.key}
          media={media}
          onChange={(next) => onChange({ ...record, [child.key]: next })}
          path={path ? `${path}.${child.key}` : child.key}
          value={record[child.key]}
        />
      ))}
    </div>
  );
}

/** One content field. Groups and lists render their own fields through this again. */
export function FieldControl({ field, value, onChange, path, issues, media }: FieldControlProps) {
  const id = useId();
  const issue = issues.get(path);
  const label = (
    <Label htmlFor={id}>
      {field.label}
      {field.required ? null : <span className="font-normal text-muted-foreground"> (optional)</span>}
    </Label>
  );

  switch (field.kind) {
    case 'text':
    case 'url':
    case 'media':
      return (
        <div className="grid gap-2">
          {label}
          <Input
            aria-invalid={issue ? true : undefined}
            id={id}
            list={field.kind === 'media' ? `${id}-uploads` : undefined}
            onChange={(event) => onChange(event.target.value)}
            type={field.kind === 'url' ? 'url' : 'text'}
            value={asString(value)}
          />
          {field.kind === 'media' ? (
            <datalist id={`${id}-uploads`}>
              {media[field.media].map((url) => (
                <option key={url} value={url} />
              ))}
            </datalist>
          ) : null}
          <Issue message={issue} />
        </div>
      );
    case 'textarea':
      return (
        <div className="grid gap-2">
          {label}
          <Textarea
            aria-invalid={issue ? true : undefined}
            id={id}
            onChange={(event) => onChange(event.target.value)}
            value={asString(value)}
          />
          <Issue message={issue} />
        </div>
      );
    case 'datetime':
      return (
        <div className="grid gap-2">
          {label}
          <Input
            aria-invalid={issue ? true : undefined}
            id={id}
            onChange={(event) => onChange(localInputToIso(event.target.value))}
            type="datetime-local"
            value={isoToLocalInput(asString(value))}
          />
          <Issue message={issue} />
        </div>
      );
    case 'choice':
      return (
        <div className="grid gap-2">
          {label}
          <NativeSelect id={id} onChange={(event) => onChange(event.target.value)} value={asString(value)}>
            {field.required ? null : <option value="">None</option>}
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
          <Issue message={issue} />
        </div>
      );
    case 'group':
      if (!field.required && value === undefined) {
        return (
          <Button className="justify-self-start" onClick={() => onChange(emptyValue(field.fields))} type="button" variant="outline">
            Add {field.label.toLowerCase()}
          </Button>
        );
      }
      return (
        <fieldset className="grid gap-4 rounded-xl border p-4">
          <legend className="px-1 font-medium">{field.label}</legend>
          <Fields fields={field.fields} issues={issues} media={media} onChange={onChange} path={path} value={value} />
          <Issue message={issue} />
          {field.required ? null : (
            <Button className="justify-self-start" onClick={() => onChange(undefined)} type="button" variant="ghost">
              Remove {field.label.toLowerCase()}
            </Button>
          )}
        </fieldset>
      );
    case 'list': {
      const rows = Array.isArray(value) ? value : [];
      const move = (from: number, to: number) => {
        const next = [...rows];
        const [row] = next.splice(from, 1);
        next.splice(to, 0, row);
        onChange(next);
      };
      return (
        <fieldset className="grid gap-3">
          <legend className="font-medium">{field.label}</legend>
          {rows.map((row, index) => (
            <div className="grid gap-3 rounded-xl border p-4" key={index}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex gap-1">
                  <Button aria-label="Move up" disabled={index === 0} onClick={() => move(index, index - 1)} size="icon-sm" type="button" variant="ghost">
                    <ArrowUp />
                  </Button>
                  <Button aria-label="Move down" disabled={index === rows.length - 1} onClick={() => move(index, index + 1)} size="icon-sm" type="button" variant="ghost">
                    <ArrowDown />
                  </Button>
                  <Button aria-label="Remove" onClick={() => onChange(rows.filter((_, at) => at !== index))} size="icon-sm" type="button" variant="ghost">
                    <X />
                  </Button>
                </div>
              </div>
              <Fields
                fields={field.item}
                issues={issues}
                media={media}
                onChange={(next) => onChange(rows.map((current, at) => (at === index ? next : current)))}
                path={`${path}.${index}`}
                value={row}
              />
            </div>
          ))}
          <Issue message={issue} />
          <Button className="justify-self-start" onClick={() => onChange([...rows, emptyValue(field.item)])} type="button" variant="outline">
            Add to {field.label.toLowerCase()}
          </Button>
        </fieldset>
      );
    }
  }
}
```

- [ ] **Step 7: Rewrite the editor**

`components/store/PhoneFrame.tsx`: add an optional `maxWidth?: number` prop:
```tsx
export function PhoneFrame({ children, maxWidth }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div
      className={maxWidth ? 'relative mx-auto w-full' : 'relative mx-auto w-full max-w-[280px]'}
      style={maxWidth ? { maxWidth } : undefined}
    >
```
(the rest unchanged; storefront callers pass nothing and render as before).

`components/admin/ContentEditor.tsx` (replace):
```tsx
'use client';

import { useActionState, useState } from 'react';
import { FieldControl } from '@/components/admin/content-form/FieldControl';
import { PhoneFrame } from '@/components/store/PhoneFrame';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/lib/admin/action-result';
import {
  parseContentText,
  pruneContent,
  type FormField,
  type MediaOptions,
} from '@/lib/admin/content-form';
import { saveContent } from '@/lib/admin/invitation-actions';

type ContentEditorProps = {
  invitationId: string;
  fields: FormField[];
  initial: Record<string, unknown>;
  media: MediaOptions;
  previewUrl: string;
};

type Mode = 'form' | 'json';

/**
 * The design's fields on the left, the real invitation on the right. Both
 * tabs edit one value; saving sends it through the same server check as
 * before. The preview reloads after each successful save, so it shows
 * exactly what was stored.
 */
export function ContentEditor({ invitationId, fields, initial, media, previewUrl }: ContentEditorProps) {
  const [value, setValue] = useState<Record<string, unknown>>(initial);
  const [mode, setMode] = useState<Mode>('form');
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await saveContent(previous, formData);
      if (next.ok) setVersion((current) => current + 1);
      return next;
    },
    null,
  );

  const issues = new Map((result && !result.ok ? (result.issues ?? []) : []).map((issue) => [issue.path, issue.message]));
  const payload = mode === 'json' ? text : JSON.stringify(pruneContent(fields, value));

  function showJson() {
    setText(JSON.stringify(pruneContent(fields, value), null, 2));
    setParseError(null);
    setMode('json');
  }

  function showForm() {
    const parsed = parseContentText(text);
    if (!parsed.ok) {
      setParseError(parsed.message);
      return;
    }
    setValue(parsed.value);
    setParseError(null);
    setMode('form');
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <form action={run} className="grid content-start gap-5">
        <input name="invitationId" type="hidden" value={invitationId} />
        <input name="content" type="hidden" value={payload} />

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-[22px]">Content</h2>
          <Button onClick={mode === 'form' ? showJson : showForm} type="button" variant="ghost">
            {mode === 'form' ? 'Advanced: edit JSON' : 'Back to the form'}
          </Button>
        </div>

        {mode === 'form' ? (
          <div className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
            {fields.map((field) => (
              <FieldControl
                field={field}
                issues={issues}
                key={field.key}
                media={media}
                onChange={(next) => setValue((current) => ({ ...current, [field.key]: next }))}
                path={field.key}
                value={value[field.key]}
              />
            ))}
          </div>
        ) : (
          <Textarea
            aria-label="Invitation content (JSON)"
            className="min-h-[560px] font-mono text-[13px]"
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            value={text}
          />
        )}

        {parseError ? (
          <Alert variant="destructive">
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        ) : null}
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

        <Button className="justify-self-start" disabled={pending} size="lg" type="submit">
          {pending ? 'Saving' : 'Save content'}
        </Button>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PhoneFrame maxWidth={340}>
          <iframe className="block h-[680px] w-full" key={version} src={previewUrl} title="Invitation preview" />
        </PhoneFrame>
      </div>
    </div>
  );
}
```

`components/admin/MediaSection.tsx`: take the files as a prop (the page lists them once and shares them with the editor):
```tsx
import { MediaUploader } from '@/components/admin/MediaUploader';
import type { listMedia } from '@/lib/admin/media';

type MediaFile = Awaited<ReturnType<typeof listMedia>>[number];

/** Uploaded files. Media fields in the form offer these by kind. */
export function MediaSection({ invitationId, files }: { invitationId: string; files: readonly MediaFile[] }) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-[22px]">Media</h2>
      <MediaUploader invitationId={invitationId} />
      {files.length ? (
        <ul className="grid gap-1 font-mono text-[12px]">
          {files.map((file) => (
            <li className="truncate" key={`${file.kind}/${file.name}`}>
              <span className="text-muted-foreground">{file.kind}/</span>
              {file.name}
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

`app/admin/(gated)/invitations/[id]/page.tsx` (replace the body after `getTemplateEntry` and the design check):
```tsx
  const order = invitation.orders;
  const checklist = checklistFor(design.schema);
  const fields = formModel(design.schema);
  const files = await listMedia(invitation.id);
  const media: MediaOptions = { photos: [], hero: [], envelope: [] };
  for (const file of files) media[file.kind].push(file.url);
  const content = isRecord(invitation.content) ? invitation.content : {};

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <Breadcrumbs
        items={[
          { label: 'Clients', href: ROUTES.ADMIN },
          ...(order
            ? [
                { label: order.clients?.full_name ?? 'Client', href: adminRoutes.client(order.client_id) },
                { label: order.reference, href: adminRoutes.client(order.client_id) },
              ]
            : []),
          { label: 'Invitation' },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Invitation · {design.name}</Eyebrow>
          <h1 className="mt-2 font-heading text-[34px] leading-tight">/i/{invitation.slug}</h1>
        </div>
        <CopyChecklist message={checklistMessage(checklist)} />
      </header>

      {invitation.published_at ? null : (
        <ActionForm action={updateSlug} className="flex flex-wrap items-end gap-2" submitLabel="Change link" successMessage="Link changed." variant="outline">
          <input name="invitationId" type="hidden" value={invitation.id} />
          <Field defaultValue={invitation.slug} label="Link (/i/…)" name="slug" />
        </ActionForm>
      )}

      <ContentEditor
        fields={fields}
        initial={content}
        invitationId={invitation.id}
        media={media}
        previewUrl={adminRoutes.preview(invitation.id)}
      />

      <MediaSection files={files} invitationId={invitation.id} />

      <ReviewPanel invitation={invitation} />
    </main>
  );
```
Imports to add: `Breadcrumbs`, `Eyebrow`, `listMedia` from `@/lib/admin/media`, `formModel`, `isRecord`, `type MediaOptions` from `@/lib/admin/content-form`, `ROUTES`. Remove the `Link` import and the "Fields this design draws" section.

- [ ] **Step 8: Run tests, then check it in the browser**

Run: `pnpm vitest run` (whole suite; the editor change touches shared code).
Expected: PASS.
With `pnpm dev` running, open an invitation in the admin: fill the form, save, see the preview reload; clear the headline and save (it disappears from the JSON tab); type broken JSON and press "Back to the form" (error shown, text kept).

- [ ] **Step 9: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add lib/schemas/content/core.ts lib/schemas/content/blocks.ts lib/admin/content-form.ts components/admin/content-form/FieldControl.tsx components/admin/ContentEditor.tsx components/admin/MediaSection.tsx components/store/PhoneFrame.tsx "app/admin/(gated)/invitations/[id]/page.tsx" tests/lib/admin/content-form.test.ts
git commit -m "feat: fill an invitation in a form built from its design"
```

---

### Task 6: Publish readiness, review timeline, media drop zone

**Files:**
- Modify: `lib/invitations/publish-guard.ts`, `lib/admin/invitation-actions.ts`, `components/admin/ReviewPanel.tsx`, `components/admin/MediaUploader.tsx`
- Test: `tests/lib/invitations/publish-guard.test.ts` (exists: append), `tests/lib/admin/publish.test.ts` (must still pass unchanged)

**Interfaces:**
- Consumes: `ActionForm` `disabled` (Task 3); `ORDER_STATUS`.
- Produces: `PUBLISH_BLOCK.NOT_IN_REVIEW`; `publishReadiness(orderStatus: OrderStatus | null, content: unknown, latest: LatestReview): { ok: true } | { ok: false; reason: PublishBlock }`.

- [ ] **Step 1: Write the failing test**

Check the existing file name with `ls tests/lib/invitations`; append to the publish-guard test file (add `publishReadiness, PUBLISH_BLOCK` to its import):
```ts
describe('publishReadiness', () => {
  const content = { initials: 'MS' };
  const approved = { decision: 'approved' as const, contentSnapshot: { initials: 'MS' } };

  it('waits for the order to be in review', () => {
    expect(publishReadiness('in_design', content, approved)).toEqual({
      ok: false,
      reason: PUBLISH_BLOCK.NOT_IN_REVIEW,
    });
    expect(publishReadiness(null, content, approved)).toEqual({
      ok: false,
      reason: PUBLISH_BLOCK.NOT_IN_REVIEW,
    });
  });

  it('lets a reviewed, approved invitation go live, and a delivered one go live again', () => {
    expect(publishReadiness('review', content, approved)).toEqual({ ok: true });
    expect(publishReadiness('delivered', content, approved)).toEqual({ ok: true });
  });

  it('still requires the approval to match the content', () => {
    expect(publishReadiness('review', { initials: 'XX' }, approved)).toEqual({
      ok: false,
      reason: PUBLISH_BLOCK.CONTENT_CHANGED,
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run tests/lib/invitations`
Expected: FAIL (`publishReadiness` missing).

- [ ] **Step 3: Implement**

`lib/invitations/publish-guard.ts`: add `import { ORDER_STATUS, type OrderStatus } from '@/lib/orders/status';`, add to `PUBLISH_BLOCK`:
```ts
  NOT_IN_REVIEW: 'Send the order for review before publishing.',
```
and append:
```ts
/**
 * Everything publishing checks, in one place, so the Publish button and the
 * action cannot disagree: the order is in review (or delivered, to put an
 * approved edit live), and the content is exactly what was approved.
 */
export function publishReadiness(
  orderStatus: OrderStatus | null,
  content: unknown,
  latest: LatestReview,
): { ok: true } | { ok: false; reason: PublishBlock } {
  if (orderStatus !== ORDER_STATUS.REVIEW && orderStatus !== ORDER_STATUS.DELIVERED) {
    return { ok: false, reason: PUBLISH_BLOCK.NOT_IN_REVIEW };
  }
  return canPublish(content, latest);
}
```

`lib/admin/invitation-actions.ts` `publishInvitation`: replace the `publishable` check and the `canPublish` call with:
```ts
  const order = invitation.orders;
  const latest = invitation.invitation_reviews[0];
  const verdict = publishReadiness(
    order?.status ?? null,
    invitation.content,
    latest ? { decision: latest.decision, contentSnapshot: latest.content_snapshot } : null,
  );
  if (!verdict.ok) return { ok: false, message: verdict.reason };
  if (!order || !latest) return { ok: false, message: UNEXPECTED };
```
Update the import (`publishReadiness` instead of `canPublish`). Run `pnpm vitest run tests/lib/admin/publish.test.ts` and confirm the existing messages still match.

`components/admin/ReviewPanel.tsx` (replace):
```tsx
import { ActionForm } from '@/components/admin/ActionForm';
import { TextareaField } from '@/components/admin/fields';
import type { EditorInvitation } from '@/lib/admin/invitations';
import { approveOnBehalf, publishInvitation } from '@/lib/admin/invitation-actions';
import { publishReadiness } from '@/lib/invitations/publish-guard';
import { cn } from '@/lib/utils';

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function ReviewPanel({ invitation }: { invitation: EditorInvitation }) {
  const latest = invitation.invitation_reviews[0];
  const readiness = publishReadiness(
    invitation.orders?.status ?? null,
    invitation.content,
    latest ? { decision: latest.decision, contentSnapshot: latest.content_snapshot } : null,
  );

  return (
    <section className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="font-heading text-[22px]">Approval and publishing</h2>

      {invitation.invitation_reviews.length ? (
        <ol className="grid gap-3 border-l pl-5">
          {invitation.invitation_reviews.map((review) => (
            <li className="relative" key={review.id}>
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1.5 -left-[25px] size-2.5 rounded-full',
                  review.decision === 'approved' ? 'bg-ink' : 'bg-wine',
                )}
              />
              <p className="font-medium">
                {review.decision === 'approved' ? 'Approved' : 'Changes requested'}
                {review.on_behalf ? ' (recorded by Rêve)' : ''}
              </p>
              <p className="text-muted-foreground">
                {when.format(new Date(review.created_at))}
                {review.note ? ` · ${review.note}` : ''}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">No decision yet.</p>
      )}

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">Record the client’s approval</summary>
        <ActionForm action={approveOnBehalf} className="mt-4 grid gap-3" submitLabel="Record approval of this version" successMessage="Approval recorded." variant="outline">
          <input name="invitationId" type="hidden" value={invitation.id} />
          <TextareaField label="Where they approved it" name="note" placeholder="Approved on WhatsApp, 1 October" />
        </ActionForm>
      </details>

      <div className="grid gap-2">
        <ActionForm
          action={publishInvitation}
          className="flex flex-wrap items-center gap-3"
          disabled={!readiness.ok}
          submitLabel={invitation.published_at ? 'Publish again' : 'Publish'}
          successMessage="Live."
        >
          <input name="invitationId" type="hidden" value={invitation.id} />
        </ActionForm>
        {readiness.ok ? null : <p className="text-muted-foreground">{readiness.reason}</p>}
      </div>
    </section>
  );
}
```

`components/admin/MediaUploader.tsx`: keep `upload()` and the kind select; replace the bare file input with a drop zone and log per file as it goes. The render becomes:
```tsx
  const [over, setOver] = useState(false);
  // ...upload() unchanged except: push each line with setLog((current) => [...current, line]) as it lands,
  // and start with setLog([]).

  return (
    <div className="grid gap-3">
      <NativeSelect
        aria-label="What these files are"
        className="justify-self-start"
        onChange={(event) => setKind(z.enum(MEDIA_KINDS).parse(event.target.value))}
        value={kind}
      >
        <option value={MEDIA_KINDS.PHOTOS}>Gallery photos</option>
        <option value={MEDIA_KINDS.HERO}>Opening photo or video</option>
        <option value={MEDIA_KINDS.ENVELOPE}>Envelope frames</option>
      </NativeSelect>
      <label
        className={cn(
          'grid cursor-pointer justify-items-center gap-1 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
          over ? 'border-wine bg-wine/5' : 'hover:bg-muted',
        )}
        onDragLeave={() => setOver(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          setFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          accept="image/webp,video/mp4"
          aria-label="Files to upload"
          className="sr-only"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          type="file"
        />
        <span className="font-heading text-[18px]">Drop files here</span>
        <span className="text-muted-foreground">
          or click to choose. WebP for photos, MP4 for the opening video.
        </span>
        {files.length ? (
          <span className="mt-2 text-[12px]">{files.map((file) => file.name).join(', ')}</span>
        ) : null}
      </label>
      <Button className="justify-self-start" disabled={busy || files.length === 0} onClick={upload} type="button">
        {busy ? 'Uploading' : files.length ? `Upload ${files.length}` : 'Upload'}
      </Button>
      {log.length ? (
        <ul className="text-muted-foreground">
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
```
(import `cn` from `@/lib/utils`). In `upload()`, replace `lines.push(x)` with `setLog((current) => [...current, x])`, call `setLog([])` first, and drop the `lines` array; clear `files` after the loop.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/lib/invitations tests/lib/admin`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add lib/invitations/publish-guard.ts lib/admin/invitation-actions.ts components/admin/ReviewPanel.tsx components/admin/MediaUploader.tsx tests/lib/invitations
git commit -m "feat: hold Publish until it can succeed and say why"
```

---

### Task 7: Browser pass, docs flush

**Files:**
- Modify: `ARCHITECTURE.md`
- Delete: `STAGING_CHANGES.md` (untracked)

- [ ] **Step 1: Browser pass (desktop 1440 and phone 390)**

With `pnpm dev` running and signed in, using the chrome-devtools MCP:
1. `/admin` with no clients: "No clients yet" and the button.
2. Create a client (name "Review Demo"); list shows the row; tiles count it as Active.
3. Client page: stepper, "Move to Paid" as the only primary button; ⋯ menu shows Move back / Upgrade / Cancel as allowed; Cancel asks first.
4. Move to Paid, create an invitation, open the editor: fill the form, save, preview updates; Publish disabled with "Send the order for review before publishing."
5. Back on the client page, Delete client: button disabled until the name is typed in any case; delete lands on `/admin` with "Client deleted."
6. Repeat 1-3 at 390px: cards instead of the table, nothing overflows horizontally.
7. `/i/does-not-exist`: branded unavailable page.
8. Storefront `/` looks unchanged (spot-check hero and the guest-list card).
Afterwards confirm the database is clean: `select count(*) from public.clients` returns 0 (delete through the UI, not SQL).

- [ ] **Step 2: Fold the staging notes into ARCHITECTURE.md**

Update ARCHITECTURE.md: the admin layout map (shell, breadcrumbs, new components and client islands: `AutoSubmitForm`, `OrderMenu`, `DeleteClientDialog`, `ContentEditor`, `FieldControl`, `MediaUploader`), the procedural traces for "delete client" (dialog → `deleteClient` → `admin_delete_client` RPC → `removeInvitationMedia` → redirect with notice) and "save content" (form state → `pruneContent` → `saveContent` → `checkContent`), the data-flow entry for `admin_delete_client` (security invoker, RLS admin policies, RV001/RV002), the `label`/`multiline`/`media` meta contract next to `ask`, and in "Known gaps": "Phase 3 must extend `deleteClient` to remove the client's auth user (service role) once clients have accounts." Then `rm STAGING_CHANGES.md`.

- [ ] **Step 3: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
```bash
git add ARCHITECTURE.md
git commit -m "docs: fold the admin redesign into ARCHITECTURE.md"
```
