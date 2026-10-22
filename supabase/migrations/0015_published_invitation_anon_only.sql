-- 0015 — get_published_invitation is for the public reader only.
--
-- The site reads invitations with the anon key (lib/rest.ts), never as a
-- signed-in user, so the authenticated grant from 0014 was surface with no
-- caller. Anon EXECUTE stays: that is the function's whole job, and the
-- Supabase advisor's 0028 warning on it is expected.

revoke execute on function public.get_published_invitation(text) from authenticated;
