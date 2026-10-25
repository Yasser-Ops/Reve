import { describe, expect, it } from 'vitest';
import { linContentSchema } from '@/components/invitation/templates/lin/schema';
import { CORE_PLACEHOLDERS, fillPlaceholders } from '@/lib/schemas/content/placeholders';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

describe('fillPlaceholders', () => {
  it('fills an empty draft with every core placeholder', () => {
    const draft = fillPlaceholders(linContentSchema, {});
    expect(draft?.content).toMatchObject(CORE_PLACEHOLDERS);
    expect(draft?.placeholders).toEqual([
      'First name',
      'Second name',
      'Initials',
      'Date and arrival time',
      'Venue',
    ]);
  });

  it('the placeholders themselves satisfy the core', () => {
    expect(fillPlaceholders(linContentSchema, CORE_PLACEHOLDERS)?.placeholders).toEqual([]);
  });

  it('keeps complete content untouched, with no placeholders', () => {
    const draft = fillPlaceholders(linContentSchema, SAMPLE_CONTENT);
    expect(draft?.content).toEqual(linContentSchema.parse(SAMPLE_CONTENT));
    expect(draft?.placeholders).toEqual([]);
  });

  it('keeps what is already saved and fills only the rest', () => {
    const draft = fillPlaceholders(linContentSchema, {
      coupleFirstName: 'Maya',
      message: 'Join us',
    });
    expect(draft?.content.coupleFirstName).toBe('Maya');
    expect(draft?.content.message).toBe('Join us');
    expect(draft?.content.couplePartnerName).toBe(CORE_PLACEHOLDERS.couplePartnerName);
    expect(draft?.placeholders).not.toContain('First name');
  });

  it('keeps the valid half of a venue', () => {
    const draft = fillPlaceholders(linContentSchema, { venue: { name: 'Beit Misk' } });
    expect(draft?.content.venue).toEqual({
      name: 'Beit Misk',
      addressLine: CORE_PLACEHOLDERS.venue.addressLine,
    });
    expect(draft?.placeholders).toContain('Venue');
  });

  it('treats a blank as empty and drops an invalid optional field', () => {
    const draft = fillPlaceholders(linContentSchema, {
      coupleFirstName: '',
      heroMedia: { type: 'video', src: '' },
    });
    expect(draft?.content.coupleFirstName).toBe(CORE_PLACEHOLDERS.coupleFirstName);
    expect(draft?.content.heroMedia).toBeUndefined();
  });

  it('treats content that is not an object as empty', () => {
    expect(fillPlaceholders(linContentSchema, null)?.content).toMatchObject(CORE_PLACEHOLDERS);
  });
});
