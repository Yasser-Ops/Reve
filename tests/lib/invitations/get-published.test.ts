import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  },
}));

import { getPublishedInvitation } from '@/lib/invitations/get-published';

const row = {
  slug: 'sarah-and-amine',
  template_slug: 'cap-blanc',
  content: {
    coupleFirstName: 'Sarah',
    couplePartnerName: 'Amine',
    initials: 'SA',
    eventDate: '2027-06-12T17:00:00.000Z',
    venue: { name: 'Villa Rosa', addressLine: '12 Rue des Fleurs' },
    schedule: [],
    gallery: [],
  },
  theme: { palette: 'default', motion: 'full' },
  entitlements: { rsvp: true, portal: true, gallery: true },
  published_at: '2026-09-01T00:00:00.000Z',
};

function mockFetchOnce(body: unknown, ok = true) {
  const spy = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPublishedInvitation', () => {
  it('returns a camelCased, validated invitation', async () => {
    mockFetchOnce([row]);
    const result = await getPublishedInvitation('sarah-and-amine');

    expect(result).not.toBeNull();
    expect(result?.templateSlug).toBe('cap-blanc');
    expect(result?.content.coupleFirstName).toBe('Sarah');
    expect(result?.entitlements.rsvp).toBe(true);
  });

  it('reads from the published_invitations view with no-store caching', async () => {
    const spy = mockFetchOnce([row]);
    await getPublishedInvitation('sarah-and-amine');

    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain('/rest/v1/published_invitations');
    expect(String(url)).toContain('slug=eq.sarah-and-amine');
    expect(init.cache).toBe('no-store');
  });

  it('returns null when no row matches', async () => {
    mockFetchOnce([]);
    expect(await getPublishedInvitation('missing')).toBeNull();
  });

  it('throws when PostgREST returns an error status', async () => {
    mockFetchOnce({ message: 'boom' }, false);
    await expect(getPublishedInvitation('sarah-and-amine')).rejects.toThrow();
  });

  it('throws when the stored content fails schema validation', async () => {
    mockFetchOnce([{ ...row, content: { coupleFirstName: 'Sarah' } }]);
    await expect(getPublishedInvitation('sarah-and-amine')).rejects.toThrow();
  });
});
