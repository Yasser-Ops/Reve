import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetForm } from './ResetForm';
import { PortalCard } from '../PortalCard';
import { getRecoveryClient } from '@/lib/auth/recovery';
import { NOTICE_PARAM, PORTAL_NOTICE, ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'New password' };

/* The recovery link signed the person in before landing here, so anything
   else (no session, a password session, an admin) is a dead or foreign link.
   Deliberately not requireClient: the welcome redirect would trap a client
   who has not accepted the terms yet. */
export default async function PortalResetPage() {
  if (!(await getRecoveryClient(await createClient()))) {
    redirect(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`);
  }

  return (
    <PortalCard subtitle="Choose a new password">
      <ResetForm />
    </PortalCard>
  );
}
