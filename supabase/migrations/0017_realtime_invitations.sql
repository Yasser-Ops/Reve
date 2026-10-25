-- 0017 — Publish invitation saves to Realtime.
--
-- The client's portal (dashboard and preview) refreshes itself each time the
-- operator saves the invitation, so the couple can watch the work in progress
-- instead of waiting for review.
--
-- RLS still applies to Realtime postgres_changes: "invitations client read
-- own" lets a client receive only their own invitation's changes, and
-- "invitations admin all" lets admins receive every row. No policy changes.
-- Added only if not already in the publication, so the migration can be
-- re-run safely.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'invitations'
  ) then
    alter publication supabase_realtime add table public.invitations;
  end if;
end;
$$;
