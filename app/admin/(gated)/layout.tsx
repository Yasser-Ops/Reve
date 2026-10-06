import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppSurface } from '@/components/admin/AppSurface';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth/actions';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES } from '@/lib/routes';

/* /admin/login sits OUTSIDE this group: inside it, the guard would redirect
   the login page to itself. */
export default async function GatedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <AppSurface>
      <header className="border-b bg-card/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-baseline gap-6">
            <Link className="font-heading text-[22px] tracking-wide" href={ROUTES.ADMIN}>
              Rêve
            </Link>
            <nav aria-label="Admin">
              <Link
                className="text-[13px] text-muted-foreground hover:text-foreground"
                href={ROUTES.ADMIN}
              >
                Clients
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-muted-foreground sm:inline">{admin.email}</span>
            <form action={signOut}>
              <Button size="sm" type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </AppSurface>
  );
}
