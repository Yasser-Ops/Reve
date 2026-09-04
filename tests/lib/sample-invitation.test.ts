import { describe, expect, it } from 'vitest';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

describe('the sample invitation', () => {
  /*
   * The Countdown primitive renders nothing once its date has passed, which is
   * right for a real invitation and wrong for the storefront: a stale sample
   * leaves a silent gap in every preview and in the design comparison. This
   * fails ahead of that, so the date is refreshed deliberately rather than
   * discovered by someone looking at a broken page.
   */
  it('is set in the future, so previews still show a countdown', () => {
    const remaining =
      new Date(SAMPLE_CONTENT.eventDate).getTime() - Date.now();
    const daysLeft = remaining / (1000 * 60 * 60 * 24);

    expect(daysLeft).toBeGreaterThan(90);
  });

  it('carries the schedule and venue the previews rely on', () => {
    expect(SAMPLE_CONTENT.schedule.length).toBeGreaterThan(0);
    expect(SAMPLE_CONTENT.venue.name.length).toBeGreaterThan(0);
  });
});
