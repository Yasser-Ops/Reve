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
