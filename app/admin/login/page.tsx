import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';
import { AppSurface } from '@/components/admin/AppSurface';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SIGN_IN_MESSAGES } from '@/lib/auth/messages';
import { LOGIN_NOTICE, NOTICE_PARAM } from '@/lib/routes';

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
  const raw = (await searchParams)[NOTICE_PARAM];
  const notice = typeof raw === 'string' ? (NOTICES[raw] ?? null) : null;

  return (
    <AppSurface>
      <main className="grid min-h-dvh place-items-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <p className="font-heading text-[26px] tracking-wide">Rêve</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Studio sign in
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm notice={notice} />
          </CardContent>
        </Card>
      </main>
    </AppSurface>
  );
}
