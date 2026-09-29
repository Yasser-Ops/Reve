import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SIGN_IN_MESSAGES } from '@/lib/auth/messages';
import { LOGIN_NOTICE, LOGIN_NOTICE_PARAM } from '@/lib/routes';

export const metadata: Metadata = { title: 'Sign in' };

/* A notice arrives when the guard turned someone away; only known notices
   render, so the query string cannot put arbitrary text on the page. */
const NOTICES: Record<string, string> = {
  [LOGIN_NOTICE.NOT_ADMIN]: SIGN_IN_MESSAGES.NOT_ADMIN,
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams)[LOGIN_NOTICE_PARAM];
  const notice = typeof raw === 'string' ? (NOTICES[raw] ?? null) : null;

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Rêve admin</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm notice={notice} />
        </CardContent>
      </Card>
    </main>
  );
}
