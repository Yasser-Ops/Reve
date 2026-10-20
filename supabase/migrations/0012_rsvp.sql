-- 0012 — Guest RSVP: reply checks, couple read access, live replies.
--
-- Guests never touch this table directly: replies are written by a server
-- action with the service role. The database still refuses malformed rows, so
-- a bug in the action cannot store one. public.rsvps was empty when this was
-- written, so the checks are validated immediately.

alter table public.rsvps
  add constraint rsvps_name_len check (length(btrim(name)) between 1 and 80),
  add constraint rsvps_party_size_range check (party_size between 1 and 10),
  -- A decline is one person; only an acceptance can bring a party.
  add constraint rsvps_decline_single check (attending or party_size = 1),
  add constraint rsvps_dietary_len check (dietary_notes is null or length(dietary_notes) <= 500),
  add constraint rsvps_message_len check (message is null or length(message) <= 500);

-- A couple reads replies only for an invitation they own AND whose package
-- includes RSVP. Entitlements are re-read on every call, so downgrading a
-- client hides the replies without a data change.
create function private.can_read_rsvps(p_invitation_id uuid) returns boolean
language sql security definer stable
set search_path = ''
as $$
  select private.owns_invitation(p_invitation_id)
    and exists (
      select 1
      from public.invitations i
      where i.id = p_invitation_id
        and i.entitlements->>'rsvp' = 'true'
    );
$$;

revoke execute on function private.can_read_rsvps(uuid) from public;
grant execute on function private.can_read_rsvps(uuid) to authenticated;

create policy "rsvps client read own" on public.rsvps
  for select to authenticated
  using (private.can_read_rsvps(invitation_id));

-- An open portal page shows new replies as they arrive. RLS applies to
-- Realtime, so a client only receives their own entitled rows.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rsvps'
  ) then
    alter publication supabase_realtime add table public.rsvps;
  end if;
end;
$$;

-- Defence in depth: no client role needs these on either table.
revoke truncate, trigger, references on public.rsvps from authenticated;
revoke truncate, trigger, references on public.guests from authenticated;

-- Supabase default privileges hand anon every table privilege. RLS blocks
-- row access, but TRUNCATE ignores RLS, and guests reach these tables only
-- through the service role, so anon keeps nothing.
revoke all on public.rsvps from anon;
revoke all on public.guests from anon;
