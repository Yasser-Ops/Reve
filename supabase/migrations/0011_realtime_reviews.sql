-- 0011 — Publish review and order changes to Realtime.
--
-- An open admin page (client page, invitation editor, clients list) refreshes
-- itself when a client approves, withdraws or requests changes, or when an
-- order moves, instead of waiting for a manual reload.
--
-- RLS still applies to Realtime postgres_changes: the existing "admin all"
-- policies let admins receive every row, and a client only receives their
-- own rows. Each table is added only if it is not already in the publication,
-- so the migration can be re-run safely.

do $$
declare
  t text;
begin
  foreach t in array array['invitation_reviews', 'orders'] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
