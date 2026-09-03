# Rêve Stages 1–2: Foundation and Invitation Renderer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Supabase foundation and a working live invitation page at `/i/[slug]` — envelope reveal, countdown, gallery, details — rendering real data from Postgres.

**Architecture:** One Next.js App Router codebase. Invitation templates are React Server Components composed from a shared library of section primitives, resolved through a slug-keyed registry. The renderer is a pure function of `(content, theme, entitlements)` and never touches the database; the page fetches, the renderer renders. Entitlements resolve once server-side and pass down as a prop.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Supabase (Postgres + RLS), zod, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-04-reve-digital-invitations-design.md`

## Global Constraints

- Package manager is `pnpm` exclusively. Never `npm` or `yarn`.
- TypeScript strict mode. `any` is forbidden — use `unknown` and narrow.
- Default to Server Components. `'use client'` only where interaction demands it, pushed as deep as possible.
- Every input crossing a network or process boundary is validated with `zod`, server-side.
- Zero magic strings. Enums, unions, and consts live in dedicated modules.
- Public reads of published invitations use raw `fetch()` to PostgREST with the anon key, never `supabase-js`.
- All server-side `fetch()` to external APIs passes `cache: 'no-store'`.
- Logical CSS properties only: `padding-inline`, `margin-inline-start`. Never `padding-left`/`margin-right`.
- Storefront design tokens must not reach invitation templates. Two separate token sets.
- Small and monospaced type gets `WebkitFontSmoothing: 'antialiased'` and `textRendering: 'optimizeLegibility'` with pixel-based font floors.
- Every task ends green on `pnpm lint && pnpm typecheck && pnpm test`.
- Commit after every task.
- The project path contains a non-ASCII character (`Rêve`). If a tool fails on the path, report it rather than renaming the directory.

---

## File Structure

```
lib/
  env.ts                          zod-validated environment map, fails loud at startup
  constants.ts                    tier ids, order statuses, invitation statuses
  entitlements.ts                 tier -> Entitlements resolution
  rest.ts                         raw PostgREST fetch helpers for anon public reads
  countdown.ts                    pure time-remaining calculation
  envelope-storage.ts             localStorage access for the play-once envelope
  schemas/invitation.ts           zod: InvitationContent, Theme, Entitlements
  invitations/get-published.ts    fetch + validate a published invitation by slug

components/invitation/
  registry.ts                     template_slug -> component map
  EnvelopeGate.tsx                client island: the reveal layer
  envelope.css                    envelope animation
  primitives/
    Section.tsx                   shared vertical-rhythm wrapper
    Hero.tsx
    Countdown.tsx                 client island: ticking timer
    Details.tsx
    Gallery.tsx
  templates/
    cap-blanc/index.tsx           first template

app/
  i/[slug]/page.tsx               fetch, resolve entitlements, render
  i/[slug]/not-found.tsx
  i/[slug]/error.tsx

supabase/migrations/              append-only SQL
tests/                            Vitest unit tests
e2e/                              Playwright specs
```

---

### Task 1: Project scaffold and verification pipeline

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`
- Create: `vitest.config.ts`, `tests/setup.ts`
- Create: `app/layout.tsx`, `app/page.tsx`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a repo where `pnpm lint && pnpm typecheck && pnpm test` runs green. Every later task depends on this command working.

- [ ] **Step 1: Initialise git and scaffold Next.js**

Run from the project root:

```bash
git init
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm --yes
```

If the directory is non-empty and the scaffolder refuses, move `docs/` aside temporarily, scaffold, then move it back.

- [ ] **Step 2: Add test tooling**

```bash
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add zod
```

- [ ] **Step 3: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: Write `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add scripts to `package.json`**

Ensure the `scripts` block contains these keys alongside the generated ones:

```json
{
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test"
}
```

- [ ] **Step 6: Write the smoke test**

Create `tests/smoke.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 7: Run the full verification pipeline**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all three PASS. Fix any scaffold-generated lint errors before continuing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with lint, typecheck, and test pipeline"
```

---

### Task 2: Environment validation and constants

**Files:**
- Create: `lib/env.ts`, `lib/constants.ts`
- Create: `tests/lib/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Task 1's test pipeline
- Produces:
  - `parseEnv(source: Record<string, string | undefined>): Env` — throws on invalid input
  - `type Env = { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string }`
  - `env: Env` — the validated singleton, imported by every module needing configuration
  - `TIERS = { BASIC: 'basic', MANAGED: 'managed', CUSTOM: 'custom' } as const`
  - `type Tier = (typeof TIERS)[keyof typeof TIERS]`
  - `INVITATION_STATUS = { DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' } as const`
  - `type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS]`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/env.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-value',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-value',
};

describe('parseEnv', () => {
  it('returns a typed env object when every variable is present', () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it('throws when a required variable is missing', () => {
    const { SUPABASE_SERVICE_ROLE_KEY: _omitted, ...incomplete } = valid;
    expect(() => parseEnv(incomplete)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('throws when the Supabase URL is not a URL', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })).toThrow();
  });

  it('throws when a key is an empty string', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/env.test.ts`
Expected: FAIL — cannot resolve `@/lib/env`.

- [ ] **Step 3: Write `lib/constants.ts`**

```typescript
export const TIERS = {
  BASIC: 'basic',
  MANAGED: 'managed',
  CUSTOM: 'custom',
} as const;

export type Tier = (typeof TIERS)[keyof typeof TIERS];

export const INVITATION_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type InvitationStatus =
  (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];
```

- [ ] **Step 4: Write `lib/env.ts`**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${detail}`);
  }

  return result.data;
}

export const env: Env = parseEnv(process.env);
```

- [ ] **Step 5: Write `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Also create a real `.env.local` with working values so `pnpm dev` runs. Confirm `.env.local` is gitignored.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/env.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 7: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add validated environment map and domain constants"
```

---

### Task 3: Database schema and RLS

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Consumes: `TIERS` and `INVITATION_STATUS` from Task 2 (mirrored as Postgres enums)
- Produces: tables `templates`, `orders`, `invitations`, `guests`, `rsvps`, `custom_leads`, `admin_users`, and the public view `published_invitations` exposing `slug, template_slug, content, theme, entitlements, published_at` for `status = 'published'` rows only.

**Apply migrations with the `supabase-migration` skill or the Supabase MCP `apply_migration` tool. Do not hand-run SQL in the dashboard.**

- [ ] **Step 1: Write `supabase/migrations/0001_initial_schema.sql`**

```sql
create type tier as enum ('basic', 'managed', 'custom');
create type order_status as enum (
  'pending_payment', 'paid', 'in_design', 'review', 'delivered', 'cancelled'
);
create type invitation_status as enum ('draft', 'published', 'archived');
create type template_status as enum ('draft', 'published');

create table templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  tier_floor tier not null default 'basic',
  preview_images text[] not null default '{}',
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  sort_order integer not null default 0,
  status template_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  event_date date,
  template_slug text not null references templates(slug),
  tier tier not null,
  status order_status not null default 'pending_payment',
  amount numeric(10,2) not null,
  payment_proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  slug text not null unique,
  template_slug text not null references templates(slug),
  content jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  entitlements jsonb not null default '{}'::jsonb,
  manage_token_hash text,
  status invitation_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_slug_published_idx
  on invitations (slug) where status = 'published';

create table guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  name text not null,
  phone text,
  party_size integer not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  name text not null,
  attending boolean not null,
  party_size integer not null default 1,
  dietary_notes text,
  message text,
  created_at timestamptz not null default now()
);

create index rsvps_invitation_idx on rsvps (invitation_id, created_at desc);

create table custom_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  event_date date,
  brief text not null,
  budget_note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Write `supabase/migrations/0002_rls_policies.sql`**

The `published_invitations` view is the only public window onto invitations. It must never expose `manage_token_hash`, `order_id`, or `id`.

```sql
alter table templates enable row level security;
alter table orders enable row level security;
alter table invitations enable row level security;
alter table guests enable row level security;
alter table rsvps enable row level security;
alter table custom_leads enable row level security;
alter table admin_users enable row level security;

create function is_admin() returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

create policy "templates public read published" on templates
  for select to anon, authenticated using (status = 'published');

create policy "templates admin all" on templates
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "orders admin all" on orders
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "invitations admin all" on invitations
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "guests admin all" on guests
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "rsvps admin all" on rsvps
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "custom_leads admin all" on custom_leads
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin_users self read" on admin_users
  for select to authenticated using (user_id = auth.uid());

create view published_invitations
with (security_invoker = off) as
  select slug, template_slug, content, theme, entitlements, published_at
  from invitations
  where status = 'published';

grant select on published_invitations to anon, authenticated;
```

- [ ] **Step 3: Apply both migrations**

Apply via the `supabase-migration` skill or the Supabase MCP `apply_migration` tool, in order.

- [ ] **Step 4: Verify the public window is correctly sealed**

Run these two checks against the project with the **anon** key:

1. `select * from published_invitations` — must succeed and return no `manage_token_hash` column.
2. `select * from invitations` — must return zero rows (RLS denies anon entirely).

Both conditions must hold. If check 2 returns rows, the policy set is wrong — stop and fix before continuing.

- [ ] **Step 5: Run advisors**

Run the Supabase MCP `get_advisors` tool for security lints. Resolve anything it flags on these tables.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema and RLS policies"
```

---

### Task 4: Content, theme, and entitlement schemas

**Files:**
- Create: `lib/schemas/invitation.ts`
- Create: `tests/lib/schemas/invitation.test.ts`

**Interfaces:**
- Consumes: `Tier`, `TIERS` from Task 2
- Produces:
  - `invitationContentSchema` and `type InvitationContent`
  - `themeSchema` and `type Theme`
  - `entitlementsSchema` and `type Entitlements = { rsvp: boolean; portal: boolean; gallery: boolean }`

`InvitationContent` shape — every later task depends on these exact field names:

```typescript
{
  coupleFirstName: string;
  couplePartnerName: string;
  initials: string;              // 2-4 chars, drives the wax seal
  eventDate: string;             // ISO 8601 datetime
  headline?: string;
  message?: string;
  venue: { name: string; addressLine: string; mapUrl?: string };
  schedule: Array<{ time: string; title: string; description?: string }>;
  gallery: Array<{ src: string; alt: string }>;
}
```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/schemas/invitation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  entitlementsSchema,
  invitationContentSchema,
  themeSchema,
} from '@/lib/schemas/invitation';

const validContent = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  headline: 'We are getting married',
  message: 'Join us for the celebration.',
  venue: {
    name: 'Villa Rosa',
    addressLine: '12 Rue des Fleurs, Algiers',
    mapUrl: 'https://maps.example.com/villa-rosa',
  },
  schedule: [{ time: '17:00', title: 'Ceremony', description: 'Garden terrace' }],
  gallery: [{ src: '/photos/one.webp', alt: 'Sarah and Amine' }],
};

describe('invitationContentSchema', () => {
  it('accepts a fully populated content object', () => {
    expect(invitationContentSchema.parse(validContent)).toEqual(validContent);
  });

  it('defaults schedule and gallery to empty arrays when omitted', () => {
    const { schedule: _s, gallery: _g, ...withoutLists } = validContent;
    const parsed = invitationContentSchema.parse(withoutLists);
    expect(parsed.schedule).toEqual([]);
    expect(parsed.gallery).toEqual([]);
  });

  it('rejects a missing couple name', () => {
    const { coupleFirstName: _omitted, ...invalid } = validContent;
    expect(() => invitationContentSchema.parse(invalid)).toThrow();
  });

  it('rejects an event date that is not ISO 8601', () => {
    expect(() =>
      invitationContentSchema.parse({ ...validContent, eventDate: '12 June 2027' }),
    ).toThrow();
  });

  it('rejects initials longer than four characters', () => {
    expect(() =>
      invitationContentSchema.parse({ ...validContent, initials: 'SARAH' }),
    ).toThrow();
  });
});

describe('themeSchema', () => {
  it('applies defaults when given an empty object', () => {
    expect(themeSchema.parse({})).toEqual({ palette: 'default', motion: 'full' });
  });

  it('rejects an unknown motion value', () => {
    expect(() => themeSchema.parse({ motion: 'wild' })).toThrow();
  });
});

describe('entitlementsSchema', () => {
  it('defaults every capability to false', () => {
    expect(entitlementsSchema.parse({})).toEqual({
      rsvp: false,
      portal: false,
      gallery: false,
    });
  });

  it('preserves explicitly granted capabilities', () => {
    expect(entitlementsSchema.parse({ rsvp: true, gallery: true })).toEqual({
      rsvp: true,
      portal: false,
      gallery: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/schemas/invitation.test.ts`
Expected: FAIL — cannot resolve `@/lib/schemas/invitation`.

- [ ] **Step 3: Write `lib/schemas/invitation.ts`**

```typescript
import { z } from 'zod';

export const entitlementsSchema = z.object({
  rsvp: z.boolean().default(false),
  portal: z.boolean().default(false),
  gallery: z.boolean().default(false),
});

export type Entitlements = z.infer<typeof entitlementsSchema>;

export const themeSchema = z.object({
  palette: z.string().min(1).default('default'),
  motion: z.enum(['full', 'reduced']).default('full'),
});

export type Theme = z.infer<typeof themeSchema>;

const venueSchema = z.object({
  name: z.string().min(1),
  addressLine: z.string().min(1),
  mapUrl: z.string().url().optional(),
});

const scheduleItemSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const galleryItemSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

export const invitationContentSchema = z.object({
  coupleFirstName: z.string().min(1),
  couplePartnerName: z.string().min(1),
  initials: z.string().min(2).max(4),
  eventDate: z.string().datetime(),
  headline: z.string().optional(),
  message: z.string().optional(),
  venue: venueSchema,
  schedule: z.array(scheduleItemSchema).default([]),
  gallery: z.array(galleryItemSchema).default([]),
});

export type InvitationContent = z.infer<typeof invitationContentSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/schemas/invitation.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add invitation content, theme, and entitlement schemas"
```

---

### Task 5: Entitlement resolution

**Files:**
- Create: `lib/entitlements.ts`
- Create: `tests/lib/entitlements.test.ts`

**Interfaces:**
- Consumes: `Tier`, `TIERS` (Task 2); `Entitlements`, `entitlementsSchema` (Task 4)
- Produces: `entitlementsForTier(tier: Tier): Entitlements` — the single source of truth for what each tier includes. Called once at provisioning time, and its result is snapshotted onto the invitation row.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/entitlements.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { entitlementsForTier } from '@/lib/entitlements';
import { TIERS } from '@/lib/constants';

describe('entitlementsForTier', () => {
  it('grants basic a gallery but no RSVP and no portal', () => {
    expect(entitlementsForTier(TIERS.BASIC)).toEqual({
      rsvp: false,
      portal: false,
      gallery: true,
    });
  });

  it('grants managed RSVP, portal, and gallery', () => {
    expect(entitlementsForTier(TIERS.MANAGED)).toEqual({
      rsvp: true,
      portal: true,
      gallery: true,
    });
  });

  it('grants custom everything managed receives', () => {
    expect(entitlementsForTier(TIERS.CUSTOM)).toEqual(
      entitlementsForTier(TIERS.MANAGED),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/entitlements.test.ts`
Expected: FAIL — cannot resolve `@/lib/entitlements`.

- [ ] **Step 3: Write `lib/entitlements.ts`**

```typescript
import { TIERS, type Tier } from '@/lib/constants';
import { entitlementsSchema, type Entitlements } from '@/lib/schemas/invitation';

const BY_TIER: Record<Tier, Entitlements> = {
  [TIERS.BASIC]: { rsvp: false, portal: false, gallery: true },
  [TIERS.MANAGED]: { rsvp: true, portal: true, gallery: true },
  [TIERS.CUSTOM]: { rsvp: true, portal: true, gallery: true },
};

export function entitlementsForTier(tier: Tier): Entitlements {
  return entitlementsSchema.parse(BY_TIER[tier]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/entitlements.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add tier entitlement resolution"
```

---

### Task 6: PostgREST anon read layer

**Files:**
- Create: `lib/rest.ts`, `lib/invitations/get-published.ts`
- Create: `tests/lib/invitations/get-published.test.ts`

**Interfaces:**
- Consumes: `env` (Task 2); `invitationContentSchema`, `themeSchema`, `entitlementsSchema` (Task 4)
- Produces:
  - `restGet<T>(path: string): Promise<T[]>` — raw PostgREST GET with the anon key, `cache: 'no-store'`
  - `getPublishedInvitation(slug: string): Promise<PublishedInvitation | null>`
  - `type PublishedInvitation = { slug: string; templateSlug: string; content: InvitationContent; theme: Theme; entitlements: Entitlements }`

`supabase-js` is forbidden on this path. A stale session must never be able to stall a wedding invitation.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/invitations/get-published.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  },
}));

import { getPublishedInvitation } from '@/lib/invitations/get-published';

const row = {
  slug: 'sarah-and-amine',
  template_slug: 'cap-blanc',
  content: {
    coupleFirstName: 'Sarah',
    couplePartnerName: 'Amine',
    initials: 'SA',
    eventDate: '2027-06-12T17:00:00.000Z',
    venue: { name: 'Villa Rosa', addressLine: '12 Rue des Fleurs' },
    schedule: [],
    gallery: [],
  },
  theme: { palette: 'default', motion: 'full' },
  entitlements: { rsvp: true, portal: true, gallery: true },
  published_at: '2026-09-01T00:00:00.000Z',
};

function mockFetchOnce(body: unknown, ok = true) {
  const spy = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPublishedInvitation', () => {
  it('returns a camelCased, validated invitation', async () => {
    mockFetchOnce([row]);
    const result = await getPublishedInvitation('sarah-and-amine');

    expect(result).not.toBeNull();
    expect(result?.templateSlug).toBe('cap-blanc');
    expect(result?.content.coupleFirstName).toBe('Sarah');
    expect(result?.entitlements.rsvp).toBe(true);
  });

  it('reads from the published_invitations view with no-store caching', async () => {
    const spy = mockFetchOnce([row]);
    await getPublishedInvitation('sarah-and-amine');

    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain('/rest/v1/published_invitations');
    expect(String(url)).toContain('slug=eq.sarah-and-amine');
    expect(init.cache).toBe('no-store');
  });

  it('returns null when no row matches', async () => {
    mockFetchOnce([]);
    expect(await getPublishedInvitation('missing')).toBeNull();
  });

  it('throws when PostgREST returns an error status', async () => {
    mockFetchOnce({ message: 'boom' }, false);
    await expect(getPublishedInvitation('sarah-and-amine')).rejects.toThrow();
  });

  it('throws when the stored content fails schema validation', async () => {
    mockFetchOnce([{ ...row, content: { coupleFirstName: 'Sarah' } }]);
    await expect(getPublishedInvitation('sarah-and-amine')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/invitations/get-published.test.ts`
Expected: FAIL — cannot resolve `@/lib/invitations/get-published`.

- [ ] **Step 3: Write `lib/rest.ts`**

```typescript
import { env } from '@/lib/env';

export async function restGet<T>(path: string): Promise<T[]> {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PostgREST request failed (${response.status}): ${path}`);
  }

  return (await response.json()) as T[];
}
```

- [ ] **Step 4: Write `lib/invitations/get-published.ts`**

```typescript
import { restGet } from '@/lib/rest';
import {
  entitlementsSchema,
  invitationContentSchema,
  themeSchema,
  type Entitlements,
  type InvitationContent,
  type Theme,
} from '@/lib/schemas/invitation';

type PublishedInvitationRow = {
  slug: string;
  template_slug: string;
  content: unknown;
  theme: unknown;
  entitlements: unknown;
  published_at: string | null;
};

export type PublishedInvitation = {
  slug: string;
  templateSlug: string;
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

export async function getPublishedInvitation(
  slug: string,
): Promise<PublishedInvitation | null> {
  const rows = await restGet<PublishedInvitationRow>(
    `published_invitations?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
  );

  const row = rows.at(0);
  if (!row) return null;

  return {
    slug: row.slug,
    templateSlug: row.template_slug,
    content: invitationContentSchema.parse(row.content),
    theme: themeSchema.parse(row.theme),
    entitlements: entitlementsSchema.parse(row.entitlements),
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/invitations/get-published.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 6: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add anon PostgREST read layer for published invitations"
```

---

### Task 7: Section primitives — Section, Hero, Details

**Files:**
- Create: `components/invitation/primitives/Section.tsx`, `Hero.tsx`, `Details.tsx`
- Create: `tests/components/invitation/primitives.test.tsx`

**Interfaces:**
- Consumes: `InvitationContent` (Task 4)
- Produces:
  - `<Section>` — `{ children: ReactNode; className?: string }`, shared vertical rhythm wrapper
  - `<Hero>` — `{ content: InvitationContent }`
  - `<Details>` — `{ content: InvitationContent }`

All three are Server Components — no `'use client'`. Styling uses logical properties only.

- [ ] **Step 1: Write the failing test**

Create `tests/components/invitation/primitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/invitation/primitives/Hero';
import { Details } from '@/components/invitation/primitives/Details';
import type { InvitationContent } from '@/lib/schemas/invitation';

const content: InvitationContent = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  headline: 'We are getting married',
  message: 'Join us for the celebration.',
  venue: {
    name: 'Villa Rosa',
    addressLine: '12 Rue des Fleurs, Algiers',
    mapUrl: 'https://maps.example.com/villa-rosa',
  },
  schedule: [{ time: '17:00', title: 'Ceremony', description: 'Garden terrace' }],
  gallery: [],
};

describe('Hero', () => {
  it('renders both names', () => {
    render(<Hero content={content} />);
    expect(screen.getByText(/Sarah/)).toBeInTheDocument();
    expect(screen.getByText(/Amine/)).toBeInTheDocument();
  });

  it('renders the headline when present', () => {
    render(<Hero content={content} />);
    expect(screen.getByText('We are getting married')).toBeInTheDocument();
  });

  it('omits the headline element entirely when absent', () => {
    const { headline: _omitted, ...withoutHeadline } = content;
    render(<Hero content={withoutHeadline} />);
    expect(screen.queryByText('We are getting married')).not.toBeInTheDocument();
  });
});

describe('Details', () => {
  it('renders venue name and address', () => {
    render(<Details content={content} />);
    expect(screen.getByText('Villa Rosa')).toBeInTheDocument();
    expect(screen.getByText('12 Rue des Fleurs, Algiers')).toBeInTheDocument();
  });

  it('renders each schedule item', () => {
    render(<Details content={content} />);
    expect(screen.getByText('Ceremony')).toBeInTheDocument();
    expect(screen.getByText('17:00')).toBeInTheDocument();
  });

  it('renders a map link when mapUrl is present', () => {
    render(<Details content={content} />);
    expect(screen.getByRole('link', { name: /directions/i })).toHaveAttribute(
      'href',
      'https://maps.example.com/villa-rosa',
    );
  });

  it('omits the map link when mapUrl is absent', () => {
    const withoutMap = { ...content, venue: { ...content.venue, mapUrl: undefined } };
    render(<Details content={withoutMap} />);
    expect(screen.queryByRole('link', { name: /directions/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/components/invitation/primitives.test.tsx`
Expected: FAIL — cannot resolve the primitive modules.

- [ ] **Step 3: Write `components/invitation/primitives/Section.tsx`**

```tsx
import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  className?: string;
};

export function Section({ children, className }: SectionProps) {
  return (
    <section className={`px-6 py-20 md:py-28 ${className ?? ''}`}>
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Write `components/invitation/primitives/Hero.tsx`**

```tsx
import { Section } from './Section';
import type { InvitationContent } from '@/lib/schemas/invitation';

type HeroProps = {
  content: InvitationContent;
};

export function Hero({ content }: HeroProps) {
  return (
    <Section className="text-center">
      {content.headline ? (
        <p className="text-sm uppercase tracking-[0.2em]">{content.headline}</p>
      ) : null}

      <h1 className="mt-6 text-5xl md:text-6xl">
        {content.coupleFirstName}
        <span className="mx-3 align-middle text-3xl">&amp;</span>
        {content.couplePartnerName}
      </h1>

      {content.message ? (
        <p className="mt-8 text-base leading-relaxed">{content.message}</p>
      ) : null}
    </Section>
  );
}
```

- [ ] **Step 5: Write `components/invitation/primitives/Details.tsx`**

```tsx
import { Section } from './Section';
import type { InvitationContent } from '@/lib/schemas/invitation';

type DetailsProps = {
  content: InvitationContent;
};

export function Details({ content }: DetailsProps) {
  return (
    <Section className="text-center">
      <h2 className="text-3xl">{content.venue.name}</h2>
      <p className="mt-3 text-sm">{content.venue.addressLine}</p>

      {content.venue.mapUrl ? (
        <a
          className="mt-4 inline-block text-sm underline"
          href={content.venue.mapUrl}
          rel="noreferrer noopener"
          target="_blank"
        >
          Directions
        </a>
      ) : null}

      {content.schedule.length > 0 ? (
        <ul className="mt-12 space-y-8">
          {content.schedule.map((item) => (
            <li key={`${item.time}-${item.title}`}>
              <p className="text-sm tracking-widest">{item.time}</p>
              <p className="mt-1 text-xl">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-sm">{item.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run tests/components/invitation/primitives.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 7: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add Section, Hero, and Details invitation primitives"
```

---

### Task 8: Countdown primitive

**Files:**
- Create: `lib/countdown.ts`, `components/invitation/primitives/Countdown.tsx`
- Create: `tests/lib/countdown.test.ts`

**Interfaces:**
- Consumes: `Section` (Task 7)
- Produces:
  - `timeUntil(target: Date, now: Date): CountdownParts`
  - `type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; hasPassed: boolean }`
  - `<Countdown>` — `{ eventDate: string }`, a client island

The pure function is tested; the component is a thin client wrapper around it. This keeps the tick logic testable without fake timers in a DOM.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/countdown.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { timeUntil } from '@/lib/countdown';

const target = new Date('2027-06-12T17:00:00.000Z');

describe('timeUntil', () => {
  it('breaks the remaining span into days, hours, minutes, and seconds', () => {
    const now = new Date('2027-06-10T15:30:30.000Z');
    expect(timeUntil(target, now)).toEqual({
      days: 2,
      hours: 1,
      minutes: 29,
      seconds: 30,
      hasPassed: false,
    });
  });

  it('reports all zeroes and hasPassed once the target is reached', () => {
    expect(timeUntil(target, target)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      hasPassed: true,
    });
  });

  it('never returns negative values after the target has passed', () => {
    const now = new Date('2027-06-14T17:00:00.000Z');
    expect(timeUntil(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      hasPassed: true,
    });
  });

  it('handles a span of less than one minute', () => {
    const now = new Date('2027-06-12T16:59:15.000Z');
    expect(timeUntil(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 45,
      hasPassed: false,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/countdown.test.ts`
Expected: FAIL — cannot resolve `@/lib/countdown`.

- [ ] **Step 3: Write `lib/countdown.ts`**

```typescript
export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  hasPassed: boolean;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeUntil(target: Date, now: Date): CountdownParts {
  const remaining = target.getTime() - now.getTime();

  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, hasPassed: true };
  }

  return {
    days: Math.floor(remaining / DAY),
    hours: Math.floor((remaining % DAY) / HOUR),
    minutes: Math.floor((remaining % HOUR) / MINUTE),
    seconds: Math.floor((remaining % MINUTE) / SECOND),
    hasPassed: false,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/countdown.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write `components/invitation/primitives/Countdown.tsx`**

Rendering starts as `null` and fills in after mount, so server and client markup agree and no hydration mismatch occurs.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Section } from './Section';
import { timeUntil, type CountdownParts } from '@/lib/countdown';

type CountdownProps = {
  eventDate: string;
};

const UNITS: Array<{ key: keyof Omit<CountdownParts, 'hasPassed'>; label: string }> = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
];

export function Countdown({ eventDate }: CountdownProps) {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const target = new Date(eventDate);
    const tick = () => setParts(timeUntil(target, new Date()));

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [eventDate]);

  if (!parts || parts.hasPassed) return null;

  return (
    <Section className="text-center">
      <ul
        className="flex justify-center gap-8"
        style={{
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'optimizeLegibility',
        }}
      >
        {UNITS.map((unit) => (
          <li key={unit.key}>
            <p className="text-4xl tabular-nums">{parts[unit.key]}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em]">{unit.label}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 6: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add countdown logic and primitive"
```

---

### Task 9: Gallery primitive with entitlement gating

**Files:**
- Create: `components/invitation/primitives/Gallery.tsx`
- Create: `tests/components/invitation/gallery.test.tsx`

**Interfaces:**
- Consumes: `InvitationContent`, `Entitlements` (Task 4); `Section` (Task 7)
- Produces: `<Gallery>` — `{ content: InvitationContent; entitlements: Entitlements }`

This is the first primitive to gate on entitlements, and it establishes the pattern every gated primitive follows: when the capability is absent, render `null` — no placeholder, no upsell, no empty container.

- [ ] **Step 1: Write the failing test**

Create `tests/components/invitation/gallery.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Gallery } from '@/components/invitation/primitives/Gallery';
import type { Entitlements, InvitationContent } from '@/lib/schemas/invitation';

const content: InvitationContent = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: { name: 'Villa Rosa', addressLine: '12 Rue des Fleurs' },
  schedule: [],
  gallery: [
    { src: '/photos/one.webp', alt: 'By the sea' },
    { src: '/photos/two.webp', alt: 'In the garden' },
  ],
};

const granted: Entitlements = { rsvp: false, portal: false, gallery: true };
const withheld: Entitlements = { rsvp: false, portal: false, gallery: false };

describe('Gallery', () => {
  it('renders every image when the gallery entitlement is granted', () => {
    render(<Gallery content={content} entitlements={granted} />);
    expect(screen.getByAltText('By the sea')).toBeInTheDocument();
    expect(screen.getByAltText('In the garden')).toBeInTheDocument();
  });

  it('renders nothing when the gallery entitlement is withheld', () => {
    const { container } = render(<Gallery content={content} entitlements={withheld} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when entitled but no photos exist', () => {
    const { container } = render(
      <Gallery content={{ ...content, gallery: [] }} entitlements={granted} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/components/invitation/gallery.test.tsx`
Expected: FAIL — cannot resolve `@/components/invitation/primitives/Gallery`.

- [ ] **Step 3: Write `components/invitation/primitives/Gallery.tsx`**

```tsx
import Image from 'next/image';
import { Section } from './Section';
import type { Entitlements, InvitationContent } from '@/lib/schemas/invitation';

type GalleryProps = {
  content: InvitationContent;
  entitlements: Entitlements;
};

export function Gallery({ content, entitlements }: GalleryProps) {
  if (!entitlements.gallery) return null;
  if (content.gallery.length === 0) return null;

  return (
    <Section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {content.gallery.map((photo) => (
          <Image
            key={photo.src}
            alt={photo.alt}
            className="h-full w-full object-cover"
            height={800}
            src={photo.src}
            width={800}
          />
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/components/invitation/gallery.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 5: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add gallery primitive with entitlement gating"
```

---

### Task 10: EnvelopeGate

**Files:**
- Create: `lib/envelope-storage.ts`, `components/invitation/EnvelopeGate.tsx`, `components/invitation/envelope.css`
- Create: `tests/lib/envelope-storage.test.ts`, `tests/components/invitation/envelope-gate.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `hasOpened(slug: string): boolean` and `markOpened(slug: string): void` — localStorage access, both safe when storage is unavailable
  - `<EnvelopeGate>` — `{ slug: string; initials: string; children: ReactNode }`

Behaviour: first visit shows a sealed envelope; tapping the seal opens it and reveals `children`. Return visits render `children` immediately. `prefers-reduced-motion` shortens the animation but preserves the tap-to-open interaction. If localStorage throws — Safari private browsing — the envelope simply shows every time rather than crashing.

- [ ] **Step 1: Write the failing storage test**

Create `tests/lib/envelope-storage.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasOpened, markOpened } from '@/lib/envelope-storage';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('envelope storage', () => {
  it('reports not opened for an unknown slug', () => {
    expect(hasOpened('sarah-and-amine')).toBe(false);
  });

  it('reports opened after marking', () => {
    markOpened('sarah-and-amine');
    expect(hasOpened('sarah-and-amine')).toBe(true);
  });

  it('tracks each invitation separately', () => {
    markOpened('sarah-and-amine');
    expect(hasOpened('lina-and-karim')).toBe(false);
  });

  it('returns false rather than throwing when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
    });

    expect(hasOpened('sarah-and-amine')).toBe(false);
    expect(() => markOpened('sarah-and-amine')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/envelope-storage.test.ts`
Expected: FAIL — cannot resolve `@/lib/envelope-storage`.

- [ ] **Step 3: Write `lib/envelope-storage.ts`**

```typescript
const PREFIX = 'reve:envelope-opened:';

export function hasOpened(slug: string): boolean {
  try {
    return window.localStorage.getItem(`${PREFIX}${slug}`) === '1';
  } catch {
    return false;
  }
}

export function markOpened(slug: string): void {
  try {
    window.localStorage.setItem(`${PREFIX}${slug}`, '1');
  } catch {
    // Storage unavailable (private browsing). The envelope simply replays.
  }
}
```

- [ ] **Step 4: Run the storage test to verify it passes**

Run: `pnpm vitest run tests/lib/envelope-storage.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the failing gate test**

Create `tests/components/invitation/envelope-gate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';

beforeEach(() => {
  window.localStorage.clear();
});

function renderGate() {
  return render(
    <EnvelopeGate initials="SA" slug="sarah-and-amine">
      <p>Invitation body</p>
    </EnvelopeGate>,
  );
}

describe('EnvelopeGate', () => {
  it('shows the sealed envelope on a first visit', async () => {
    renderGate();
    expect(await screen.findByRole('button', { name: /open/i })).toBeInTheDocument();
  });

  it('shows the couple initials on the seal', async () => {
    renderGate();
    expect(await screen.findByText('SA')).toBeInTheDocument();
  });

  it('reveals the invitation after the seal is tapped', async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(await screen.findByRole('button', { name: /open/i }));

    expect(screen.getByText('Invitation body')).toBeInTheDocument();
    await screen.findByText('Invitation body');
  });

  it('records the opening so a return visit skips the envelope', async () => {
    const user = userEvent.setup();
    const first = renderGate();

    await user.click(await screen.findByRole('button', { name: /open/i }));
    first.unmount();

    renderGate();
    expect(await screen.findByText('Invitation body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the gate test to verify it fails**

Run: `pnpm vitest run tests/components/invitation/envelope-gate.test.tsx`
Expected: FAIL — cannot resolve `@/components/invitation/EnvelopeGate`.

- [ ] **Step 7: Write `components/invitation/envelope.css`**

```css
.envelope-gate {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: var(--envelope-bg, #efe9e1);
}

.envelope-seal {
  inline-size: 7rem;
  block-size: 7rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  background: var(--envelope-seal-bg, #6f2233);
  color: var(--envelope-seal-fg, #f6f1ea);
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  transition: transform 220ms ease;
}

.envelope-seal:hover {
  transform: scale(1.04);
}

.envelope-gate[data-state='opening'] {
  animation: envelope-dissolve 900ms ease forwards;
}

@keyframes envelope-dissolve {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .envelope-gate[data-state='opening'] {
    animation-duration: 1ms;
  }

  .envelope-seal {
    transition: none;
  }
}
```

- [ ] **Step 8: Write `components/invitation/EnvelopeGate.tsx`**

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { hasOpened, markOpened } from '@/lib/envelope-storage';
import './envelope.css';

type EnvelopeGateProps = {
  slug: string;
  initials: string;
  children: ReactNode;
};

type GateState = 'checking' | 'sealed' | 'opening' | 'open';

const REVEAL_MS = 900;

export function EnvelopeGate({ slug, initials, children }: EnvelopeGateProps) {
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    setState(hasOpened(slug) ? 'open' : 'sealed');
  }, [slug]);

  useEffect(() => {
    if (state !== 'opening') return;

    const id = window.setTimeout(() => setState('open'), REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  function open() {
    markOpened(slug);
    setState('opening');
  }

  if (state === 'checking') return null;

  return (
    <>
      {state !== 'open' ? (
        <div className="envelope-gate" data-state={state}>
          <button
            aria-label="Open your invitation"
            className="envelope-seal"
            onClick={open}
            type="button"
          >
            {initials}
          </button>
        </div>
      ) : null}

      {children}
    </>
  );
}
```

- [ ] **Step 9: Run the gate test to verify it passes**

Run: `pnpm vitest run tests/components/invitation/envelope-gate.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 10: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add envelope gate with play-once reveal"
```

---

### Task 11: Template registry and the first template

**Files:**
- Create: `components/invitation/templates/cap-blanc/index.tsx`
- Create: `components/invitation/registry.ts`
- Create: `tests/components/invitation/registry.test.ts`

**Interfaces:**
- Consumes: every primitive (Tasks 7–9); `InvitationContent`, `Theme`, `Entitlements` (Task 4)
- Produces:
  - `type TemplateProps = { content: InvitationContent; theme: Theme; entitlements: Entitlements }`
  - `type TemplateComponent = (props: TemplateProps) => ReactNode`
  - `getTemplate(slug: string): TemplateComponent | null`
  - `TEMPLATE_SLUGS: readonly string[]`

The registry is the seam that makes templates pluggable. Adding a template means adding a directory and one registry entry — nothing else in the system changes.

- [ ] **Step 1: Write the failing test**

Create `tests/components/invitation/registry.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { getTemplate, TEMPLATE_SLUGS } from '@/components/invitation/registry';

describe('template registry', () => {
  it('resolves a registered template to a component', () => {
    expect(typeof getTemplate('cap-blanc')).toBe('function');
  });

  it('returns null for an unknown slug', () => {
    expect(getTemplate('does-not-exist')).toBeNull();
  });

  it('lists cap-blanc among the registered slugs', () => {
    expect(TEMPLATE_SLUGS).toContain('cap-blanc');
  });

  it('resolves every advertised slug to a component', () => {
    for (const slug of TEMPLATE_SLUGS) {
      expect(getTemplate(slug), `slug ${slug} is unresolvable`).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/components/invitation/registry.test.ts`
Expected: FAIL — cannot resolve `@/components/invitation/registry`.

- [ ] **Step 3: Write `components/invitation/registry.ts`**

Types live here and the template imports them, so there is no import cycle.

```typescript
import type { ReactNode } from 'react';
import { CapBlanc } from '@/components/invitation/templates/cap-blanc';
import type {
  Entitlements,
  InvitationContent,
  Theme,
} from '@/lib/schemas/invitation';

export type TemplateProps = {
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

export type TemplateComponent = (props: TemplateProps) => ReactNode;

const REGISTRY: Record<string, TemplateComponent> = {
  'cap-blanc': CapBlanc,
};

export const TEMPLATE_SLUGS: readonly string[] = Object.keys(REGISTRY);

export function getTemplate(slug: string): TemplateComponent | null {
  return REGISTRY[slug] ?? null;
}
```

- [ ] **Step 4: Write `components/invitation/templates/cap-blanc/index.tsx`**

```tsx
import { Countdown } from '@/components/invitation/primitives/Countdown';
import { Details } from '@/components/invitation/primitives/Details';
import { Gallery } from '@/components/invitation/primitives/Gallery';
import { Hero } from '@/components/invitation/primitives/Hero';
import type {
  Entitlements,
  InvitationContent,
  Theme,
} from '@/lib/schemas/invitation';

type CapBlancProps = {
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

export function CapBlanc({ content, entitlements }: CapBlancProps) {
  return (
    <main className="min-h-dvh bg-[#f6f1ea] text-[#2b2118]">
      <Hero content={content} />
      <Countdown eventDate={content.eventDate} />
      <Details content={content} />
      <Gallery content={content} entitlements={entitlements} />
    </main>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/components/invitation/registry.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add template registry and the Cap Blanc template"
```

---

### Task 12: The live invitation route

**Files:**
- Create: `app/i/[slug]/page.tsx`, `app/i/[slug]/not-found.tsx`, `app/i/[slug]/error.tsx`
- Create: `e2e/invitation.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: `getPublishedInvitation` (Task 6); `getTemplate` (Task 11); `EnvelopeGate` (Task 10)
- Produces: a working page at `/i/[slug]`. This is the deliverable the whole plan builds toward.

The page fetches, resolves the template, and renders. It passes entitlements down as a prop and never lets a component query the tier. An unknown slug, an unpublished invitation, or an unregistered template all produce a 404 — never a blank page.

- [ ] **Step 1: Write `app/i/[slug]/not-found.tsx`**

```tsx
export default function InvitationNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f1ea] px-6 text-center text-[#2b2118]">
      <div>
        <h1 className="text-3xl">This invitation is not available</h1>
        <p className="mt-4 text-sm">
          The link may be incorrect, or the invitation may not be published yet.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Write `app/i/[slug]/error.tsx`**

```tsx
'use client';

export default function InvitationError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f1ea] px-6 text-center text-[#2b2118]">
      <div>
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-4 text-sm">Please try again in a moment.</p>
        <button className="mt-6 underline" onClick={reset} type="button">
          Retry
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write `app/i/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EnvelopeGate } from '@/components/invitation/EnvelopeGate';
import { getTemplate } from '@/components/invitation/registry';
import { getPublishedInvitation } from '@/lib/invitations/get-published';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  if (!invitation) return { title: 'Invitation' };

  const { coupleFirstName, couplePartnerName } = invitation.content;

  return {
    title: `${coupleFirstName} & ${couplePartnerName}`,
    description: invitation.content.headline ?? 'You are invited.',
  };
}

export default async function InvitationPage({ params }: PageProps) {
  const { slug } = await params;
  const invitation = await getPublishedInvitation(slug);

  if (!invitation) notFound();

  const Template = getTemplate(invitation.templateSlug);

  if (!Template) notFound();

  return (
    <EnvelopeGate initials={invitation.content.initials} slug={invitation.slug}>
      <Template
        content={invitation.content}
        entitlements={invitation.entitlements}
        theme={invitation.theme}
      />
    </EnvelopeGate>
  );
}
```

- [ ] **Step 4: Seed a published invitation for manual and end-to-end testing**

Insert one template row and one published invitation via the Supabase MCP `execute_sql` tool:

```sql
insert into templates (slug, name, description, status)
values ('cap-blanc', 'Cap Blanc', 'Mediterranean, airy, understated.', 'published')
on conflict (slug) do nothing;

insert into orders (reference, customer_name, customer_phone, template_slug, tier, status, amount)
values ('RV-0001', 'Sarah Test', '+000000000', 'cap-blanc', 'managed', 'paid', 100)
on conflict (reference) do nothing;

insert into invitations (order_id, slug, template_slug, content, theme, entitlements, status, published_at)
select
  o.id,
  'sarah-and-amine',
  'cap-blanc',
  '{
     "coupleFirstName": "Sarah",
     "couplePartnerName": "Amine",
     "initials": "SA",
     "eventDate": "2027-06-12T17:00:00.000Z",
     "headline": "We are getting married",
     "message": "Join us for the celebration.",
     "venue": { "name": "Villa Rosa", "addressLine": "12 Rue des Fleurs, Algiers" },
     "schedule": [{ "time": "17:00", "title": "Ceremony", "description": "Garden terrace" }],
     "gallery": []
   }'::jsonb,
  '{ "palette": "default", "motion": "full" }'::jsonb,
  '{ "rsvp": true, "portal": true, "gallery": true }'::jsonb,
  'published',
  now()
from orders o
where o.reference = 'RV-0001'
on conflict (slug) do nothing;
```

- [ ] **Step 5: Verify the page manually**

```bash
pnpm dev
```

Open `http://localhost:3000/i/sarah-and-amine`. Confirm all four in order:

1. The sealed envelope appears with `SA` on it.
2. Tapping it reveals the invitation.
3. Reloading skips the envelope.
4. `http://localhost:3000/i/nope` returns the not-found page, not a crash.

- [ ] **Step 6: Install and configure Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 7: Write the end-to-end spec**

Create `e2e/invitation.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

const SLUG = 'sarah-and-amine';

test('a guest opens the envelope and sees the invitation', async ({ page }) => {
  await page.goto(`/i/${SLUG}`);

  const seal = page.getByRole('button', { name: /open your invitation/i });
  await expect(seal).toBeVisible();

  await seal.click();

  await expect(page.getByRole('heading', { name: /Sarah/ })).toBeVisible();
  await expect(seal).toBeHidden();
});

test('a returning guest skips the envelope', async ({ page }) => {
  await page.goto(`/i/${SLUG}`);
  await page.getByRole('button', { name: /open your invitation/i }).click();

  await page.reload();

  await expect(page.getByRole('heading', { name: /Sarah/ })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /open your invitation/i }),
  ).toHaveCount(0);
});

test('an unknown slug renders the not-found page', async ({ page }) => {
  await page.goto('/i/definitely-not-a-real-invitation');
  await expect(page.getByText(/not available/i)).toBeVisible();
});
```

- [ ] **Step 8: Run the end-to-end suite**

Run: `pnpm e2e`
Expected: 3 tests PASS.

- [ ] **Step 9: Run the full pipeline and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
git add -A
git commit -m "feat: add live invitation route with envelope reveal"
```

---

## Definition of Done

Stages 1–2 are complete when:

- `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` runs green.
- `/i/sarah-and-amine` renders the Cap Blanc template behind a play-once envelope.
- An unknown or unpublished slug returns the not-found page.
- Anon access to the `invitations` base table returns zero rows, while `published_invitations` returns published rows without `manage_token_hash`.
- No component queries the tier; entitlements flow from the page as a prop.

## What comes next

Stage 3 (admin: auth, order queue, provisioning, content editor with live preview) gets its own plan, written once this one is executed and the primitives have proven themselves in practice.

Deliberately deferred from this plan, to be picked up in later stages:

- **Visual design pass.** Templates here use plain neutral styling. Typography concepts, the cream/wine token system, and the full envelope artwork come once the mechanics are proven.
- **RSVP primitive and portal.** Stage 5. The `rsvp` entitlement already flows through the renderer; no primitive consumes it yet.
- **Storefront.** Stage 4.
