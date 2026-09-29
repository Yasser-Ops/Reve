import { describe, expect, it } from 'vitest';
import { checkContent } from '@/lib/invitations/content';

const valid = {
  coupleFirstName: 'Maya',
  couplePartnerName: 'Karim',
  initials: 'MK',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: { name: 'Villa Rosa', addressLine: 'Broumana' },
};

describe('checkContent', () => {
  it('accepts content its design can render, with defaults applied', () => {
    const result = checkContent('lin', JSON.stringify(valid));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.content).toMatchObject({ ...valid, schedule: [] });
  });

  it('reports text that is not JSON', () => {
    const result = checkContent('lin', '{ coupleFirstName: ');
    expect(result).toMatchObject({ ok: false, issues: [{ path: '' }] });
  });

  it('names the field that is wrong', () => {
    const result = checkContent('lin', JSON.stringify({ ...valid, initials: 'MAYAK' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.path)).toContain('initials');
  });

  it('refuses a design the registry does not have', () => {
    expect(checkContent('cap-blanc', JSON.stringify(valid))).toMatchObject({ ok: false });
  });
});
