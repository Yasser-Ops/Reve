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

-- user_id is `on delete set null`, not cascade: a client's record and order
-- history outlive their login.
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

-- created_by has no ON DELETE action on purpose: an approval is the record of
-- what a client agreed to, and deleting a user must not erase it silently.
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
