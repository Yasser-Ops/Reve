-- 0008 — Client portal: what a signed-in client may read, and the one thing
-- they may write (a review decision on their own invitation).
--
-- Ownership chain: invitation -> order -> client -> auth user. The helpers are
-- security definer so the lookup is not itself filtered by the client's own
-- RLS, and they live in `private` (not exposed by PostgREST), as is_admin().
-- Admin policies ("... admin all") are untouched and still OR with these.
-- Deliberately no client UPDATE or DELETE policy anywhere: a client cannot
-- edit an invitation, an order, or a past review.

create function private.owns_invitation(p_invitation_id uuid) returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.invitations i
    join public.orders o on o.id = i.order_id
    join public.clients c on c.id = o.client_id
    where i.id = p_invitation_id
      and c.user_id = auth.uid()
  );
$$;

revoke execute on function private.owns_invitation(uuid) from public;
grant execute on function private.owns_invitation(uuid) to authenticated;

-- A review is only valid while the order is in `review` and the client
-- approved exactly what is stored now. jsonb equality ignores key order, so a
-- stale snapshot (admin edited after the client loaded the page) is refused.
create function private.can_review(p_invitation_id uuid, p_snapshot jsonb) returns boolean
language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.invitations i
    join public.orders o on o.id = i.order_id
    where i.id = p_invitation_id
      and o.status = 'review'
      and i.content = p_snapshot
  );
$$;

revoke execute on function private.can_review(uuid, jsonb) from public;
grant execute on function private.can_review(uuid, jsonb) to authenticated;

create policy "clients self read" on public.clients
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "orders client read own" on public.orders
  for select to authenticated
  using (client_id in (
    select id from public.clients where user_id = (select auth.uid())
  ));

create policy "invitations client read own" on public.invitations
  for select to authenticated
  using (private.owns_invitation(id));

create policy "invitation_reviews client read own" on public.invitation_reviews
  for select to authenticated
  using (private.owns_invitation(invitation_id));

-- on_behalf = false: only an admin may record a decision on a client's behalf.
-- created_by is pinned to the caller so a review cannot be attributed to
-- someone else.
create policy "invitation_reviews client insert own" on public.invitation_reviews
  for insert to authenticated
  with check (
    private.owns_invitation(invitation_id)
    and created_by = (select auth.uid())
    and on_behalf = false
    and private.can_review(invitation_id, content_snapshot)
  );
