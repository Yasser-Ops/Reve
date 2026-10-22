/**
 * The owner's traffic dashboard (app.buildwithyasser.com): one script, keyed
 * to this site by its asset id. Loaded on the storefront only, never on a
 * couple's invitation, so guest visits do not count as shop traffic; a guest
 * who follows the invitation credit arrives on the storefront and is counted
 * there, tagged by ReveCredit's utm parameters.
 */
export const TRACKER_SRC = 'https://app.buildwithyasser.com/track.js';
export const TRACKER_ASSET_ID = '328d0f8b-4993-4d6a-b1d1-a0c7f8890a82';

/*
 * Click events are declarative: the tracker listens for clicks on any element
 * carrying `data-track`, and sends each `data-track-*` attribute as a prop. So
 * these are plain attributes, spread onto server-rendered links, and no
 * component needs to become a client island to be counted.
 */
const EVENT = {
  whatsapp: 'whatsapp_click',
  cta: 'cta_click',
  seal: 'seal_tap',
} as const;

/** Where a WhatsApp button sits. The dashboard breaks clicks down by this. */
export type WhatsappSource =
  | 'nav'
  | 'nav_menu'
  | 'sticky'
  | 'pricing'
  | 'closing'
  | 'design'
  | 'catalogue'
  | 'footer'
  | 'terms';

type TrackAttributes = Record<`data-track${string}`, string>;

export function trackWhatsapp(
  from: WhatsappSource,
  detail?: string,
): TrackAttributes {
  return {
    'data-track': EVENT.whatsapp,
    'data-track-from': from,
    ...(detail ? { 'data-track-detail': detail } : {}),
  };
}

/** A storefront button that leads somewhere other than WhatsApp. */
export function trackCta(from: string, target: string): TrackAttributes {
  return {
    'data-track': EVENT.cta,
    'data-track-from': from,
    'data-track-target': target,
  };
}

/** The seal on a storefront demo phone: did the visitor try the product? */
export function trackSeal(): TrackAttributes {
  return { 'data-track': EVENT.seal };
}
