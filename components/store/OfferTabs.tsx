'use client';

import { useState } from 'react';
import { HOW_IT_WORKS, OFFER_TIERS } from '@/lib/offer';

const TABS = {
  INCLUDES: 'includes',
  HOW: 'how',
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

/**
 * The two questions a couple asks before buying, answered in one place.
 *
 * Tabs rather than two stacked sections: both answers are short, and a couple
 * reads one or the other, not both. Every line comes from lib/offer.ts, so the
 * product page cannot promise something the pricing table prices differently.
 */
export function OfferTabs() {
  const [tab, setTab] = useState<Tab>(TABS.INCLUDES);

  return (
    <div>
      <div className="flex gap-2" role="tablist">
        <TabButton
          active={tab === TABS.INCLUDES}
          label="Includes"
          onSelect={() => setTab(TABS.INCLUDES)}
          panelId="offer-includes"
        />
        <TabButton
          active={tab === TABS.HOW}
          label="How it works"
          onSelect={() => setTab(TABS.HOW)}
          panelId="offer-how"
        />
      </div>

      {tab === TABS.INCLUDES ? (
        <ul
          aria-label="Includes"
          className="mt-8 space-y-3.5"
          id="offer-includes"
          role="tabpanel"
        >
          {/* Basic is what every design ships with, so it is the honest answer
              to "what do I get" without qualifying every line by tier. */}
          {OFFER_TIERS[0].includes.map((item) => (
            <li className="flex gap-3 text-[14.5px] text-cocoa" key={item}>
              <span aria-hidden="true" className="text-wine">
                ✓
              </span>
              {item}
            </li>
          ))}
          <li className="flex gap-3 text-[14.5px] text-cocoa">
            <span aria-hidden="true" className="text-wine">
              ✓
            </span>
            RSVP collection and a guest list, on Managed and above
          </li>
        </ul>
      ) : (
        <ol
          aria-label="How it works"
          className="mt-8 space-y-6"
          id="offer-how"
          role="tabpanel"
        >
          {HOW_IT_WORKS.map((step, index) => (
            <li className="flex gap-4" key={step.title}>
              <span className="reve-crisp mt-0.5 shrink-0 text-[12px] tabular-nums text-taupe">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <span className="block text-[15px] text-ink">{step.title}</span>
                <span className="mt-1 block text-[13.5px] leading-relaxed text-cocoa">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  onSelect,
  panelId,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
  panelId: string;
}) {
  return (
    <button
      aria-controls={panelId}
      aria-selected={active}
      className={`reve-crisp rounded-full border px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? 'border-wine text-wine'
          : 'border-transparent text-taupe hover:text-cocoa'
      }`}
      onClick={onSelect}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}
