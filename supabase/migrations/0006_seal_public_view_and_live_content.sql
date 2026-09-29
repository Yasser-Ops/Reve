-- 0006 — Seal the public view, and serve only approved content.
--
-- 1. SECURITY FIX. 0004 dropped and recreated `published_invitations`, and
--    Supabase's default privileges granted ALL on the new view to anon and
--    authenticated; the `grant select` after it added nothing. The view is
--    auto-updatable and runs as its owner (which bypasses RLS), so anyone with
--    the public anon key could UPDATE or DELETE a published invitation through
--    it. Verified 2026-09-29: anon write statements on the view were accepted.
--    Every privilege is revoked and SELECT alone granted back.
--
-- 2. `published_content`: what guests see is the APPROVED snapshot, copied in
--    at publish, never the working `content`. Editing a published invitation
--    now changes a draft; the live page moves only when a fresh approval is
--    published. This also closes the window between the publish guard's read
--    and its write.
--
-- Recreating a view re-applies the default grants, so the revoke comes after
-- the create, in this same migration.

alter table public.invitations add column published_content jsonb;

-- Nothing is published at the time of writing; this keeps any row that is.
update public.invitations
  set published_content = content
  where status = 'published' and published_content is null;

drop view public.published_invitations;

create view public.published_invitations
with (security_invoker = off) as
  select slug, template_slug, published_content as content, theme, entitlements, published_at
  from public.invitations
  where status = 'published' and published_content is not null;

revoke all on public.published_invitations from public, anon, authenticated;
grant select on public.published_invitations to anon, authenticated;
