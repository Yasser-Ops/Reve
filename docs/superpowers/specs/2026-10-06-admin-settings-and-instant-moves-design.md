# Admin settings (password) and instant order moves

Date: 2026-10-06 · Branch: `feat/admin-redesign` · Approved in chat ("yes build").

## Why

1. The operator has no way to change the admin password from the app. The
   generated one appeared in chat once.
2. Moving an order waits for the server to save and re-render the page
   before anything changes on screen; in dev that reads as seconds.

Client settings (password, profile) belong to the Phase 3 portal: clients
have no accounts yet. Studio details, sign-out-everywhere and email change
were offered and not chosen.

## 1. Settings: change password

- Route `/admin/settings` (gated), `ROUTES.ADMIN_SETTINGS`; a "Settings" link
  beside "Clients" in the top bar. Breadcrumb, eyebrow, one "Password" card.
- Form: current password, new password, new password again
  (`autocomplete` current-password / new-password).
- Server action `changePassword` in `lib/auth/actions.ts`:
  1. `requireAdmin()`.
  2. zod: current non-empty; new 10 to 72 characters (72 is bcrypt's limit);
     confirm equals new; new differs from current.
  3. Re-authenticate: `signInWithPassword({ email: admin.email, password: current })`.
     Failure: "Your current password is not right." An open session alone
     cannot change the password.
  4. `auth.updateUser({ password: next })`. Supabase refusals map to words:
     `weak_password` "Supabase rejected that password as too weak. Try a
     longer one.", `same_password` "That is already your password."; anything
     else the generic error.
  5. `auth.signOut({ scope: 'others' })`: other devices are signed out, this
     one stays. A failure here still reports the change, with a note.
  6. Success: "Password changed. Other devices were signed out."
- Messages live in `lib/auth/messages.ts` (`PASSWORD_MESSAGES`, `PASSWORD_RULES`).

## 2. Instant order moves

- `OrderLive` (client island) owns the order's header row (title, badge,
  menu), stepper and primary move. It holds `useOptimistic(status)`.
- A move (primary button, menu "Move back", menu "Cancel order") sets the
  optimistic status inside a transition and calls `moveOrder`. The badge,
  stepper and next button change at once. On refusal the transition ends,
  the status falls back to the server's, and the reason is shown.
- The server re-render from `revalidatePath` still lands and becomes the
  truth. Provisioning and the invitation row stay server-rendered children.
- `moveOrder` itself is unchanged.

## Testing

- `changePassword`: refuses short / mismatched / unchanged input without
  calling Supabase; wrong current password; success calls `updateUser` then
  `signOut({ scope: 'others' })`; maps `weak_password` and `same_password`.
- `OrderLive`: clicking the primary move shows the next stage before the
  action resolves; a refusal restores the stage and shows the message.
- Browser: settings page renders; a move updates instantly.

## Plan (executed inline)

1. Settings: messages + `changePassword` (TDD), route constant, page, nav link.
2. Instant moves: `OrderLive` (TDD with a deferred action), wire `OrderCard`
   and `OrderMenu` (`onMove`), browser check.
3. Docs: ARCHITECTURE.md layout map, traces, known gaps.
