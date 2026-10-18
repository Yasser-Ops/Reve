import type { ReactNode } from 'react';
import { PhoneShell } from '@/components/PhoneShell';

/* The homepage loop sits in a narrower column than the design page's demo. */
const DEFAULT_MAX_WIDTH = 280;

/**
 * The shared phone at the homepage's size, or at `maxWidth` where a caller
 * needs a wider one. The chrome itself lives in PhoneShell, so this is the
 * same device the design page shows.
 */
export function PhoneFrame({ children, maxWidth = DEFAULT_MAX_WIDTH }: { children: ReactNode; maxWidth?: number }) {
  return <PhoneShell maxWidth={maxWidth}>{children}</PhoneShell>;
}
