/**
 * Jardin's painted arch, held still.
 *
 * ONE PAINTING, NOT THREE PLANES. This began as three transparent layers —
 * sky, colonnade, near foliage — moving at separate rates, which is the
 * textbook way to fake depth. The artwork that arrived is a single painted
 * plate, and it already HAS depth: the colonnade frames a path that recedes
 * to a terrace and hills. Cutting it into planes would mean inventing edges
 * the painter did not put there, and the seams would show on exactly the kind
 * of soft blossom that cannot be masked cleanly.
 *
 * IT NO LONGER MOVES AT ALL. The scene used to scale 16% toward the arch's
 * vanishing point and drift 90px down across the first screenful, tracking
 * whichever ancestor actually scrolled. Both were wrong on the stage that
 * matters most for selling the design: inside the storefront's phone
 * silhouette, one screenful is a short flick, so the full travel arrived in a
 * few hundred pixels of scroll — the plate growing and sliding under a bezel
 * that does not move with it, which reads as the phone itself zooming rather
 * than as depth.
 *
 * Removing the motion also removes the machinery: no scroll listener, no rAF
 * loop, no walking the ancestor chain to find a scroller, and no `'use
 * client'`. What is left is an image, which is what a painting whose
 * perspective is already the artist's wanted to be.
 *
 * `motion` is still accepted and still ignored, so the caller's theme contract
 * is unchanged and a future effect has somewhere to hang.
 */
export function GardenParallax({
  motion: _motion,
}: {
  motion: 'full' | 'reduced';
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative
          full-bleed plate, sized by CSS rather than by intrinsic box */}
      <img
        alt=""
        className="h-full w-full object-cover"
        src="/invitation/jardin/scene/arch.webp"
      />
    </div>
  );
}
