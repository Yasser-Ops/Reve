import type { ReactNode } from 'react';

/**
 * A phone silhouette for showing an invitation in the medium it is actually
 * opened in. Decorative chrome only — the content inside is the real thing.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <div className="rounded-[2.5rem] border border-taupe/60 bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgb(var(--reve-shadow-rgb)/0.6)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-bone">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-ink"
          />
          {children}
        </div>
      </div>
    </div>
  );
}
