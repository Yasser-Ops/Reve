import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The small tracked capitals the storefront uses over a heading ("GUEST LIST"). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] uppercase tracking-[0.2em] text-muted-foreground', className)}>
      {children}
    </p>
  );
}
