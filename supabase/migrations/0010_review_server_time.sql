-- 0010 — A review's time and id come from the server, never the caller.
--
-- 0008 lets a client insert their own review through PostgREST, and the
-- insert policy checks ownership, status and snapshot, but not created_at or
-- id. "Latest review" orders by created_at, so a client could insert a
-- far-future `changes_requested` (publishing stays blocked forever) or a
-- far-future approval (it outranks every later decision). The trigger stamps
-- both columns on every insert, admin ones included: no caller has a reason
-- to choose them. id is pinned too so nobody can pick a known or colliding key.
--
-- Security invoker is enough: the function only rewrites the incoming row.
-- Trigger functions are not callable over the API, so no EXECUTE grant.

create function private.stamp_review_server_fields() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_at := now();
  new.id := gen_random_uuid();
  return new;
end;
$$;

revoke execute on function private.stamp_review_server_fields() from public;

create trigger invitation_reviews_server_fields
  before insert on public.invitation_reviews
  for each row execute function private.stamp_review_server_fields();
