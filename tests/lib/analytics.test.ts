import { describe, expect, it } from 'vitest';
import { trackCta, trackSeal, trackWhatsapp } from '@/lib/analytics';

/* The tracker reads these attributes off the DOM, so their exact names and
   the event-name charset (a-z, 0-9, _) are the contract. */
describe('tracking attributes', () => {
  it('names the WhatsApp source, and the detail when given', () => {
    expect(trackWhatsapp('pricing', 'Managed')).toEqual({
      'data-track': 'whatsapp_click',
      'data-track-from': 'pricing',
      'data-track-detail': 'Managed',
    });
    expect(trackWhatsapp('nav')).toEqual({
      'data-track': 'whatsapp_click',
      'data-track-from': 'nav',
    });
  });

  it('keeps every event name inside the tracker charset', () => {
    for (const attrs of [trackWhatsapp('nav'), trackCta('hero', 'collection'), trackSeal()]) {
      expect(attrs['data-track']).toMatch(/^[a-z0-9_]{1,40}$/);
    }
  });
});
