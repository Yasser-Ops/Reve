import { describe, expect, it, vi } from 'vitest';

/* A storage fake whose listings stay pending until released, so the test can
   see how many were asked for before any answered. */
const { state } = vi.hoisted(() => ({
  state: {
    started: [] as string[],
    release: [] as (() => void)[],
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    storage: {
      from: () => ({
        list: (folder: string) => {
          state.started.push(folder);
          return new Promise((resolve) => {
            state.release.push(() => resolve({ data: [{ name: 'a.webp' }], error: null }));
          });
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
      }),
    },
  }),
}));

import { listMedia } from '@/lib/admin/media';

describe('listMedia', () => {
  /* Each listing is a round trip to Frankfurt; one after another they cost
     the editor three of them. */
  it('asks for every kind of media at once rather than one after another', async () => {
    const listing = listMedia('inv-1');
    await vi.waitFor(() => expect(state.started).toHaveLength(3));

    for (const release of state.release) release();
    const files = await listing;

    expect(state.started).toEqual(['inv-1/photos', 'inv-1/hero', 'inv-1/envelope']);
    expect(files.map((file) => file.url)).toEqual([
      'https://cdn/inv-1/photos/a.webp',
      'https://cdn/inv-1/hero/a.webp',
      'https://cdn/inv-1/envelope/a.webp',
    ]);
  });
});
