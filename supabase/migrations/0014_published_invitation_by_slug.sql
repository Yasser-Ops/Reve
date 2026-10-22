-- 0014 — Read one published invitation by its link, never the list.
--
-- `published_invitations` (0006) is a security-definer view: it is the only
-- public window onto invitations, and it is read-only and column-limited. But
-- a view answers any query, so the public anon key could ask for every row at
-- once and read every couple's names, date and venue without holding a single
-- link. Verified 2026-10-22: an unfiltered anon select returned all rows.
--
-- A guest only ever needs the invitation whose link they were sent. This
-- function returns exactly that row and nothing without the slug, so there is
-- no way to enumerate. Same columns as the view, same "published and approved"
-- rule.
--
-- Step one of two: the view stays until the site reads through this function
-- in production; a later migration drops it.

create function public.get_published_invitation(p_slug text)
returns table (
  slug text,
  template_slug text,
  content jsonb,
  theme jsonb,
  entitlements jsonb,
  published_at timestamptz
)
language sql security definer stable
set search_path = ''
as $$
  select i.slug, i.template_slug, i.published_content, i.theme, i.entitlements, i.published_at
  from public.invitations i
  where i.slug = p_slug
    and i.status = 'published'
    and i.published_content is not null
  limit 1;
$$;

revoke execute on function public.get_published_invitation(text) from public;
grant execute on function public.get_published_invitation(text) to anon, authenticated;
