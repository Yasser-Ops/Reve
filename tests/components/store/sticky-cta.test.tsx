import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOSING_ATTRIBUTE, StickyCta } from '@/components/store/StickyCta';

/**
 * The bar's whole contract is when it is and is not on screen, and both
 * answers come from IntersectionObserver — which jsdom does not implement. The
 * stub records every observer the component creates and lets a test drive the
 * callbacks, so the rules can be exercised without a real viewport.
 */
type Trigger = (entries: { target: Element; isIntersecting: boolean }[]) => void;

const observers: { trigger: Trigger; targets: Element[] }[] = [];

beforeEach(() => {
  observers.length = 0;

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      targets: Element[] = [];

      constructor(callback: Trigger) {
        observers.push({
          targets: this.targets,
          trigger: (entries) => callback(entries),
        });
      }

      observe(node: Element) {
        this.targets.push(node);
      }

      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderBar() {
  return render(
    <StickyCta href="/collection" label="See the collection" message="Hello" />,
  );
}

/*
 * The bar's own element.
 *
 * Found by its WhatsApp link's href rather than by role: hidden, the bar is
 * `inert` and `aria-hidden`, so every control inside it is correctly absent
 * from the accessibility tree and no role query can reach it. That absence is
 * the behaviour under test, so the query cannot depend on it.
 */
function bar() {
  const link = document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
  return link?.closest('div')?.parentElement as HTMLElement;
}

/* The hero sentinel is the first thing observed; closing regions come second. */
function scrollPastHero() {
  act(() => {
    observers[0].trigger([
      { target: observers[0].targets[0], isIntersecting: false },
    ]);
  });
}

describe('StickyCta', () => {
  it('stays hidden while the hero is still on screen', () => {
    renderBar();

    expect(bar()).toHaveClass('translate-y-full');
    expect(bar()).toHaveAttribute('aria-hidden', 'true');
  });

  it('rises once the hero has scrolled away', () => {
    renderBar();
    scrollPastHero();

    expect(bar()).toHaveClass('translate-y-0');
    expect(bar()).toHaveAttribute('aria-hidden', 'false');
  });

  /* Hidden, it must be unreachable: a bar translated off screen still holds
     its links in the tab order without this, so a keyboard reader tabs into a
     control they cannot see. */
  it('is inert while hidden and interactive once shown', () => {
    renderBar();
    expect(bar()).toHaveAttribute('inert');

    scrollPastHero();
    expect(bar()).not.toHaveAttribute('inert');
  });

  it('stands down again when a closing region comes into view', () => {
    const closing = document.createElement('section');
    closing.setAttribute(CLOSING_ATTRIBUTE, '');
    document.body.appendChild(closing);

    renderBar();
    scrollPastHero();
    expect(bar()).toHaveClass('translate-y-0');

    act(() => {
      observers[1].trigger([{ target: closing, isIntersecting: true }]);
    });
    expect(bar()).toHaveClass('translate-y-full');

    /* And returns when the reader scrolls back up off it. */
    act(() => {
      observers[1].trigger([{ target: closing, isIntersecting: false }]);
    });
    expect(bar()).toHaveClass('translate-y-0');

    closing.remove();
  });

  /* Two regions are marked on the home page — the closing band and the footer
     — and they overlap on a tall screen. Tracking them as a set rather than a
     boolean means the second leaving does not un-hide the bar while the first
     is still on screen. */
  it('stays down while any one of several closing regions is visible', () => {
    const band = document.createElement('section');
    const footer = document.createElement('footer');
    for (const node of [band, footer]) {
      node.setAttribute(CLOSING_ATTRIBUTE, '');
      document.body.appendChild(node);
    }

    renderBar();
    scrollPastHero();

    act(() => {
      observers[1].trigger([
        { target: band, isIntersecting: true },
        { target: footer, isIntersecting: true },
      ]);
    });
    expect(bar()).toHaveClass('translate-y-full');

    act(() => {
      observers[1].trigger([{ target: band, isIntersecting: false }]);
    });
    expect(bar(), 'footer is still on screen').toHaveClass('translate-y-full');

    act(() => {
      observers[1].trigger([{ target: footer, isIntersecting: false }]);
    });
    expect(bar()).toHaveClass('translate-y-0');

    band.remove();
    footer.remove();
  });
});
