'use client';

import { useEnvelopeReleased } from './envelope-context';

type HeroVideoProps = {
  src: string;
  className?: string;
};

/**
 * A muted, looping hero video that starts downloading only once the envelope
 * is opening.
 *
 * Behind a sealed envelope it would pull megabytes the guest cannot see yet,
 * on the same connection the envelope frames need before the seal can go live.
 * Starting it at the tap still gives it the whole opening to buffer.
 */
export function HeroVideo({ src, className }: HeroVideoProps) {
  const released = useEnvelopeReleased();

  return (
    <video
      autoPlay
      className={className}
      loop
      muted
      playsInline
      preload={released ? 'auto' : 'none'}
      src={released ? src : undefined}
    />
  );
}
