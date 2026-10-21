'use client';

import { createContext, useContext } from 'react';

/**
 * Whether the guest has tapped the seal.
 *
 * Heavy media inside the invitation waits for this, so it never competes with
 * the envelope's own frames for the connection while the seal is loading.
 * True without a gate (previews, catalogue pages): nothing there to wait for.
 */
export const EnvelopeReleasedContext = createContext(true);

export function useEnvelopeReleased(): boolean {
  return useContext(EnvelopeReleasedContext);
}
