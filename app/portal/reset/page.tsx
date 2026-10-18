import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetForm } from './ResetForm';
import { PortalCard } from '../PortalCard';
import { NOTICE_PARAM, PORTAL_NOTICE, ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'New password' };

/* The recovery link signed the person in before landing here, so a visit with
   no claims is a dead or reused link. Deliberately not requireClient: the
   welcome redirect would trap a client who has not accepted the terms yet. */
export default async function PortalResetPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`);
  }

  return (
    <PortalCard subtitle="Choose a new password">
      <ResetForm />
    </PortalCard>
  );
}
