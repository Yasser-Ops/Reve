import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RECOVERY_WINDOW_SECONDS, getRecoveryClient } from '@/lib/auth/recovery';
import type { Database } from '@/lib/supabase/database.types';

const NOW = new Date('2026-10-18T12:00:00Z');
const nowSeconds = NOW.getTime() / 1000;

const getClaims = vi.fn();
const maybeSingle = vi.fn();
const supabase = {
  auth: { getClaims },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
} as unknown as SupabaseClient<Database>;

function withAmr(amr: unknown) {
  getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-1', email: 'maya@example.com', amr } },
    error: null,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  vi.clearAllMocks();
  maybeSingle.mockResolvedValue({ data: { id: 'client-1', email: 'maya@example.com' }, error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getRecoveryClient', () => {
  it('accepts a recovery the link made moments ago', async () => {
    withAmr([{ method: 'recovery', timestamp: nowSeconds - 60 }]);
    await expect(getRecoveryClient(supabase)).resolves.toEqual({
      userId: 'user-1',
      email: 'maya@example.com',
    });
  });

  it('refuses a recovery older than the window', async () => {
    withAmr([{ method: 'recovery', timestamp: nowSeconds - RECOVERY_WINDOW_SECONDS - 1 }]);
    await expect(getRecoveryClient(supabase)).resolves.toBeNull();
  });

  it('refuses the string form, which carries no time', async () => {
    withAmr(['recovery']);
    await expect(getRecoveryClient(supabase)).resolves.toBeNull();
  });

  it('refuses a session without amr', async () => {
    withAmr(undefined);
    await expect(getRecoveryClient(supabase)).resolves.toBeNull();
  });

  it('refuses an empty amr', async () => {
    withAmr([]);
    await expect(getRecoveryClient(supabase)).resolves.toBeNull();
  });

  it('refuses a recent recovery on an account that is not a client', async () => {
    withAmr([{ method: 'recovery', timestamp: nowSeconds - 60 }]);
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getRecoveryClient(supabase)).resolves.toBeNull();
  });
});
