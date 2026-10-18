import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppSurface } from '@/components/admin/AppSurface';
import { Button, buttonVariants } from '@/components/ui/button';
import { requireClient } from '@/lib/auth/guards';
import { signOutClient } from '@/lib/auth/portal-actions';
import { ROUTES } from '@/lib/routes';

/* /portal/login, forgot and reset sit OUTSIDE this group: inside it, the
   guard would redirect them to themselves. */
export default async function GatedPortalLayout({ children }: { children: ReactNode }) {
  const client = await requireClient();

  return (
    <AppSurface>
      <header className="border-b bg-card/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="font-heading text-[22px] tracking-wide" href={ROUTES.PORTAL}>
            {client.fullName}
          </Link>
          <div className="flex items-center gap-1">
            <Link
              className={buttonVariants({ size: 'sm', variant: 'ghost' })}
              href={ROUTES.PORTAL_SETTINGS}
            >
              Settings
            </Link>
            <form action={signOutClient}>
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
