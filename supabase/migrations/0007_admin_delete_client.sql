-- 0007: delete a client and everything under it, in one transaction.
--
-- Security invoker: the admin RLS policies on clients, orders and
-- invitations decide, exactly as for the admin's other writes. The explicit
-- is_admin() check gives a clean refusal instead of a silent no-op.
-- Invitation reviews, guests and RSVPs go with their invitation (on delete
-- cascade). Storage objects are removed by the caller: SQL must not delete
-- from storage.objects directly.
--
-- Refusals carry their own SQLSTATE so the server action can word them:
--   RV001  the typed name does not match the client's full name
--   RV002  one of the client's invitations is published (live for guests)

create function public.admin_delete_client(p_client_id uuid, p_confirm_name text)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text;
  v_ids uuid[];
begin
  if not private.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select full_name into v_name
  from public.clients
  where id = p_client_id
  for update;

  if not found then
    return null;
  end if;

  if lower(btrim(v_name)) <> lower(btrim(coalesce(p_confirm_name, ''))) then
    raise exception 'confirm name does not match' using errcode = 'RV001';
  end if;

  if exists (
    select 1
    from public.invitations i
    join public.orders o on o.id = i.order_id
    where o.client_id = p_client_id and i.status = 'published'
  ) then
    raise exception 'client has a published invitation' using errcode = 'RV002';
  end if;

  select coalesce(array_agg(i.id), '{}') into v_ids
  from public.invitations i
  join public.orders o on o.id = i.order_id
  where o.client_id = p_client_id;

  delete from public.invitations where id = any(v_ids);
  delete from public.orders where client_id = p_client_id;
  delete from public.clients where id = p_client_id;

  return v_ids;
end;
$$;

revoke all on function public.admin_delete_client(uuid, text) from public, anon;
grant execute on function public.admin_delete_client(uuid, text) to authenticated;
