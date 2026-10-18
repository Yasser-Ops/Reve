-- 0009 — Operator notes move to admin-only tables.
--
-- 0008 gave clients read access to their own `clients` and `orders` rows. RLS
-- restricts rows, not columns, and a column REVOKE cannot help because admins
-- and clients share the `authenticated` role. So a client calling PostgREST
-- could read `clients.notes` and `orders.notes`, which are the operator's
-- private notes. The notes now live in tables that only admins can touch.
--
-- Cascade: admin_delete_client (0007) deletes orders then the client. These
-- tables reference them `on delete cascade`, and FK cascades are not subject
-- to RLS, so that function needs no change.

create table public.client_notes (
  client_id uuid primary key references public.clients(id) on delete cascade,
  body text not null default ''
);

create table public.order_notes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  body text not null default ''
);

alter table public.client_notes enable row level security;
alter table public.order_notes enable row level security;

create policy "client_notes admin all" on public.client_notes
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "order_notes admin all" on public.order_notes
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

grant select, insert, update, delete on public.client_notes to authenticated;
grant select, insert, update, delete on public.order_notes to authenticated;

insert into public.client_notes (client_id, body)
select id, notes from public.clients where btrim(notes) <> '';
insert into public.order_notes (order_id, body)
select id, notes from public.orders where notes is not null and btrim(notes) <> '';

alter table public.clients drop column notes;
alter table public.orders drop column notes;

-- A client's review note is theirs to write: bound it.
alter table public.invitation_reviews
  add constraint invitation_reviews_note_length check (length(note) <= 1000);

-- Nothing in the app needs these table privileges, and none is protected by
-- RLS (TRUNCATE ignores it).
revoke truncate, trigger, references on
  public.clients, public.orders, public.invitations, public.invitation_reviews,
  public.client_notes, public.order_notes
from authenticated;
