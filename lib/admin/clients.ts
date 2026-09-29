import 'server-only';
import { z } from 'zod';
import { TIERS } from '@/lib/constants';
import { ORDER_STATUS } from '@/lib/orders/status';
import { createClient } from '@/lib/supabase/server';

export const clientFiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  status: z.enum(ORDER_STATUS).optional().catch(undefined),
  tier: z.enum(TIERS).optional().catch(undefined),
});

export type ClientFilters = z.infer<typeof clientFiltersSchema>;

/**
 * A contains-match for PostgREST's `or=()`. Commas, parentheses and the
 * wildcard characters are filter syntax there, so they are removed rather
 * than escaped: a name or phone number never needs them.
 */
export function searchPattern(q: string): string | null {
  const cleaned = q.replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? `*${cleaned}*` : null;
}

const LIST_SELECT =
  'id, full_name, email, phone, user_id, created_at, orders!inner(id, reference, tier, status, due_at, created_at)';

/** Every client has at least one order: they are created together. */
export async function listClients(filters: ClientFilters) {
  const supabase = await createClient();
  let query = supabase
    .from('clients')
    .select(LIST_SELECT)
    .order('created_at', { ascending: false });

  const pattern = filters.q ? searchPattern(filters.q) : null;
  if (pattern) {
    query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
  }
  if (filters.status) query = query.eq('orders.status', filters.status);
  if (filters.tier) query = query.eq('orders.tier', filters.tier);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type ClientListRow = Awaited<ReturnType<typeof listClients>>[number];

export async function getClient(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .select(
      'id, full_name, email, phone, notes, user_id, terms_accepted_at, created_at, orders(id, reference, tier, status, amount, event_date, due_at, notes, created_at, invitations(id, slug, status, template_slug))',
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'orders', ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClient>>>;
