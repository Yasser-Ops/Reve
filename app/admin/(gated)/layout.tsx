import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/actions';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES } from '@/lib/routes';

/* /admin/login sits OUTSIDE this group: inside it, the guard would redirect
   the login page to itself. */
export default async function GatedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link className="font-medium" href={ROUTES.ADMIN}>
          Rêve admin
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">{admin.email}</span>
          <form action={signOut}>
            <Button size="sm" type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
