import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from '../../helpers/fake-supabase';

const state = vi.hoisted(() => ({ fake: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.fake?.client }));

import { clientFiltersSchema, listClients, searchPattern } from '@/lib/admin/clients';

beforeEach(() => {
  state.fake = fakeSupabase({ clients: [{ data: [] }] });
});

describe('searchPattern', () => {
  it('wraps a term for a contains match', () => {
    expect(searchPattern('maya')).toBe('*maya*');
  });

  /* Review Focus 2: PostgREST reads , ( ) as filter syntax inside or=(). */
  it('strips anything PostgREST would read as syntax', () => {
    expect(searchPattern('maya,email.neq.x')).toBe('*maya email.neq.x*');
    expect(searchPattern('(%*maya*)')).toBe('*maya*');
  });

  it('returns null for a blank search', () => {
    expect(searchPattern('  ,() ')).toBeNull();
  });
});

describe('clientFiltersSchema', () => {
  it('ignores a view it does not know rather than failing the page', () => {
    expect(clientFiltersSchema.parse({ view: 'everything' }).view).toBeUndefined();
    expect(clientFiltersSchema.parse({ view: 'overdue' }).view).toBe('overdue');
  });
});

describe('listClients views', () => {
  const now = new Date('2026-10-06T12:00:00.000Z');

  it('asks for open orders past their due time for the overdue view', async () => {
    await listClients({ view: 'overdue' }, now);
    expect(state.fake?.find('clients', 'lt')?.args).toEqual(['orders.due_at', now.toISOString()]);
    expect(state.fake?.find('clients', 'not')?.args).toEqual([
      'orders.status',
      'in',
      '(delivered,cancelled)',
    ]);
  });

  it('asks for orders in review for the awaiting-approval view', async () => {
    await listClients({ view: 'review' }, now);
    expect(state.fake?.find('clients', 'eq')?.args).toEqual(['orders.status', 'review']);
  });
});
