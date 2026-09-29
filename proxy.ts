import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/* Literal, because Next analyses this statically. Must equal
   PRIVATE_ROUTE_PATTERNS in lib/routes.ts (tests/proxy.test.ts checks). */
export const config = {
  matcher: ['/admin/:path*', '/portal/:path*'],
};
