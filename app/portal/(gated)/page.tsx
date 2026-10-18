import { requireClient } from '@/lib/auth/guards';

/* A placeholder until the portal home lands. */
export default async function PortalHomePage() {
  const client = await requireClient();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl">{client.fullName}</h1>
    </main>
  );
}
