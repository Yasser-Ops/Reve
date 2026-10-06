import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jardinContentSchema } from '@/components/invitation/templates/jardin/schema';
import { linContentSchema } from '@/components/invitation/templates/lin/schema';
import {
  emptyValue,
  formModel,
  isoToLocalInput,
  localInputToIso,
  parseContentText,
  pruneContent,
} from '@/lib/admin/content-form';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

describe('formModel', () => {
  it('reads Lin into labelled fields of the right kinds', () => {
    const fields = formModel(linContentSchema);
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]));

    expect(byKey.coupleFirstName).toMatchObject({ kind: 'text', label: 'First name', required: true });
    expect(byKey.eventDate).toMatchObject({ kind: 'datetime', required: true });
    expect(byKey.message).toMatchObject({ kind: 'textarea', required: false });
    expect(byKey.venue).toMatchObject({ kind: 'group', required: true });
    expect(byKey.schedule).toMatchObject({ kind: 'list', required: false });
    expect(byKey.heroMedia).toMatchObject({ kind: 'group', required: false });
  });

  it('reads nested fields: the map link is a url, gallery photos pick from uploads', () => {
    const fields = formModel(jardinContentSchema);
    const venue = fields.find((field) => field.key === 'venue');
    const gallery = fields.find((field) => field.key === 'gallery');

    expect(venue?.kind === 'group' && venue.fields.find((f) => f.key === 'mapUrl')).toMatchObject({
      kind: 'url',
      required: false,
    });
    expect(gallery?.kind === 'list' && gallery.item.find((f) => f.key === 'src')).toMatchObject({
      kind: 'media',
      media: 'photos',
    });
  });

  it('refuses a field with no label, naming its path', () => {
    const schema = z.object({ venue: z.object({ name: z.string() }).meta({ label: 'Venue' }) });
    expect(() => formModel(schema)).toThrow('venue.name');
  });

  it('refuses a type the editor cannot show', () => {
    const schema = z.object({ guests: z.number().meta({ label: 'Guests' }) });
    expect(() => formModel(schema)).toThrow('guests');
  });
});

describe('pruneContent', () => {
  const fields = formModel(linContentSchema);

  it('leaves complete content exactly as it was', () => {
    expect(pruneContent(fields, SAMPLE_CONTENT)).toEqual(SAMPLE_CONTENT);
  });

  /* Review Focus 4. */
  it('drops an emptied optional field instead of saving ""', () => {
    const pruned = pruneContent(fields, { ...SAMPLE_CONTENT, headline: '  ' });
    expect(pruned).not.toHaveProperty('headline');
  });

  it('keeps an emptied required field so the server can say it is missing', () => {
    expect(pruneContent(fields, { ...SAMPLE_CONTENT, coupleFirstName: '' }).coupleFirstName).toBe('');
  });

  it('keeps keys the form does not know', () => {
    expect(pruneContent(fields, { ...SAMPLE_CONTENT, legacyNote: 'kept' })).toHaveProperty(
      'legacyNote',
      'kept',
    );
  });

  it('drops an optional detail inside a schedule row', () => {
    const pruned = pruneContent(fields, {
      ...SAMPLE_CONTENT,
      schedule: [{ time: '7 pm', title: 'Dinner', description: '' }],
    });
    expect(pruned.schedule).toEqual([{ time: '7 pm', title: 'Dinner' }]);
  });
});

describe('emptyValue', () => {
  it('starts a schedule row with its required fields empty and its optional ones absent', () => {
    const schedule = formModel(linContentSchema).find((field) => field.key === 'schedule');
    expect(schedule?.kind === 'list' && emptyValue(schedule.item)).toEqual({ time: '', title: '' });
  });
});

describe('date and time', () => {
  /* Review Focus 5: the stored instant survives the local-time round trip in any zone. */
  it('round-trips the stored instant through the local input', () => {
    for (const iso of [
      '2027-05-27T18:30:00.000Z',
      '2027-05-27T21:30:00.000Z',
      '2027-12-31T23:45:00.000Z',
    ]) {
      expect(localInputToIso(isoToLocalInput(iso))).toBe(iso);
    }
  });

  it('turns an empty or broken value into an empty input, not "Invalid Date"', () => {
    expect(isoToLocalInput('')).toBe('');
    expect(isoToLocalInput('soon')).toBe('');
    expect(localInputToIso('')).toBe('');
  });
});

describe('parseContentText', () => {
  /* Review Focus 3. */
  it('refuses text that is not a JSON object, with a reason', () => {
    expect(parseContentText('{"a":')).toMatchObject({ ok: false });
    expect(parseContentText('[1,2]')).toEqual({
      ok: false,
      message: 'The content must be one JSON object.',
    });
  });

  it('accepts an object', () => {
    expect(parseContentText('{"initials":"MS"}')).toEqual({ ok: true, value: { initials: 'MS' } });
  });
});
