import { describe, expect, it, vi } from 'vitest';

const { notFound } = vi.hoisted(() => ({
  notFound: (): never => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('next/navigation', () => ({ notFound }));

/* The registry holds no private design yet, so one is simulated: it loads
   like any design, and only its visibility says it belongs to one client. */
vi.mock('@/components/invitation/registry', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/components/invitation/registry')>();
  const privateDesign = () => null;

  return {
    ...actual,
    getDesignPageEntry: (slug: string) =>
      slug === 'maya-karim' ? undefined : actual.getDesignPageEntry(slug),
    loadTemplate: async (slug: string) =>
      slug === 'maya-karim' ? privateDesign : actual.loadTemplate(slug),
  };
});

import PreviewPage from '@/app/preview/[slug]/page';

describe('/preview/[slug]', () => {
  /* PRIVATE means "renders their invitation, nothing else": a client's
     bespoke design must not be viewable by anyone who guesses its slug. */
  it('refuses a private design', async () => {
    await expect(
      PreviewPage({ params: Promise.resolve({ slug: 'maya-karim' }) }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('still previews a listed design', async () => {
    await expect(
      PreviewPage({ params: Promise.resolve({ slug: 'lin' }) }),
    ).resolves.toBeTruthy();
  });
});
