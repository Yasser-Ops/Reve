import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import { PortalCard } from '../PortalCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PORTAL_MESSAGES } from '@/lib/auth/messages';
import { whatsappLink } from '@/lib/contact';
import { NOTICE_PARAM, PORTAL_NOTICE } from '@/lib/routes';

export const metadata: Metadata = { title: 'Sign in' };

const NOTICE_MESSAGES: Record<string, string> = {
  [PORTAL_NOTICE.LINK_EXPIRED]: PORTAL_MESSAGES.LINK_EXPIRED,
  [PORTAL_NOTICE.NOT_CLIENT]: PORTAL_MESSAGES.NOT_CLIENT,
  [PORTAL_NOTICE.PASSWORD_RESET]: PORTAL_MESSAGES.PASSWORD_RESET,
  [PORTAL_NOTICE.SIGNED_OUT]: PORTAL_MESSAGES.SIGNED_OUT,
};

const WHATSAPP_REQUEST = 'Hello, my Rêve sign-in link did not work. Could you send me a new one?';

/* Only known notices render, so the query string cannot put arbitrary text on
   the page. */
export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams)[NOTICE_PARAM];
  const key = typeof raw === 'string' && Object.hasOwn(NOTICE_MESSAGES, raw) ? raw : null;

  return (
    <PortalCard subtitle="Sign in to see your invitation">
      <div className="grid gap-4">
        {key ? (
          <Alert>
            <AlertDescription>
              {NOTICE_MESSAGES[key]}
              {key === PORTAL_NOTICE.LINK_EXPIRED ? (
                <>
                  {' '}
                  <a className="underline" href={whatsappLink(WHATSAPP_REQUEST)}>
                    Open WhatsApp
                  </a>
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        <LoginForm />
      </div>
    </PortalCard>
  );
}
