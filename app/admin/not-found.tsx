import Link from 'next/link';
import { AppSurface } from '@/components/admin/AppSurface';
import { ROUTES } from '@/lib/routes';

export default function AdminNotFound() {
  return (
    <AppSurface>
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-lg font-medium">Not found</h1>
        <Link className="mt-6 inline-block underline" href={ROUTES.ADMIN}>
          Back to clients
        </Link>
      </main>
    </AppSurface>
  );
}
