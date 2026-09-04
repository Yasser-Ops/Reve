import { Sheet } from '@/components/invitation/Sheet';
import {
  ART_ROLES,
  SHEET_GROUND,
  SHEET_SLOTS,
  type SheetSpec,
} from '@/lib/sheet';
import type { TemplateProps } from '@/components/invitation/registry';

/**
 * Verdure — the first drawn sheet, and the proof that the band vocabulary
 * carries a whole invitation with no layout code of its own.
 *
 * Everything below is data. There is no JSX describing where anything sits,
 * because that is exactly what lib/sheet.ts fixed. A second design is another
 * file shaped like this one with different art and different ink.
 *
 * ARTWORK IS PLACEHOLDER. The three SVGs under public/sheets/verdure are
 * stand-ins that demonstrate the geometry and the fade-to-ground seam rule.
 * They are not the design. Replacing them changes no code.
 */
const VERDURE: SheetSpec = {
  ink: '#243021',
  accent: '#6b7f5e',
  muted: '#8a8577',
  ground: SHEET_GROUND,

  bands: [
    /* The opening. Names first and largest: it is the reason the invitation
       exists, and nothing is allowed to crowd it. */
    {
      kind: 'content',
      slots: [SHEET_SLOTS.EYEBROW, SHEET_SLOTS.NAMES, SHEET_SLOTS.DATE],
      minHeight: 92,
      art: {
        src: '/sheets/verdure/spray.svg',
        role: ART_ROLES.CORNER,
        corner: 'top-left',
        width: 360,
        height: 360,
      },
    },

    { kind: 'divider', aspect: 720 / 300, art: { src: '/sheets/verdure/valance.svg', role: ART_ROLES.FULL, width: 720, height: 300 } },

    {
      kind: 'content',
      slots: [SHEET_SLOTS.MESSAGE, SHEET_SLOTS.COUNTDOWN],
      minHeight: 46,
    },

    { kind: 'divider', aspect: 720 / 220, art: { src: '/sheets/verdure/border.svg', role: ART_ROLES.FULL, width: 720, height: 220 } },

    {
      kind: 'content',
      slots: [SHEET_SLOTS.VENUE],
      minHeight: 40,
    },

    /* The schedule sets its own height. Three events or nine, the bands below
       simply start lower — the case a fixed zone map could not express. */
    {
      kind: 'content',
      slots: [SHEET_SLOTS.SCHEDULE],
      minHeight: 44,
      art: {
        src: '/sheets/verdure/spray.svg',
        role: ART_ROLES.CORNER,
        corner: 'bottom-right',
        width: 360,
        height: 360,
      },
    },

    { kind: 'divider', aspect: 720 / 220, art: { src: '/sheets/verdure/border.svg', role: ART_ROLES.FULL, width: 720, height: 220 } },

    {
      kind: 'content',
      slots: [SHEET_SLOTS.GALLERY, SHEET_SLOTS.RSVP],
      minHeight: 44,
    },
  ],
};

export function Verdure({ content, entitlements }: TemplateProps) {
  return <Sheet content={content} entitlements={entitlements} spec={VERDURE} />;
}
