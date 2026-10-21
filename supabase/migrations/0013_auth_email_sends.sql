-- 0013 — Auth email log: every invite and reset email Rêve sends itself.
--
-- Auth emails used to go through Supabase, which rate-limited them. They now
-- go through Resend from our own templates, so the throttle is ours: the
-- forgot-password form reads this log before sending, and refuses an address
-- that was sent one a moment ago. Without it, anyone could flood a client's
-- inbox and exhaust the daily send quota from a public form.
--
-- Written and read only by server actions with the service role. RLS is on
-- with no policies, and the API roles hold nothing on the table.

create table public.auth_email_sends (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 320),
  kind text not null check (kind in ('invite', 'recovery')),
  sent_at timestamptz not null default now()
);

create index auth_email_sends_recent on public.auth_email_sends (email, kind, sent_at desc);

alter table public.auth_email_sends enable row level security;

revoke all on public.auth_email_sends from anon, authenticated;
