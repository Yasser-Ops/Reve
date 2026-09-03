/**
 * A miniature of the real envelope, shown at rest on the marketing page.
 *
 * Deliberately static: the live article does the opening, and animating a
 * decorative copy above the fold would compete with the product it advertises.
 * Same geometry and palette as components/invitation/envelope.css so the page
 * promises exactly what a guest receives.
 */
export function HeroEnvelope({ initials = 'R' }: { initials?: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-3/2 w-full max-w-sm select-none"
    >
      <div className="absolute inset-0 rounded-md bg-sand shadow-[0_24px_50px_-24px_rgba(43,33,24,0.45)]" />

      <div className="absolute inset-x-[8%] bottom-[6%] h-[78%] rounded-sm bg-[#faf7f2]" />

      <div
        className="absolute inset-x-0 bottom-0 h-[58%] rounded-b-md bg-[#d9cdbd]"
        style={{ clipPath: 'polygon(0 0, 50% 42%, 100% 0, 100% 100%, 0 100%)' }}
      />

      <svg
        className="absolute inset-x-0 top-0 h-[62%] w-full"
        preserveAspectRatio="none"
        viewBox="0 0 300 124"
      >
        <path d="M0 0 H300 L150 124 Z" fill="#ded2c2" />
        <path d="M0 0 H300 L150 124 Z" fill="none" stroke="rgb(43 33 24 / 0.08)" />
      </svg>

      <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-wine text-bone shadow-[0_8px_20px_-8px_rgba(43,33,24,0.6)]">
        <span className="reve-display ps-[0.14em] text-lg tracking-[0.14em]">
          {initials}
        </span>
      </div>
    </div>
  );
}
