import type { Metadata } from 'next';
import { ForgotForm } from './ForgotForm';
import { PortalCard } from '../PortalCard';

export const metadata: Metadata = { title: 'Forgot password' };

export default function PortalForgotPage() {
  return (
    <PortalCard subtitle="We will email you a reset link">
      <ForgotForm />
    </PortalCard>
  );
}
