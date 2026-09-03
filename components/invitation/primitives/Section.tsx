import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared vertical rhythm wrapper. Every invitation section composes this so
 * spacing stays consistent across templates without each one restating it.
 */
export function Section({ children, className }: SectionProps) {
  return (
    <section className={`px-6 py-20 md:py-28 ${className ?? ''}`}>
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </section>
  );
}
