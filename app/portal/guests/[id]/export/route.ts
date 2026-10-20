import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireClient } from '@/lib/auth/guards';
import { csvResponse } from '@/lib/rsvp/export';
import { getGuestList } from '@/lib/rsvp/read';
import { entitlementsSchema } from '@/lib/schemas/invitation';
import { createClient } from '@/lib/supabase/server';

const IdSchema = z.uuid();

/**
 * The guest list as a spreadsheet. The guard redirects like a page would; the
 * invitation read goes through the client's own session, so RLS hides anyone
 * else's and a missing row, a bad id and a plan without replies all look the
 * same: not found.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireClient();

  const id = IdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invitations')
    .select('slug, entitlements')
    .eq('id', id.data)
    .maybeSingle();
  if (error) throw error;
  if (!data || !entitlementsSchema.parse(data.entitlements).rsvp) notFound();

  return csvResponse(data.slug, (await getGuestList(id.data)).guests);
}
