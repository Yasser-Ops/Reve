-- Hardening pass over the public read path, applied after the first security
-- advisor run flagged the helper functions as publicly callable.
--
-- These helpers are invoked from RLS policies and event triggers, never over
-- the REST API, so no API role needs EXECUTE on them.
revoke execute on function public.is_admin() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
