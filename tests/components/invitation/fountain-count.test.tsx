import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FountainCount } from '@/components/invitation/templates/jardin/FountainCount';

/**
 * The countdown's LAYOUT, which is what broke and is invisible in a diff.
 *
 * Every failure here shipped looking like valid markup: an SVG that stretched
 * to its container because `h-auto` does not resolve a height for an
 * absolutely-positioned element, a row of numerals offset against a curve an
 * ellipse does not have, and an ornament wide enough to strike through the
 * labels it sat under. A test that asserts the ornament renders catches none
 * of them, so these assert its relationship to the row instead.
 */
function renderCount() {
  /* Far enough out that the countdown never resolves to `hasPassed` and
     returns null, which would empty the tree and pass every assertion
     vacuously. */
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  return render(<FountainCount eventDate={future} ink="#3a2a2d" />);
}

describe('FountainCount', () => {
  /*
   * THE ORNAMENT IS A PLATE, and it hangs BELOW the row.
   *
   * Three drawn arrangements failed before this — a basin that read as a
   * strike-through, then as a stray oval, then a vector swag too thin to
   * carry at size. What survived is a painted garland keyed to transparency.
   *
   * The one invariant worth pinning is that it stays out of the text: it is
   * absolutely positioned at the container's bottom, and the row reserves
   * space below itself rather than centring in the same box. A plate that
   * drifts back over the labels is the regression this catches.
   */
  it('hangs the painted garland below the row', () => {
    const { container } = renderCount();
    const img = container.querySelector('img');

    expect(img).toHaveAttribute('src');
    expect(img?.getAttribute('src')).toContain('garland');
    expect(img).toHaveClass('absolute', 'bottom-0');

    /* Decorative: it carries no meaning the labels do not already give. */
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden');
  });

  it('reserves space under the row for it', () => {
    const { container } = renderCount();

    /* The CONTAINER reserves the plate's measured height (83px at phone
       width), which is what keeps the roses off the labels. Reserving a drawn
       swag's 40px instead let them ride up over the text. */
    expect(container.firstElementChild).toHaveClass('relative', 'pb-24');
  });

  /*
   * ONE BASELINE, no per-item offset.
   *
   * Two arrangements shipped before this and both read as four numbers that
   * failed to line up: the outer pair dropped 10px to follow a curve an
   * ellipse does not have, then the inner pair dropped 6px to follow the one
   * it does. The second was right about the geometry and wrong about the
   * premise — this basin is too shallow at rendered size for a 6px step to
   * read as anything but error. The drawn ellipse already places the row in
   * the basin.
   */
  it('sets the numerals on one baseline', () => {
    const { container } = renderCount();
    const items = [...container.querySelectorAll('li')];

    expect(items).toHaveLength(4);

    for (const item of items) {
      expect(item.getAttribute('style') ?? '').not.toMatch(/translateY/);
    }
  });
});
