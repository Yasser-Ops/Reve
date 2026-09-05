# Guest RSVP — Design

**Status:** approved, not yet implemented. Deferred by the user on 2026-09-05 in
favour of envelope work. No code from this spec exists yet.

**Goal:** A guest opens an invitation, reaches the RSVP band, answers, and the
answer lands in Postgres. This is the last missing leg of the
envelope -> animation -> invitation pipeline; every other leg is built.

**Spec for:** the first privileged write path in the codebase.

---

## 01 — Why this is architectural, not a form

Three firsts arrive together:

- the first Server Action,
- the first service-role Supabase client (`lib/supabase/admin.ts` does not exist),
- the first write of any kind by an unauthenticated visitor.

Migration `0004_seal_public_read_window.sql` deliberately revoked *all* anon
privilege on `invitations` and left a security-definer view as the only public
window. Any RSVP design that hands anon an INSERT reopens what that migration
closed. It therefore does not.

---

## 02 — Decisions taken

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Guest identity | Open form now, guest-list seam kept | Token-per-guest links: better data, but needs guest import and token issuing before a single RSVP can be taken |
| Write path | Server Action + service role | Anon INSERT policy: fewer parts, but makes `rsvps` writable by anyone holding the public anon key |
| Bot protection | Deferred, seam designed | Turnstile now: needs Cloudflare keys the project does not yet have |

`rsvps.guest_id` is already nullable in `0001_initial_schema.sql`. That column
IS the guest-list seam; no schema change is needed to adopt tokens later.

---

## 03 — Procedural trace

```
guest taps a choice in the RSVP band
  RsvpForm [CLIENT]                components/invitation/RsvpForm.tsx
    submits { slug, name, attending, partySize, dietaryNotes, message }
    ^ slug, never invitation_id: the id is not public and a client
      must not be trusted with which row it writes to
      v
  submitRsvp                        'use server'
    verifyGuest(token?)             seam; returns true today
    rsvpSubmissionSchema.parse      zod, at the boundary
    resolveInvitationForRsvp(slug)  service role, reads `invitations`
      |                             (NOT published_invitations: that view
      |                              omits `id` by design)
      +-- no row / not published    -> refuse
      +-- entitlements.rsvp false   -> refuse
    restPost('rsvps', row)          service role
      v
  typed result -> confirmed state; the form is replaced in place
```

**The action never throws to the guest.** It returns a discriminated result.
An invitation that has already been opened and read must not become an error
page because a submit failed.

---

## 04 — Modules

| File | New? | Purpose |
|---|---|---|
| `supabase/migrations/0005_rsvp_write_path.sql` | new | Additive. Touches `rsvps` only; the `0004` seal is untouched. |
| `lib/supabase/admin.ts` | new | Service-role client. `import 'server-only'`. The single place `SUPABASE_SERVICE_ROLE_KEY` is read. |
| `lib/rest.ts` | changed | Gains `restPost`. Keeps PostgREST access in one module. |
| `lib/schemas/rsvp.ts` | new | `rsvpSubmissionSchema`. The contract, shared by action and tests. |
| `lib/invitations/submit-rsvp.ts` | new | The action, plus private slug -> id resolution. |
| `components/invitation/RsvpForm.tsx` | new | The only new client island. |
| `components/invitation/Sheet.tsx` | changed | The RSVP slot stops being decorative. |

---

## 05 — Where it renders

`Sheet.tsx` currently returns a decorative pill for `SHEET_SLOTS.RSVP` — no
handler, no form, purely a shape. It becomes the real form, still gated on
`entitlements.rsvp`.

**No new band kind and no new slot.** The vocabulary in `lib/sheet.ts` does not
move, so Verdure and every sheet drawn after it gain RSVP without edits. The
form is channel content, so the artwork brief is unaffected.

---

## 06 — States

```
[ / I'll be there ]        [ x I can't make it ]
        |                          |
  name                        name
  guests  - 2 +               short message
  dietary note
        +---------- submit --------+
                    v
      confirmed: the form is replaced by a set
      line in the sheet's own type, not an alert
```

`attending` is the branch. A decline forces `party_size` to 1 server-side, so a
declining guest can never inflate the couple's headcount.

---

## 07 — Testing

Vitest, with the database call injected so no live Supabase is required:

- schema rejects an empty name, `party_size` 0, and an absurd party size
- an invitation whose `entitlements.rsvp` is false is refused
- an unpublished invitation is refused
- a decline normalises `party_size` to 1
- a valid submission produces the expected row shape

Playwright e2e is out of scope for the first pass.

---

## 08 — Deliberately out of scope

Guest-list tokens, the couple's dashboard for reading responses, editing a
submitted answer, and email notification. Each is its own feature.

---

## 09 — Known gaps this leaves

- RSVP has no bot protection. `verifyGuest` is a seam, not a defence, and
  `CLAUDE.md` carries Turnstile as a standing invariant that stays unmet until
  Cloudflare keys exist.
- No rate limiting. A determined submitter can post repeatedly.
