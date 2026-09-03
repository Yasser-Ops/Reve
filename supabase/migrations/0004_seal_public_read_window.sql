-- Final shape of the public read path.
--
-- `published_invitations` is the ONLY public window onto invitations. It runs
-- as its owner (security_invoker = off), so the anon role needs no privileges
-- whatsoever on the underlying table, and it projects only the columns a guest
-- may see. `manage_token_hash`, `id` and `order_id` are deliberately absent,
-- and the WHERE clause keeps drafts and archived invitations invisible.
--
-- The database linter flags SECURITY DEFINER views by default. Here it is
-- deliberate, and it is the narrower of the two options: making the view
-- security_invoker would require granting anon SELECT on `invitations`
-- itself, which is strictly wider than exposing six columns of published rows.
-- Verified empirically: with this shape, anon receives HTTP 401 on every
-- attempt to read the base table, including targeted `select=manage_token_hash`.

drop policy if exists "invitations public read published" on invitations;

revoke all on invitations from anon, authenticated;
revoke all on published_invitations from anon, authenticated;

drop view if exists published_invitations;

create view published_invitations
with (security_invoker = off) as
  select slug, template_slug, content, theme, entitlements, published_at
  from invitations
  where status = 'published';

grant select on published_invitations to anon, authenticated;
