'use client';

import { useId, useRef, useState } from 'react';

export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * Accordion built from a button and a panel.
 *
 * Native <details> was the first choice, but its own show/hide of the content
 * runs independently of any height animation, which makes a smooth open
 * genuinely awkward to control. A button with aria-expanded plus a
 * grid-template-rows transition animates reliably, and carries the same
 * semantics for assistive technology.
 *
 * The 0fr to 1fr grid trick animates to the content's natural height without
 * measuring anything in JavaScript, so it stays correct when text reflows.
 */
function Disclosure({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <h3>
        <button
          aria-controls={panelId}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-start text-[15px] text-ink transition-colors hover:text-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          id={buttonId}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {item.question}
          <span
            aria-hidden="true"
            className={`reve-crisp shrink-0 text-[18px] leading-none transition-transform duration-300 ${
              open ? 'rotate-45 text-wine' : 'text-taupe'
            }`}
          >
            +
          </span>
        </button>
      </h3>

      <div
        aria-labelledby={buttonId}
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        id={panelId}
        ref={panelRef}
        role="region"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        {/* min-h-0 lets the 1fr row resolve to the content's height; without
            it the grid item keeps its automatic minimum and the row stays
            collapsed at 0px. */}
        <div className="min-h-0 overflow-hidden">
          <p
            className={`max-w-2xl pb-6 text-[14px] leading-relaxed text-cocoa transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-taupe/40 border-y border-taupe/40">
      {items.map((item) => (
        <Disclosure item={item} key={item.question} />
      ))}
    </div>
  );
}
