-- 0016 — Drop the listable public view.
--
-- Live invitations read through public.get_published_invitation (0014) since
-- d28068f, verified in production on 2026-10-22 before this was applied. The
-- view answered unfiltered queries, so the public key could list every
-- published invitation; nothing reads it any more.

drop view public.published_invitations;
