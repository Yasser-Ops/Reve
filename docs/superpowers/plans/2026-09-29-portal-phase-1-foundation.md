# Portal Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every design declares its own content schema and loads only when rendered, and an operator can sign in to a gated, never-indexed `/admin`.

**Architecture:** Content splits into a shared core (names, initials, date, venue) plus ready-made blocks; each design composes its own zod schema from them, and `defineTemplate` binds that schema to the design's component so a mismatch fails typecheck. The registry holds schemas eagerly and components as lazy loaders. Auth is Supabase email and password through `@supabase/ssr`: `proxy.ts` refreshes the session on private routes only, and `requireAdmin()` gates every admin page with `getClaims()` plus an `admin_users` membership check.

**Tech Stack:** Next.js 16.3 (App Router, `proxy.ts`), React 19, TypeScript strict, zod 4, `@supabase/ssr` + `@supabase/supabase-js`, shadcn/ui on Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-client-portal-design.md` (Phase 1 of 02; sections 04, 05, 07, 09, 11)

**Deviations from the spec, decided while planning:**
- Content schemas live in `lib/schemas/content/`, not `lib/schemas/invitation/`: a directory of that name would shadow the existing `lib/schemas/invitation.ts` that still holds `entitlementsSchema` and `themeSchema`.
- Only `lib/supabase/server.ts` and `lib/supabase/proxy.ts` are created. `client.ts` and `admin.ts` have no consumer until Phase 2/3 and would be dead code now.
- The `migrate(content)` rename hook from spec 04 is not built: no field has been renamed, so there is nothing for it to do.

## Global Constraints

- `pnpm` only. Never `npm install` or `yarn`.
- TypeScript strict. `any` is forbidden; use `unknown`. No `as` casts where a type can be inferred.
- Next.js 16 renamed Middleware to Proxy: the file is `proxy.ts` at the project root exporting `proxy`. Before touching any Next API, read the matching guide under `node_modules/next/dist/docs/` (AGENTS.md).
- Authorization uses `supabase.auth.getClaims()`, never `getSession()`.
- Every value crossing a network or process boundary is parsed with zod.
- No magic strings: routes, notices and messages are named constants.
- Human-facing copy has no mid-sentence em-dashes (—). Em-dashes are allowed in code comments and section labels.
- Small or monospaced type on private surfaces gets `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`.
- shadcn primitives are added only through `pnpm dlx shadcn@latest add <name>`; never hand-edit `components/ui/*`.
- Prefer marketplace skills: `nextjs-supabase-kit:scaffold-route` for new route segments, `nextjs-supabase-kit:server-action` for actions.
- `ARCHITECTURE.md` and `CLAUDE.md` are read-only during this plan. Structural notes go into `STAGING_CHANGES.md` (untracked, gitignored).
- A task is done only when `pnpm lint && pnpm typecheck && pnpm test` passes.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A signed-in account that is not an admin opens `/admin`** (every future client will have a valid session): it must land on `/admin/login` with the "no admin access" notice, never see the admin shell. Pinned in Task 6.
2. **An expired or tampered session cookie:** `getClaims()` returns an error rather than claims; the guard must redirect to login, not throw a 500. Pinned in Task 6.
3. **A design slug that is not in the registry**, like the live seed invitation `sarah-and-amine` on the removed `cap-blanc`: `/i/sarah-and-amine` must 404, not crash. Pinned in Task 4.
4. **Stored content that no longer satisfies its design's schema** (initials `SARAH`, missing venue): the read must throw loudly into `error.tsx`, never render a half-filled invitation. Pinned in Task 4.
5. **A private design's slug typed into `/weddings/<slug>`:** 404, and never in the sitemap or on a shelf. Pinned in Task 3.

---

## File Structure

```
lib/schemas/content/
  core.ts            coreContentSchema, CoreContent, DesignSchema, GlobalMeta.ask
  blocks.ts          BLOCKS (headline, message, schedule, gallery, heroMedia,
                     registryMessage), ScheduleItem
  checklist.ts       checklistFor(schema), checklistMessage(items)
lib/schemas/invitation.ts        loses invitationContentSchema (entitlements, theme stay)
components/invitation/templates/lin/schema.ts      linContentSchema, LinContent
components/invitation/templates/jardin/schema.ts   jardinContentSchema, JardinContent
components/invitation/registry.ts  defineTemplate, VISIBILITY, lazy load(),
                                   listedOf, pageSlugsOf, loadTemplate
components/invitation/TemplateRenderer.tsx         async, uses loadTemplate
lib/invitations/get-published.ts   parses with the design's own schema
lib/routes.ts                      ROUTES, PRIVATE_ROUTE_PATTERNS, LOGIN_NOTICE
lib/supabase/database.types.ts     generated
lib/supabase/server.ts             cookie-aware server client
lib/supabase/proxy.ts              updateSession(request)
proxy.ts                           private-route matcher -> updateSession
next.config.ts                     X-Robots-Tag on private routes
lib/auth/admin-membership.ts       isAdmin(supabase, userId)
lib/auth/guards.ts                 requireAdmin()
lib/auth/actions.ts                signInAdmin, signOut
components/ui/*                    shadcn (generated)
app/admin/layout.tsx               private surface shell, noindex
app/admin/error.tsx, not-found.tsx
app/admin/login/page.tsx, LoginForm.tsx
app/admin/(gated)/layout.tsx       requireAdmin + header
app/admin/(gated)/page.tsx         clients home (empty until Phase 2)
```

---

### Task 1: Core content schema, blocks and the checklist

**Files:**
- Create: `lib/schemas/content/core.ts`
- Create: `lib/schemas/content/blocks.ts`
- Create: `lib/schemas/content/checklist.ts`
- Test: `tests/lib/schemas/content/core.test.ts`
- Test: `tests/lib/schemas/content/checklist.test.ts`

**Interfaces:**
- Produces: `coreContentSchema`, `type CoreContent`, `type DesignSchema = z.ZodObject & z.ZodType<CoreContent>`, `venueSchema` (core.ts); `BLOCKS`, `type ScheduleItem` (blocks.ts); `type ChecklistItem = { key: string; ask: string; required: boolean }`, `checklistFor(schema: z.ZodObject): ChecklistItem[]`, `checklistMessage(items: readonly ChecklistItem[]): string` (checklist.ts).

- [ ] **Step 1: Create the staging file for this plan**

```bash
printf '# Staging — portal phase 1\n\n' > STAGING_CHANGES.md
git check-ignore STAGING_CHANGES.md
```
Expected: prints `STAGING_CHANGES.md` (it is ignored, never committed).

- [ ] **Step 2: Write the failing tests**

`tests/lib/schemas/content/core.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { coreContentSchema } from '@/lib/schemas/content/core';

const core = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: {
    name: 'Villa Rosa',
    addressLine: '12 Rue des Fleurs, Algiers',
    mapUrl: 'https://maps.example.com/villa-rosa',
  },
};

describe('coreContentSchema', () => {
  it('accepts the four things every design needs', () => {
    expect(coreContentSchema.parse(core)).toEqual(core);
  });

  it('rejects a missing couple name', () => {
    const { coupleFirstName: _omitted, ...invalid } = core;
    expect(() => coreContentSchema.parse(invalid)).toThrow();
  });

  it('rejects an event date that is not ISO 8601', () => {
    expect(() =>
      coreContentSchema.parse({ ...core, eventDate: '12 June 2027' }),
    ).toThrow();
  });

  it('rejects initials longer than four characters', () => {
    expect(() => coreContentSchema.parse({ ...core, initials: 'SARAH' })).toThrow();
  });

  it('rejects a venue without an address', () => {
    expect(() =>
      coreContentSchema.parse({ ...core, venue: { name: 'Villa Rosa' } }),
    ).toThrow();
  });
});
```

`tests/lib/schemas/content/checklist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { checklistFor, checklistMessage } from '@/lib/schemas/content/checklist';
import { coreContentSchema } from '@/lib/schemas/content/core';

const schema = coreContentSchema.extend({
  message: BLOCKS.message,
  schedule: BLOCKS.schedule,
});

describe('checklistFor', () => {
  it('lists every field in declaration order, with its ask', () => {
    const items = checklistFor(schema);

    expect(items.map((item) => item.key)).toEqual([
      'coupleFirstName',
      'couplePartnerName',
      'initials',
      'eventDate',
      'venue',
      'message',
      'schedule',
    ]);
    for (const item of items) expect(item.ask.length).toBeGreaterThan(0);
  });

  it('marks optional and defaulted fields as not required', () => {
    const byKey = Object.fromEntries(
      checklistFor(schema).map((item) => [item.key, item.required]),
    );

    expect(byKey.coupleFirstName).toBe(true);
    expect(byKey.venue).toBe(true);
    expect(byKey.message).toBe(false);
    expect(byKey.schedule).toBe(false);
  });

  /* A field without an ask is a field the operator cannot request, so a
     design that forgets one must fail here rather than ship a checklist with
     a silent gap. */
  it('throws on a field with no ask', () => {
    const careless = coreContentSchema.extend({ dressCode: z.string() });
    expect(() => checklistFor(careless)).toThrow(/dressCode/);
  });
});

describe('checklistMessage', () => {
  it('numbers the asks and marks the optional ones', () => {
    const message = checklistMessage([
      { key: 'a', ask: 'Your names', required: true },
      { key: 'b', ask: 'A short message', required: false },
    ]);

    expect(message).toBe('1. Your names\n2. A short message (optional)');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/schemas/content`
Expected: FAIL, cannot resolve `@/lib/schemas/content/core`.

- [ ] **Step 4: Implement `core.ts`**

```ts
import { z } from 'zod';

/*
 * Every field a design draws carries an `ask`: the plain-language line the
 * operator sends a client to collect it. Declared on zod's global metadata so
 * `.meta({ ask })` is typed at every call site. `checklistFor` refuses a
 * field without one.
 */
declare module 'zod' {
  interface GlobalMeta {
    ask?: string;
  }
}

export const venueSchema = z.object({
  name: z.string().min(1),
  addressLine: z.string().min(1),
  mapUrl: z.url().optional(),
});

/**
 * What exists for EVERY design, and is read outside any one of them: the
 * envelope's initials, the portal header, link previews, RSVP.
 *
 * Everything else is a design's own business. A design composes its schema
 * as `coreContentSchema.extend({ ...blocks it draws, ...fields of its own })`.
 */
export const coreContentSchema = z.object({
  coupleFirstName: z
    .string()
    .min(1)
    .meta({ ask: 'The first name, exactly as it should be written' }),
  couplePartnerName: z
    .string()
    .min(1)
    .meta({ ask: 'The second name, exactly as it should be written' }),
  initials: z
    .string()
    .min(2)
    .max(4)
    .meta({ ask: 'The initials for the wax seal, two to four letters' }),
  eventDate: z.iso
    .datetime()
    .meta({ ask: 'The date, and the time guests should arrive' }),
  venue: venueSchema.meta({
    ask: 'The venue name, its address, and a Google Maps link',
  }),
});

export type CoreContent = z.infer<typeof coreContentSchema>;

/** Any design's schema: an object that carries at least the core. */
export type DesignSchema = z.ZodObject & z.ZodType<CoreContent>;
```

- [ ] **Step 5: Implement `blocks.ts`**

Keys are identical to the old `invitationContentSchema`, so every stored invitation still parses.

```ts
import { z } from 'zod';

const scheduleItemSchema = z.object({
  time: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const galleryItemSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

const heroMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  src: z.string().min(1),
});

export type ScheduleItem = z.infer<typeof scheduleItemSchema>;

/**
 * Ready-made content a design may draw. A design lists the blocks it uses in
 * its own schema; it never inherits one it did not ask for.
 *
 * KEYS ARE PERMANENT. Stored invitations are keyed by these names, so a block
 * may gain optional fields but is never renamed.
 */
export const BLOCKS = {
  headline: z.string().optional().meta({
    ask: 'A line above your names, if you want one (for example "Together with their families")',
  }),
  message: z.string().optional().meta({ ask: 'A short message to your guests' }),
  schedule: z
    .array(scheduleItemSchema)
    .default([])
    .meta({ ask: 'The order of the evening: each moment and its time' }),
  gallery: z.array(galleryItemSchema).default([]).meta({
    ask: 'Photos for the gallery, sent on WhatsApp as documents so they keep full quality',
  }),
  heroMedia: heroMediaSchema.optional().meta({
    ask: 'A photo or short video for the opening screen, sent as a document',
  }),
  registryMessage: z.string().optional().meta({
    ask: 'A note about gifts or bank details, if you want one',
  }),
} as const;
```

- [ ] **Step 6: Implement `checklist.ts`**

```ts
import type { z } from 'zod';

export type ChecklistItem = {
  key: string;
  ask: string;
  required: boolean;
};

/**
 * What to ask a client for, read off a design's schema.
 *
 * `required` is whether the field rejects `undefined`: optional and defaulted
 * fields both accept it, and both are things a client may skip.
 */
export function checklistFor(schema: z.ZodObject): ChecklistItem[] {
  return Object.entries(schema.shape).map(([key, field]) => {
    const ask = field.meta()?.ask;

    if (!ask) {
      throw new Error(
        `Content field "${key}" has no ask. Every field a design draws must say how to request it: add .meta({ ask }).`,
      );
    }

    return { key, ask, required: !field.safeParse(undefined).success };
  });
}

/** The checklist as one WhatsApp-ready message. */
export function checklistMessage(items: readonly ChecklistItem[]): string {
  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.ask}${item.required ? '' : ' (optional)'}`,
    )
    .join('\n');
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/schemas/content`
Expected: PASS, 9 tests.

- [ ] **Step 8: Commit**

```bash
git add lib/schemas/content tests/lib/schemas/content
git commit -m "feat: split invitation content into a shared core and ready-made blocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Each design owns its schema, bound to its component

**Files:**
- Create: `components/invitation/templates/lin/schema.ts`
- Create: `components/invitation/templates/jardin/schema.ts`
- Modify: `components/invitation/registry.ts` (types, `defineTemplate`, entries)
- Modify: `components/invitation/templates/lin/index.tsx`, `lin/EveningTimeline.tsx`
- Modify: `components/invitation/templates/jardin/index.tsx`, `jardin/GardenPath.tsx`
- Modify: `lib/sample-invitation.ts`
- Modify: `components/invitation/TemplateRenderer.tsx`, `app/preview/[slug]/page.tsx`, `app/i/[slug]/page.tsx`, `app/(store)/weddings/[slug]/page.tsx`
- Test: `tests/components/invitation/registry.test.ts`

**Interfaces:**
- Consumes: `coreContentSchema`, `DesignSchema`, `BLOCKS`, `ScheduleItem`, `checklistFor` (Task 1).
- Produces: `linContentSchema`/`LinContent`, `jardinContentSchema`/`JardinContent`; in `registry.ts`: `type TemplateProps = { theme: Theme; entitlements: Entitlements }`, `type DesignComponent<C> = (props: TemplateProps & { content: C }) => ReactNode`, `type RenderedDesign = (props: TemplateProps & { content: unknown }) => ReactNode`, `defineTemplate(def): TemplateEntry`, and `TemplateEntry` gaining `schema: DesignSchema` and `load: () => Promise<RenderedDesign>` (the `component` field is removed). Task 3 changes `load` from an eager wrapper to a dynamic import.

- [ ] **Step 1: Write the failing tests**

Add to `tests/components/invitation/registry.test.ts` (imports at the top of the file, tests inside the existing `describe`):

```ts
import { checklistFor } from '@/lib/schemas/content/checklist';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';
```

```ts
  /* The sample wedding stands in for a real couple on every storefront
     preview. A design whose schema rejects it would render a preview that
     cannot exist for a customer. */
  it('parses the sample wedding with every design schema', () => {
    for (const entry of TEMPLATES) {
      expect(
        entry.schema.safeParse(SAMPLE_CONTENT).success,
        `${entry.slug} rejects the sample`,
      ).toBe(true);
    }
  });

  it('gives every field of every design an ask', () => {
    for (const entry of TEMPLATES) {
      expect(() => checklistFor(entry.schema), entry.slug).not.toThrow();
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/components/invitation/registry.test.ts`
Expected: FAIL, `entry.schema` is undefined.

- [ ] **Step 3: Write the two design schemas**

`components/invitation/templates/lin/schema.ts`:

```ts
import type { z } from 'zod';
import { BLOCKS } from '@/lib/schemas/content/blocks';
import { coreContentSchema } from '@/lib/schemas/content/core';

/** Lin draws the core and every shared block. It has no fields of its own. */
export const linContentSchema = coreContentSchema.extend({
  headline: BLOCKS.headline,
  message: BLOCKS.message,
  schedule: BLOCKS.schedule,
  gallery: BLOCKS.gallery,
  heroMedia: BLOCKS.heroMedia,
  registryMessage: BLOCKS.registryMessage,
});

export type LinContent = z.infer<typeof linContentSchema>;
```

`components/invitation/templates/jardin/schema.ts`: identical shape, exported as `jardinContentSchema` and `JardinContent`, with the doc comment `/** Jardin draws the core and every shared block. It has no fields of its own yet. */`.

- [ ] **Step 4: Point the designs at their own content types**

In `lin/index.tsx`: replace `InvitationContent` in the `@/lib/schemas/invitation` type import with nothing (keep `Entitlements`, `Theme`), add `import type { LinContent } from './schema';`, and replace every `InvitationContent` in the file with `LinContent` (the props type, and the `HeroSection` and gallery helpers at lines 145 and 180).

In `lin/EveningTimeline.tsx`: replace `import type { InvitationContent } from '@/lib/schemas/invitation';` and `type ScheduleItem = InvitationContent['schedule'][number];` with `import type { ScheduleItem } from '@/lib/schemas/content/blocks';`.

In `jardin/index.tsx`: the same substitution with `JardinContent` from `./schema` (lines 8, 13, 300, 371).

In `jardin/GardenPath.tsx`: the same substitution as `EveningTimeline.tsx`.

- [ ] **Step 5: Add `defineTemplate` and the new types to the registry**

In `components/invitation/registry.ts`, replace the `TemplateProps` and `TemplateComponent` types with:

```ts
import type { z } from 'zod';
import type { DesignSchema } from '@/lib/schemas/content/core';

/** What every design receives besides its content. */
export type TemplateProps = {
  theme: Theme;
  entitlements: Entitlements;
};

/** A design's own component, typed against its own content. */
export type DesignComponent<C> = (props: TemplateProps & { content: C }) => ReactNode;

/**
 * A design as the rest of the app sees it: content arrives unknown and is
 * parsed with the design's own schema on the way in, so no caller can hand a
 * design content it was not built for.
 */
export type RenderedDesign = (
  props: TemplateProps & { content: unknown },
) => ReactNode;
```

In `TemplateEntry`, delete `component: TemplateComponent;` and add:

```ts
  /** What this design draws. Validates stored content and yields the checklist. */
  schema: DesignSchema;
  /** Resolves the design, parsing content with `schema` on every render. */
  load: () => Promise<RenderedDesign>;
```

Add below the type:

```ts
type TemplateDefinition<S extends DesignSchema> = Omit<
  TemplateEntry,
  'schema' | 'load'
> & {
  schema: S;
  load: () => Promise<DesignComponent<z.output<S>>>;
};

/**
 * Binds a design's component to its schema. A component that reads a field
 * its schema lacks, or a schema missing the core, fails typecheck here.
 *
 * The wrapper is built once per design and memoised, so `load()` returns the
 * same component reference for the life of the process: React sees one
 * stable type, never a fresh one that would remount the invitation.
 */
export function defineTemplate<S extends DesignSchema>(
  def: TemplateDefinition<S>,
): TemplateEntry {
  let rendered: Promise<RenderedDesign> | undefined;

  return {
    ...def,
    load: () =>
      (rendered ??= def.load().then((Design) => {
        function Rendered({ content, ...props }: TemplateProps & { content: unknown }) {
          return <Design {...props} content={def.schema.parse(content)} />;
        }

        return Rendered;
      })),
  };
}
```

The file now contains JSX: rename it `registry.tsx` (`git mv components/invitation/registry.ts components/invitation/registry.tsx`). Import paths (`@/components/invitation/registry`) are unchanged.

- [ ] **Step 6: Convert the entries**

Each entry becomes `defineTemplate({ ... })`. Keep every existing field and comment; replace `component: X` with `schema` and an eager `load` (Task 3 makes it lazy):

```ts
  lin: defineTemplate({
    slug: 'lin',
    /* ...existing name, summary, story, character, occasion, preview... */
    schema: linContentSchema,
    load: async () => Lin,
  }),
  jardin: defineTemplate({
    slug: 'jardin',
    /* ...existing fields... */
    schema: jardinContentSchema,
    load: async () => Jardin,
  }),
  dentelle: defineTemplate({
    slug: 'dentelle',
    /* ...existing fields and the STANDING IN comment... */
    schema: jardinContentSchema,
    load: async () => Jardin,
    draft: true,
  }),
```

Change the closing `} as const satisfies Record<string, TemplateEntry>;` to `} satisfies Record<string, TemplateEntry>;`.

Replace `getTemplate` with:

```ts
/** The design registered under `slug`, ready to render, or null. */
export async function loadTemplate(slug: string): Promise<RenderedDesign | null> {
  const entry = getTemplateEntry(slug);
  return entry ? entry.load() : null;
}
```

Delete `export type TemplateSlug` if nothing outside the file uses it (`grep -rn TemplateSlug app components lib tests`), and change `getTemplateEntry` to `return Object.hasOwn(REGISTRY, slug) ? REGISTRY[slug as keyof typeof REGISTRY] : undefined;` (a plain index would match `toString` and other prototype keys).

- [ ] **Step 7: Move every consumer onto `load`**

`components/invitation/TemplateRenderer.tsx`: make it `export async function TemplateRenderer(...)`, and replace `const Template = getTemplate(templateSlug);` with `const Template = await loadTemplate(templateSlug);`. Update the doc comment's reasoning: the reference is stable because `defineTemplate` memoises it. Keep the eslint-disable line only if `pnpm lint` still reports `react-hooks/static-components` there; remove it if lint reports it as unused.

`app/preview/[slug]/page.tsx`: `const Template = await loadTemplate(slug);` (same eslint note).

`app/i/[slug]/page.tsx`: replace `if (!getTemplate(invitation.templateSlug)) notFound();` with `if (!getTemplateEntry(invitation.templateSlug)) notFound();` and import `getTemplateEntry` instead of `getTemplate`. Task 4 moves this check into the read and deletes it here.

`app/(store)/weddings/[slug]/page.tsx`: replace `const Template = entry.component;` with `const Template = await entry.load();`, and resolve the "others" row before rendering:

```ts
  const others = await Promise.all(
    LISTED_TEMPLATES.filter((other) => other.slug !== slug).map(
      async (other) => ({ entry: other, Design: await other.load() }),
    ),
  );
```

then in the JSX map over `others` as `({ entry: other, Design: Other })`, dropping the `const Other = other.component;` line.

- [ ] **Step 8: Move the sample off the superset schema**

`invitationContentSchema` stays in `lib/schemas/invitation.ts` for now: `lib/invitations/get-published.ts` is its last consumer, and Task 4 deletes both together.

In `lib/sample-invitation.ts`, import `BLOCKS` and `coreContentSchema`, and replace `invitationContentSchema.parse({` with `sampleContentSchema.parse({`, declaring above it:

```ts
/* Core plus every shared block: the sample must carry whatever any design
   draws, and each design's own schema then takes only its part. */
const sampleContentSchema = coreContentSchema.extend(BLOCKS);
```

In `tests/components/invitation/registry.test.ts`, replace the three `getTemplate` tests with:

```ts
  it('loads a registered design', async () => {
    expect(typeof (await loadTemplate('lin'))).toBe('function');
  });

  it('loads nothing for an unknown slug', async () => {
    expect(await loadTemplate('does-not-exist')).toBeNull();
    expect(await loadTemplate('toString')).toBeNull();
  });

  it('resolves every advertised slug to a design', async () => {
    for (const slug of TEMPLATE_SLUGS) {
      expect(await loadTemplate(slug), `slug ${slug} is unresolvable`).not.toBeNull();
    }
  });
```

and import `loadTemplate` instead of `getTemplate`.

- [ ] **Step 9: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass. If `app/(store)/page.tsx` fails typecheck where it renders `<Lin content={SAMPLE_CONTENT} />`, the sample's shape has drifted from Lin's schema: compare `sampleContentSchema` with `linContentSchema`, do not cast.

- [ ] **Step 10: Commit**

```bash
git add -A components/invitation lib/schemas lib/sample-invitation.ts app tests
git commit -m "feat: give every design its own content schema, bound to its component

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Lazy designs and private visibility

**Files:**
- Modify: `components/invitation/registry.tsx`
- Modify: `app/(store)/weddings/[slug]/page.tsx`
- Modify: `app/sitemap.ts` (only if it reads `draft`)
- Modify: `tests/lib/catalogues.test.ts`

**Interfaces:**
- Consumes: `defineTemplate`, `TemplateEntry` (Task 2).
- Produces: `VISIBILITY = { LISTED: 'listed', DRAFT: 'draft', PRIVATE: 'private' } as const`, `type Visibility`, `TemplateEntry.visibility: Visibility` (replaces `draft?: true`), `listedOf(entries)`, `pageSlugsOf(entries)`, `getDesignPageEntry(slug): TemplateEntry | undefined` (refuses private).

- [ ] **Step 1: Write the failing tests**

In `tests/lib/catalogues.test.ts`, import `VISIBILITY`, `listedOf`, `pageSlugsOf`, `getDesignPageEntry`, and `type TemplateEntry`. Replace `entry.draft` with `entry.visibility === VISIBILITY.DRAFT` in the two existing draft tests (`(entry) => entry.draft` becomes `(entry) => entry.visibility === VISIBILITY.DRAFT`; `.toBe(!entry.draft)` becomes `.toBe(entry.visibility === VISIBILITY.LISTED)`). Then add:

```ts
describe('private designs', () => {
  /* The registry holds no private design yet, so the rules are pinned on
     fixtures: the first Custom client's design must not be the test of them. */
  const base = TEMPLATES[0];
  const fixture = (slug: string, visibility: TemplateEntry['visibility']) => ({
    ...base,
    slug,
    visibility,
  });
  const entries = [
    fixture('shown', VISIBILITY.LISTED),
    fixture('in-progress', VISIBILITY.DRAFT),
    fixture('maya-karim', VISIBILITY.PRIVATE),
  ];

  it('never shelves a private design', () => {
    expect(listedOf(entries).map((entry) => entry.slug)).toEqual(['shown']);
  });

  it('never gives a private design a product page', () => {
    expect(pageSlugsOf(entries)).toEqual(['shown', 'in-progress']);
  });

  it('refuses unknown slugs at the product page', () => {
    expect(getDesignPageEntry('does-not-exist')).toBeUndefined();
    expect(getDesignPageEntry('lin')?.slug).toBe('lin');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/catalogues.test.ts`
Expected: FAIL, `VISIBILITY` is not exported.

- [ ] **Step 3: Add visibility to the registry**

```ts
export const VISIBILITY = {
  /** On a shelf, in the sitemap, with a product page. */
  LISTED: 'listed',
  /** Mid-build: a product page opens by URL for review, noindex, no shelf. */
  DRAFT: 'draft',
  /** Built for one Custom client: renders their invitation, nothing else. */
  PRIVATE: 'private',
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];
```

In `TemplateEntry`, replace the `draft?: true` field and its comment with `visibility: Visibility;` carrying the same explanation, extended by the PRIVATE case. Give `lin` and `jardin` `visibility: VISIBILITY.LISTED`, and `dentelle` `visibility: VISIBILITY.DRAFT` in place of `draft: true`.

Replace the derived lists:

```ts
export function listedOf(entries: readonly TemplateEntry[]): TemplateEntry[] {
  return entries.filter((entry) => entry.visibility === VISIBILITY.LISTED);
}

/** Designs with a product page: listed and drafts, never private. */
export function pageSlugsOf(entries: readonly TemplateEntry[]): string[] {
  return entries
    .filter((entry) => entry.visibility !== VISIBILITY.PRIVATE)
    .map((entry) => entry.slug);
}

export const TEMPLATES: readonly TemplateEntry[] = Object.values(REGISTRY);
export const LISTED_TEMPLATES = listedOf(TEMPLATES);
export const TEMPLATE_SLUGS = pageSlugsOf(TEMPLATES);

/** The design a product page may show: any but a private one. */
export function getDesignPageEntry(slug: string): TemplateEntry | undefined {
  const entry = getTemplateEntry(slug);
  return entry?.visibility === VISIBILITY.PRIVATE ? undefined : entry;
}
```

- [ ] **Step 4: Make the loaders lazy**

Remove the static `import { Jardin } ...` and `import { Lin } ...` from the registry, keep the schema imports, and change each `load`:

```ts
    load: () =>
      import('@/components/invitation/templates/lin').then((module) => module.Lin),
```

(`jardin` and `dentelle` import `@/components/invitation/templates/jardin` and take `module.Jardin`.) Schemas stay static: validating content must never require loading a design's component.

- [ ] **Step 5: Close the product page to private designs**

In `app/(store)/weddings/[slug]/page.tsx`: add `export const dynamicParams = false;` beside `generateStaticParams` with the comment `/* Only prerendered slugs exist here. A private design's slug must 404, never render on demand. */`; replace both `getTemplateEntry(slug)` calls with `getDesignPageEntry(slug)`; replace `entry.draft ?` with `entry.visibility === VISIBILITY.DRAFT ?`. Grep for any other `.draft` reader (`grep -rn "\.draft" app components lib`) and convert it the same way.

- [ ] **Step 6: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

Run: `pnpm build`
Expected: succeeds; the route list shows `/weddings/lin`, `/weddings/jardin`, `/weddings/dentelle` prerendered.

- [ ] **Step 7: Commit**

```bash
git add -A components/invitation app tests
git commit -m "feat: load designs lazily and let a design be private to one client

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The public read parses with the design's own schema

**Files:**
- Modify: `lib/invitations/get-published.ts`
- Modify: `app/i/[slug]/page.tsx` (metadata description, drop the registry check)
- Modify: `lib/schemas/invitation.ts` (delete the superset: `venueSchema`, `scheduleItemSchema`, `galleryItemSchema`, `heroMediaSchema`, `invitationContentSchema`, `InvitationContent`; `entitlementsSchema` and `themeSchema` stay)
- Modify: `tests/lib/schemas/invitation.test.ts` (delete the `validContent` fixture, the `invitationContentSchema` block and its import; those cases live in `tests/lib/schemas/content/core.test.ts`)
- Test: `tests/lib/invitations/get-published.test.ts`

**Interfaces:**
- Consumes: `getTemplateEntry` (Task 2), `CoreContent` (Task 1).
- Produces: `PublishedInvitation.content: CoreContent` (was `InvitationContent`); `getPublishedInvitation` returns `null` for a design the registry lacks.

- [ ] **Step 1: Write the failing tests**

In `tests/lib/invitations/get-published.test.ts`, change the fixture's `template_slug: 'cap-blanc'` to `template_slug: 'lin'` and the first test's expectation to `toBe('lin')`. Add:

```ts
  /* The live seed row names `cap-blanc`, a design deleted from the code. A
     guest holding that link gets a 404, never a crash. */
  it('returns null for a design the registry does not have', async () => {
    mockFetchOnce([{ ...row, template_slug: 'cap-blanc' }]);
    expect(await getPublishedInvitation('sarah-and-amine')).toBeNull();
  });

  it('throws when the content breaks the design schema, not just the core', async () => {
    mockFetchOnce([
      { ...row, content: { ...row.content, schedule: [{ time: '17:00' }] } },
    ]);
    await expect(getPublishedInvitation('sarah-and-amine')).rejects.toThrow();
  });
```

The existing `'throws when the stored content fails schema validation'` test stays: it pins Review Focus 4.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/invitations/get-published.test.ts`
Expected: FAIL on the `cap-blanc` case (the superset parse returns the row instead of null). The schedule case may already pass, since the superset also validates `schedule`; it stays as the pin that the design's own schema is what runs.

- [ ] **Step 3: Implement**

```ts
import { getTemplateEntry } from '@/components/invitation/registry';
import { restGet } from '@/lib/rest';
import type { CoreContent } from '@/lib/schemas/content/core';
import {
  entitlementsSchema,
  themeSchema,
  type Entitlements,
  type Theme,
} from '@/lib/schemas/invitation';
```

`PublishedInvitation.content` becomes `CoreContent`. In the body, after `if (!row) return null;`:

```ts
  /* An invitation naming a design the code no longer has is a 404, the same
     as one that does not exist. Content is parsed with that design's OWN
     schema, so a field the design needs and the row lacks fails here, loudly,
     rather than rendering a gap. */
  const design = getTemplateEntry(row.template_slug);
  if (!design) return null;

  return {
    slug: row.slug,
    templateSlug: row.template_slug,
    content: design.schema.parse(row.content),
    theme: themeSchema.parse(row.theme),
    entitlements: entitlementsSchema.parse(row.entitlements),
  };
```

Update the function's doc comment to say content is validated against the design's schema.

Delete the superset from `lib/schemas/invitation.ts` and its test block, as listed under Files; `grep -rn "invitationContentSchema\|InvitationContent\b" app components lib tests` must return nothing.

In `app/i/[slug]/page.tsx`, delete `if (!getTemplateEntry(invitation.templateSlug)) notFound();` and its import: the read now returns null for an unknown design. `headline` is no longer part of the core, so replace the metadata description with:

```ts
    description: `You are invited to celebrate with ${coupleFirstName} and ${couplePartnerName}.`,
```

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add lib/invitations lib/schemas/invitation.ts app/i tests/lib
git commit -m "feat: validate a published invitation against its own design

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Supabase session plumbing on private routes only

**Files:**
- Create: `lib/routes.ts`
- Create: `lib/supabase/database.types.ts` (generated)
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/proxy.ts`
- Create: `proxy.ts`
- Modify: `next.config.ts`
- Modify: `tests/setup.ts` (stub `server-only`)
- Modify: `package.json` / `pnpm-lock.yaml` (via pnpm)
- Test: `tests/proxy.test.ts`, `tests/next-config.test.ts`

**Interfaces:**
- Produces: `ROUTES = { ADMIN: '/admin', ADMIN_LOGIN: '/admin/login' }`, `PRIVATE_ROUTE_PATTERNS = ['/admin/:path*', '/portal/:path*']`, `LOGIN_NOTICE = { NOT_ADMIN: 'not-admin' }`, `LOGIN_NOTICE_PARAM = 'notice'` (routes.ts); `type Database` (database.types.ts); `createClient(): Promise<SupabaseClient<Database>>` (server.ts); `updateSession(request: NextRequest): Promise<NextResponse>` (lib/supabase/proxy.ts).

- [ ] **Step 1: Install**

```bash
pnpm add @supabase/supabase-js @supabase/ssr server-only
```

- [ ] **Step 2: Generate database types**

Use the Supabase MCP `generate_typescript_types` for project `zwsvixzonkqaksfnemgh` (the "Reve website" project; confirm the ref matches `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`) and write the result verbatim to `lib/supabase/database.types.ts`. Phase 2 regenerates it after its migrations.

- [ ] **Step 3: Write the failing tests**

`tests/proxy.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { config } from '@/proxy';
import { PRIVATE_ROUTE_PATTERNS } from '@/lib/routes';

describe('proxy', () => {
  /* Next reads `config.matcher` statically, so proxy.ts must spell the
     patterns out as literals. This keeps that copy honest. */
  it('runs on exactly the private routes', () => {
    expect(config.matcher).toEqual([...PRIVATE_ROUTE_PATTERNS]);
  });

  /* The guest's invitation must never wait on an auth round trip. */
  it('never runs on a public invitation or the storefront', () => {
    for (const pattern of config.matcher) {
      expect(pattern.startsWith('/i/')).toBe(false);
      expect(pattern.startsWith('/weddings')).toBe(false);
    }
  });
});
```

`tests/next-config.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';
import { PRIVATE_ROUTE_PATTERNS } from '@/lib/routes';

describe('next.config headers', () => {
  it('marks every private route noindex', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];

    for (const pattern of PRIVATE_ROUTE_PATTERNS) {
      const rule = rules.find((candidate) => candidate.source === pattern);
      expect(rule?.headers).toContainEqual({
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      });
    }
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm vitest run tests/proxy.test.ts tests/next-config.test.ts`
Expected: FAIL, cannot resolve `@/proxy` / `@/lib/routes`.

- [ ] **Step 5: Implement `lib/routes.ts`**

```ts
/** Every route the app links to or redirects to by name. */
export const ROUTES = {
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
} as const;

/**
 * Routes that belong to a signed-in person. proxy.ts refreshes the session on
 * exactly these, and next.config.ts marks them noindex. Public pages, and
 * above all the guest's invitation, never pay for an auth check.
 */
export const PRIVATE_ROUTE_PATTERNS = ['/admin/:path*', '/portal/:path*'] as const;

/** Why the login page is being shown, carried in `?notice=`. */
export const LOGIN_NOTICE_PARAM = 'notice';

export const LOGIN_NOTICE = {
  NOT_ADMIN: 'not-admin',
} as const;

export type LoginNotice = (typeof LOGIN_NOTICE)[keyof typeof LOGIN_NOTICE];
```

- [ ] **Step 6: Implement the server client**

`lib/supabase/server.ts`:

```ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * The signed-in person's Supabase client, for Server Components, Server
 * Actions and Route Handlers. Every query runs under their JWT, so RLS is
 * the second wall behind every guard.
 *
 * Public invitation reads do NOT use this: they go through raw PostgREST in
 * lib/rest.ts so a stale session can never stall a guest's page.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* A Server Component cannot write cookies. proxy.ts refreshes the
               session before any private page renders, so a refresh attempted
               here is safe to drop. */
          }
        },
      },
    },
  );
}
```

- [ ] **Step 7: Implement the proxy**

`lib/supabase/proxy.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Refreshes an expiring Supabase session and hands the new cookies to both
 * the page about to render and the browser. OPTIMISTIC ONLY: it redirects no
 * one. Every private page and action still calls its own guard.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  /* Nothing may run between creating the client and this call: it is what
     refreshes the token, and skipping it logs people out at random. */
  await supabase.auth.getClaims();

  return response;
}
```

`proxy.ts` (project root):

```ts
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/* Literal, because Next analyses this statically. Must equal
   PRIVATE_ROUTE_PATTERNS in lib/routes.ts (tests/proxy.test.ts checks). */
export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};
```

- [ ] **Step 8: Mark private routes noindex**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';
import { PRIVATE_ROUTE_PATTERNS } from './lib/routes';

const nextConfig: NextConfig = {
  /* Header as well as metadata: a crawler that follows a leaked link to a
     redirect never sees the page's <meta robots>. */
  async headers() {
    return PRIVATE_ROUTE_PATTERNS.map((source) => ({
      source,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }));
  },
};

export default nextConfig;
```

- [ ] **Step 9: Stub `server-only` in tests**

`server-only` throws when imported outside a React Server environment, which a Vitest run is not. Add to `tests/setup.ts`, below the `next/font/google` mock:

```ts
// `server-only` exists to throw when a client bundle imports a server module.
// Vitest is neither, so the guard is stubbed; `next build` still enforces it.
vi.mock('server-only', () => ({}));
```

- [ ] **Step 10: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add lib/routes.ts lib/supabase proxy.ts next.config.ts tests package.json pnpm-lock.yaml
git commit -m "feat: refresh Supabase sessions on private routes and keep them unindexed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The admin guard and sign-in actions

**Files:**
- Create: `lib/auth/admin-membership.ts`
- Create: `lib/auth/guards.ts`
- Create: `lib/auth/actions.ts`
- Test: `tests/lib/auth/guards.test.ts`
- Test: `tests/lib/auth/actions.test.ts`

Use the `nextjs-supabase-kit:server-action` skill as the scaffold for `actions.ts`, then make it match the code below.

**Interfaces:**
- Consumes: `createClient` (Task 5), `ROUTES`, `LOGIN_NOTICE`, `LOGIN_NOTICE_PARAM` (Task 5).
- Produces: `isAdmin(supabase: SupabaseClient<Database>, userId: string): Promise<boolean>`; `type AdminIdentity = { userId: string; email: string }`, `requireAdmin(): Promise<AdminIdentity>`; `type SignInResult = { ok: false; message: string }`, `SIGN_IN_MESSAGES`, `signInAdmin(previous: SignInResult | null, formData: FormData): Promise<SignInResult>`, `signOut(): Promise<never>`.

- [ ] **Step 1: Write the failing guard tests**

`tests/lib/auth/guards.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock('next/navigation', () => ({ redirect }));

const getClaims = vi.fn();
const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { requireAdmin } from '@/lib/auth/guards';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAdmin', () => {
  it('returns the identity of a signed-in admin', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'ops@reve.lb' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });

    await expect(requireAdmin()).resolves.toEqual({
      userId: 'user-1',
      email: 'ops@reve.lb',
    });
  });

  it('sends a visitor with no session to the login page', async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/login');
  });

  /* Review Focus 2: an expired or forged cookie is an error, not a crash. */
  it('treats an invalid session as signed out', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('invalid JWT') });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT /admin/login');
  });

  /* Review Focus 1: every client will hold a valid session. */
  it('turns away a signed-in account that is not an admin', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'client-1', email: 'maya@example.com' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(requireAdmin()).rejects.toThrow(
      'REDIRECT /admin/login?notice=not-admin',
    );
  });

  it('crashes loudly when the membership read itself fails', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'ops@reve.lb' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });

    await expect(requireAdmin()).rejects.toThrow('db down');
  });
});
```

- [ ] **Step 2: Write the failing action tests**

`tests/lib/auth/actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock('next/navigation', () => ({ redirect }));

const signInWithPassword = vi.fn();
const signOutSpy = vi.fn();
const maybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signInWithPassword, signOut: signOutSpy },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

import { SIGN_IN_MESSAGES, signInAdmin, signOut } from '@/lib/auth/actions';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInAdmin', () => {
  it('refuses a malformed email without calling Supabase', async () => {
    const result = await signInAdmin(null, form({ email: 'nope', password: 'x' }));

    expect(result).toEqual({ ok: false, message: SIGN_IN_MESSAGES.INVALID_INPUT });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('gives one message for a wrong password or an unknown email', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    });

    const result = await signInAdmin(
      null,
      form({ email: 'ops@reve.lb', password: 'wrong' }),
    );

    expect(result).toEqual({ ok: false, message: SIGN_IN_MESSAGES.BAD_CREDENTIALS });
  });

  it('signs a non-admin straight back out', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'client-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await signInAdmin(
      null,
      form({ email: 'maya@example.com', password: 'right-password' }),
    );

    expect(result).toEqual({ ok: false, message: SIGN_IN_MESSAGES.NOT_ADMIN });
    expect(signOutSpy).toHaveBeenCalled();
  });

  it('takes an admin to the admin home', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });

    await expect(
      signInAdmin(null, form({ email: 'ops@reve.lb', password: 'right-password' })),
    ).rejects.toThrow('REDIRECT /admin');
  });
});

describe('signOut', () => {
  it('ends the session and returns to the login page', async () => {
    await expect(signOut()).rejects.toThrow('REDIRECT /admin/login');
    expect(signOutSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/auth`
Expected: FAIL, cannot resolve `@/lib/auth/guards`.

- [ ] **Step 4: Implement the membership check**

`lib/auth/admin-membership.ts`:

```ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Whether `userId` is on `admin_users`. Membership, not a JWT claim, is what
 * makes an admin: a claim would outlive a revoked admin until the token
 * expired. RLS lets a user read only their own row, so this runs as them.
 */
export async function isAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data !== null;
}
```

- [ ] **Step 5: Implement the guard**

`lib/auth/guards.ts`:

```ts
import 'server-only';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/admin-membership';
import { LOGIN_NOTICE, LOGIN_NOTICE_PARAM, ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export type AdminIdentity = {
  userId: string;
  email: string;
};

/**
 * The first line of every admin page, layout and action.
 *
 * Called in the PAGE as well as the layout: a layout does not re-run on
 * client navigation between its children, so a layout-only check lets a
 * revoked admin keep browsing. `getClaims()` verifies the JWT locally against
 * the project's keys; `getSession()` is never trusted for this.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (!claims) redirect(ROUTES.ADMIN_LOGIN);

  if (!(await isAdmin(supabase, claims.sub))) {
    redirect(
      `${ROUTES.ADMIN_LOGIN}?${LOGIN_NOTICE_PARAM}=${LOGIN_NOTICE.NOT_ADMIN}`,
    );
  }

  return { userId: claims.sub, email: claims.email ?? '' };
}
```

- [ ] **Step 6: Implement the actions**

`lib/auth/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/admin-membership';
import { ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export const SIGN_IN_MESSAGES = {
  INVALID_INPUT: 'Enter your email address and password.',
  BAD_CREDENTIALS: 'That email and password do not match an account.',
  NOT_ADMIN: 'This account does not have admin access.',
} as const;

/** Only failure comes back: success redirects and never returns. */
export type SignInResult = { ok: false; message: string };

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signInAdmin(
  _previous: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, message: SIGN_IN_MESSAGES.INVALID_INPUT };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  /* One message for every refusal Supabase gives (wrong password, unknown
     email, unconfirmed email), so the form reveals nothing about which. */
  if (error || !data.user) {
    return { ok: false, message: SIGN_IN_MESSAGES.BAD_CREDENTIALS };
  }

  if (!(await isAdmin(supabase, data.user.id))) {
    await supabase.auth.signOut();
    return { ok: false, message: SIGN_IN_MESSAGES.NOT_ADMIN };
  }

  redirect(ROUTES.ADMIN);
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.ADMIN_LOGIN);
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/auth`
Expected: PASS, 10 tests.

- [ ] **Step 8: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`

```bash
git add lib/auth tests/lib/auth
git commit -m "feat: gate the admin on a verified session and admin membership

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: shadcn/ui, scoped so the storefront cannot change

**Files:**
- Create: `components.json`, `components/ui/*`, `lib/utils.ts` (all generated)
- Modify: `app/globals.css` (scope shadcn's base layer only)

**Interfaces:**
- Produces: `Button`, `Input`, `Label`, `Card` (+ `CardHeader`, `CardTitle`, `CardContent`), `Alert` (+ `AlertDescription`) from `@/components/ui/*`; the attribute `data-surface="app"` which switches shadcn's base styles on.

The storefront's tokens are a finished design (ARCHITECTURE 04: "Two token sets that must not bleed"). shadcn's init writes a global `@layer base` that sets `body` background and colour and a default border colour on `*`. Unscoped, that repaints the storefront.

- [ ] **Step 1: Capture the storefront before**

With `pnpm dev` running, take full-page screenshots of `/` and `/weddings/lin` at 1280px and 390px wide (Chrome DevTools MCP `take_screenshot`), saved to the scratchpad directory.

- [ ] **Step 2: Initialise and add the primitives**

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label card alert
```

At the prompts choose base colour Neutral and CSS variables Yes. Accept `components/ui` and `lib/utils` as locations.

- [ ] **Step 3: Scope the base layer**

Read the `git diff app/globals.css`. Leave the generated `:root` variables and `@theme inline` mappings as they are: they only define names the storefront never uses. Check that no existing storefront variable (`--reve-*`, `--color-screen`, font variables) was overwritten; restore any that were. In the generated `@layer base` block, change the selectors so they only apply inside a private surface:

```css
@layer base {
  [data-surface="app"],
  [data-surface="app"] * {
    @apply border-border outline-ring/50;
  }
  [data-surface="app"] {
    @apply bg-background text-foreground;
  }
}
```

(Keep whatever utilities the generated block actually applies; only the selectors change.) If init added a `.dark` block or `@custom-variant dark`, leave them: nothing sets `.dark`.

- [ ] **Step 4: Capture the storefront after, and compare**

Retake the same four screenshots and compare them with Step 1 by eye (and with `Read` on both images). Expected: no visible difference. Any difference is a leaked base style: find it in the diff and scope it.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`

```bash
git add components.json components/ui lib/utils.ts app/globals.css package.json pnpm-lock.yaml
git commit -m "chore: add shadcn/ui for private surfaces, scoped away from the storefront

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The admin surface: login, gated shell, first admin

**Files:**
- Create: `app/admin/layout.tsx`, `app/admin/error.tsx`, `app/admin/not-found.tsx`
- Create: `app/admin/login/page.tsx`, `app/admin/login/LoginForm.tsx`
- Create: `app/admin/(gated)/layout.tsx`, `app/admin/(gated)/page.tsx`

Use the `nextjs-supabase-kit:scaffold-route` skill for the segments, then make them match the code below. `/admin/login` sits OUTSIDE `(gated)`: inside it, the guard would redirect the login page to itself.

**Interfaces:**
- Consumes: `requireAdmin`, `AdminIdentity` (Task 6); `signInAdmin`, `signOut`, `SignInResult` (Task 6); `LOGIN_NOTICE`, `LOGIN_NOTICE_PARAM`, `ROUTES` (Task 5); shadcn primitives (Task 7).
- Produces: `/admin` (gated), `/admin/login`.

- [ ] **Step 1: The private surface shell**

`app/admin/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { template: '%s · Rêve admin', default: 'Rêve admin' },
  robots: { index: false, follow: false },
};

/**
 * Every admin page renders inside `data-surface="app"`, the one attribute
 * that switches shadcn's base styles on. The storefront never carries it.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
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

`app/admin/error.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        The page failed to load. Try again, and if it keeps failing, check the
        Supabase project is running.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
```

`app/admin/not-found.tsx`:

```tsx
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

export default function AdminNotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-lg font-medium">Not found</h1>
      <Link className="mt-6 inline-block underline" href={ROUTES.ADMIN}>
        Back to clients
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: The login page**

`app/admin/login/LoginForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAdmin, type SignInResult } from '@/lib/auth/actions';

export function LoginForm({ notice }: { notice: string | null }) {
  const [result, action, pending] = useActionState<SignInResult | null, FormData>(
    signInAdmin,
    null,
  );
  const message = result?.message ?? notice;

  return (
    <form action={action} className="grid gap-4">
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      <Button disabled={pending} type="submit">
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}
```

`app/admin/login/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SIGN_IN_MESSAGES } from '@/lib/auth/actions';
import { LOGIN_NOTICE, LOGIN_NOTICE_PARAM } from '@/lib/routes';

export const metadata: Metadata = { title: 'Sign in' };

/* A notice arrives when the guard turned someone away; only known notices
   render, so the query string cannot put arbitrary text on the page. */
const NOTICES: Record<string, string> = {
  [LOGIN_NOTICE.NOT_ADMIN]: SIGN_IN_MESSAGES.NOT_ADMIN,
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams)[LOGIN_NOTICE_PARAM];
  const notice = typeof raw === 'string' ? (NOTICES[raw] ?? null) : null;

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Rêve admin</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm notice={notice} />
        </CardContent>
      </Card>
    </main>
  );
}
```

`SIGN_IN_MESSAGES` is imported from a `'use server'` module into a Server Component, which is allowed; if the build rejects a non-function export from a `'use server'` file, move `SIGN_IN_MESSAGES` and `SignInResult` to `lib/auth/messages.ts` and import them from there in both places (update the test import too).

- [ ] **Step 3: The gated shell and home**

`app/admin/(gated)/layout.tsx`:

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/actions';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES } from '@/lib/routes';

export default async function GatedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link className="font-medium" href={ROUTES.ADMIN}>
          Rêve admin
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">{admin.email}</span>
          <form action={signOut}>
            <Button size="sm" type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
```

`app/admin/(gated)/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Clients' };

/* Phase 2 turns this into the client list. The guard is repeated here, not
   left to the layout: see requireAdmin. */
export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-medium">Clients</h1>
      <p className="mt-2 text-muted-foreground">No clients yet.</p>
    </main>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass; `/admin` and `/admin/login` appear as dynamic routes.

- [ ] **Step 5: Operator setup (ask the user; do not do these yourself)**

Ask the user to, in the Supabase dashboard for "Reve website":
1. Authentication → Sign In / Providers: turn OFF "Allow new users to sign up"; set minimum password length to 8.
2. Authentication → Users → Add user → Create new user: their own admin email and a strong password, with "Auto Confirm User" ticked.
3. Reply with the email they used.

Then insert the membership with the Supabase MCP `execute_sql` (a data write, not a schema change):

```sql
insert into admin_users (user_id)
select id from auth.users where email = '<the email they gave>'
returning user_id;
```
Expected: one row returned.

- [ ] **Step 6: Verify in the browser**

With `pnpm dev` running (Chrome DevTools MCP):
1. `/admin` → lands on `/admin/login`.
2. A wrong password → "That email and password do not match an account."
3. The right password → `/admin` with the email in the header.
4. Sign out → `/admin/login`; `/admin` again → back to login.
5. `curl -sI http://localhost:3000/admin/login | grep -i x-robots-tag` → `noindex, nofollow`.
6. `/weddings/lin`, `/i/sarah-and-amine` (404 expected: its design `cap-blanc` no longer exists) and `/` render as before, and the network panel shows no request to `/auth/v1` on them.

- [ ] **Step 7: Commit**

```bash
git add app/admin
git commit -m "feat: add the admin sign-in and its gated shell

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Staging notes and phase verification

**Files:**
- Modify: `STAGING_CHANGES.md` (untracked)

- [ ] **Step 1: Record the structural changes for the later ARCHITECTURE.md flush**

Append to `STAGING_CHANGES.md`:

```markdown
## Content schemas (Phase 1)
- `lib/schemas/content/`: core (names, initials, eventDate, venue) + BLOCKS (headline, message, schedule, gallery, heroMedia, registryMessage). Block keys are permanent.
- Each design: `templates/<slug>/schema.ts`, bound to its component by `defineTemplate` (registry.tsx). Mismatch = typecheck failure.
- Every field carries `.meta({ ask })`; `checklistFor` throws without one; `checklistMessage` = WhatsApp list.
- `invitationContentSchema` is gone. Sample = core.extend(BLOCKS).
- Stored content is parsed with the DESIGN's schema: in get-published (returns null for an unknown design) and again in the rendered wrapper.

## Registry (Phase 1)
- `visibility: listed | draft | private` replaces `draft?: true`. listedOf/pageSlugsOf/getDesignPageEntry. `/weddings/[slug]` has dynamicParams=false.
- Components load lazily (`load: () => import(...)`), memoised per design; schemas stay static.
- `getTemplate` -> `loadTemplate` (async). TemplateRenderer is async.

## Auth (Phase 1)
- `@supabase/ssr`. `lib/supabase/server.ts` (cookie client, typed by generated database.types.ts), `lib/supabase/proxy.ts` + root `proxy.ts` (Next 16 name for middleware), matcher = PRIVATE_ROUTE_PATTERNS (`/admin`, `/portal` only; the guest page never runs it).
- `requireAdmin()` = getClaims + admin_users membership, called in layout AND page.
- `/admin/login` outside the `(gated)` group. Notices via `?notice=` whitelist.
- X-Robots-Tag noindex on private routes from next.config.ts.
- shadcn/ui installed; its base layer scoped to `[data-surface="app"]`.

## Trace: admin signs in
/admin -> (gated)/layout requireAdmin -> no claims -> /admin/login
LoginForm [CLIENT] useActionState -> signInAdmin (zod) -> signInWithPassword -> isAdmin(admin_users, RLS self read) -> redirect /admin | signOut + NOT_ADMIN
```

- [ ] **Step 2: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass. Report the test count.

- [ ] **Step 3: Security advisors**

Run the Supabase MCP `get_advisors` (type `security`) for the project. Expected: no new findings (Phase 1 changes no schema). Report anything listed.
