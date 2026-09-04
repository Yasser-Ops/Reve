import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '@/components/invitation/registry';
import { TIERS } from '@/lib/constants';
import { DELIVERY, ENTRY_TIER, HOW_IT_WORKS, OFFER_TIERS } from '@/lib/offer';

describe('the offer', () => {
  it('prices every tier the product actually has', () => {
    expect(OFFER_TIERS.map((tier) => tier.tier)).toEqual([
      TIERS.BASIC,
      TIERS.MANAGED,
      TIERS.CUSTOM,
    ]);
  });

  it('quotes the cheapest tier as the entry price', () => {
    const cheapest = Math.min(
      ...OFFER_TIERS.map((tier) => Number(tier.price.replace(/\D/g, ''))),
    );

    expect(Number(ENTRY_TIER.price.replace(/\D/g, ''))).toBe(cheapest);
  });

  /* The delivery promise is a commitment a customer can hold Rêve to. It rests
     on the artwork already being drawn, which is untrue of a bespoke design. */
  it('never promises the ready-drawn turnaround on Custom', () => {
    expect(DELIVERY.excludesTier).toBe(TIERS.CUSTOM);
  });

  it('describes ordering without inventing a design phase', () => {
    expect(HOW_IT_WORKS.length).toBeGreaterThan(0);
    expect(HOW_IT_WORKS.length).toBeLessThanOrEqual(5);
  });
});

describe('the catalogue', () => {
  /* Rêve is pre-launch. A rating or a couple count on a product page would be
     fabricated, so no copy that reaches one may carry a number of that kind. */
  it('claims no ratings or customer counts', () => {
    const copy = [
      DELIVERY.headline,
      DELIVERY.detail,
      ...OFFER_TIERS.flatMap((tier) => [tier.summary, ...tier.includes]),
      ...HOW_IT_WORKS.flatMap((step) => [step.title, step.body]),
      ...TEMPLATES.flatMap((entry) => [entry.summary, entry.story]),
    ].join(' ');

    expect(copy).not.toMatch(/\b\d+(\.\d+)?\s*(\/\s*5|stars?)\b/i);
    expect(copy).not.toMatch(/\b[\d,]+\+?\s*(couples|customers|clients)\b/i);
    expect(copy).not.toMatch(/\breviews?\b/i);
  });

  it('gives every design a story of its own', () => {
    const stories = TEMPLATES.map((entry) => entry.story);

    for (const story of stories) expect(story.length).toBeGreaterThan(40);
    expect(new Set(stories).size).toBe(stories.length);
  });
});
