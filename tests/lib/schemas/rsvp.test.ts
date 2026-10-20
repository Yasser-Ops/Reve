import { describe, expect, it } from 'vitest';
import { rsvpSubmissionSchema } from '@/lib/schemas/rsvp';

const base = { slug: 'maya-and-omar', name: 'Sara', attending: 'yes', partySize: '2' };

describe('rsvpSubmissionSchema', () => {
  it('accepts a valid reply and trims text', () => {
    const parsed = rsvpSubmissionSchema.parse({ ...base, name: '  Sara  ', message: ' ' });
    expect(parsed).toMatchObject({ name: 'Sara', attending: true, partySize: 2, message: null });
  });

  it('rejects an empty or blank name', () => {
    expect(rsvpSubmissionSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(rsvpSubmissionSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
  });

  it('rejects a name over 80 characters', () => {
    expect(rsvpSubmissionSchema.safeParse({ ...base, name: 'a'.repeat(81) }).success).toBe(false);
    expect(rsvpSubmissionSchema.safeParse({ ...base, name: 'a'.repeat(80) }).success).toBe(true);
  });

  it('rejects party sizes outside 1..10', () => {
    expect(rsvpSubmissionSchema.safeParse({ ...base, partySize: '0' }).success).toBe(false);
    expect(rsvpSubmissionSchema.safeParse({ ...base, partySize: '11' }).success).toBe(false);
  });

  it('normalises a decline to a party of one', () => {
    const parsed = rsvpSubmissionSchema.parse({ ...base, attending: 'no', partySize: '5' });
    expect(parsed).toMatchObject({ attending: false, partySize: 1 });
    const bare = rsvpSubmissionSchema.parse({ ...base, attending: 'no', partySize: null });
    expect(bare.partySize).toBe(1);
  });

  it('rejects an unknown attending value', () => {
    expect(rsvpSubmissionSchema.safeParse({ ...base, attending: 'maybe' }).success).toBe(false);
  });
});
