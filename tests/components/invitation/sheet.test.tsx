import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sheet } from '@/components/invitation/Sheet';
import { bandHasSlot, specSlots, SHEET_SLOTS, type SheetSpec } from '@/lib/sheet';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

const SPEC: SheetSpec = {
  ink: '#243021',
  accent: '#6b7f5e',
  muted: '#8a8577',
  ground: '#f4efe6',
  bands: [
    { kind: 'content', slots: [SHEET_SLOTS.NAMES], minHeight: 40 },
    {
      kind: 'divider',
      aspect: 720 / 300,
      art: {
        src: '/sheets/verdure/valance.svg',
        role: 'full',
        width: 720,
        height: 300,
      },
    },
    { kind: 'content', slots: [SHEET_SLOTS.SCHEDULE], minHeight: 40 },
  ],
};

const ALL = { rsvp: true, portal: true, gallery: true };

describe('sheet spec', () => {
  it('reports slots in document order', () => {
    expect(specSlots(SPEC)).toEqual([SHEET_SLOTS.NAMES, SHEET_SLOTS.SCHEDULE]);
  });

  it('does not attribute slots to a divider', () => {
    expect(bandHasSlot(SPEC.bands[1], SHEET_SLOTS.NAMES)).toBe(false);
  });
});

describe('Sheet', () => {
  it('sets the couple into the names slot', () => {
    render(
      <Sheet content={SAMPLE_CONTENT} entitlements={ALL} spec={SPEC} />,
    );

    expect(
      screen.getByRole('heading', { level: 1 }).textContent,
    ).toContain(SAMPLE_CONTENT.coupleFirstName);
  });

  /* The reason the stack exists: a variable-length schedule must not be
     capped by the geometry. Every event the couple entered is rendered. */
  it('renders every schedule event however many there are', () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({
      time: `1${i}:00`,
      title: `Event ${i}`,
    }));

    render(
      <Sheet
        content={{ ...SAMPLE_CONTENT, schedule: nine }}
        entitlements={ALL}
        spec={SPEC}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(9);
  });

  /* A band whose slots all resolve to nothing must collapse, or it holds open
     a gap the artwork was never drawn around. */
  it('drops a content band whose every slot is empty', () => {
    const { container } = render(
      <Sheet
        content={{ ...SAMPLE_CONTENT, schedule: [] }}
        entitlements={ALL}
        spec={SPEC}
      />,
    );

    expect(container.querySelectorAll('section')).toHaveLength(1);
  });

  it('sets the date as stationery, not as a numeric receipt', () => {
    render(
      <Sheet
        content={SAMPLE_CONTENT}
        entitlements={ALL}
        spec={{
          ...SPEC,
          bands: [
            { kind: 'content', slots: [SHEET_SLOTS.DATE], minHeight: 40 },
          ],
        }}
      />,
    );

    expect(screen.getByText(/\d{4}/).textContent).toMatch(
      /January|February|March|April|May|June|July|August|September|October|November|December/,
    );
  });
});
