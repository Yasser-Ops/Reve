import type { ReactNode } from 'react';

/**
 * The attribute that switches shadcn's tokens and base styles on. Wraps admin
 * UI only: the draft preview renders a design and must not inherit them.
 */
export function AppSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-dvh text-[14px]"
      data-surface="app"
      style={{ WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility' }}
    >
      {children}
    </div>
  );
}
