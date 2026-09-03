import { describe, expect, it } from 'vitest';
import { getTemplate, TEMPLATE_SLUGS } from '@/components/invitation/registry';

describe('template registry', () => {
  it('resolves a registered template to a component', () => {
    expect(typeof getTemplate('cap-blanc')).toBe('function');
  });

  it('returns null for an unknown slug', () => {
    expect(getTemplate('does-not-exist')).toBeNull();
  });

  it('lists cap-blanc among the registered slugs', () => {
    expect(TEMPLATE_SLUGS).toContain('cap-blanc');
  });

  it('resolves every advertised slug to a component', () => {
    for (const slug of TEMPLATE_SLUGS) {
      expect(getTemplate(slug), `slug ${slug} is unresolvable`).not.toBeNull();
    }
  });
});
