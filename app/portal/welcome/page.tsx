import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WelcomeForm } from './WelcomeForm';
import { PortalCard } from '../PortalCard';
import { requireClientAccount } from '@/lib/auth/guards';
import { ROUTES } from '@/lib/routes';

export const metadata: Metadata = { title: 'Welcome', robots: { index: false, follow: false } };

/* requireClientAccount, not requireClient: the latter sends clients who have
   not accepted the terms here, so using it would redirect this page to itself. */
export default async function PortalWelcomePage() {
  const client = await requireClientAccount();
  if (client.termsAcceptedAt !== null) redirect(ROUTES.PORTAL);

  const firstName = client.fullName.trim().split(/\s+/)[0] ?? '';

  return (
    <PortalCard subtitle={firstName ? `Welcome, ${firstName}` : 'Welcome'}>
      <p className="mb-4 text-sm text-muted-foreground">
        Choose a password to open your portal.
      </p>
      <WelcomeForm />
    </PortalCard>
  );
}
