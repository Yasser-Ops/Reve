'use client';

import { useEffect, useRef, useState } from 'react';
import {
  frameAt,
  frameSources,
  frameSrc,
  type EnvelopeFrames,
} from '@/lib/envelopes';

type FrameSequenceProps = {
  frames: EnvelopeFrames;
  /** Advance through the sequence. While false, frame 1 holds. */
  playing: boolean;
  /** Fired once the last frame has been painted. */
  onFinished?: () => void;
  /** Fired once every frame is decoded and playback can run without stalling. */
  onReady?: () => void;
};

/**
 * Plays a rendered envelope opening as numbered stills.
 *
 * ALL FRAMES ARE DECODED BEFORE PLAYBACK IS ALLOWED. A sequence that fetches
 * as it plays stutters partway through the opening, which is the single worst
 * moment in the product for a hitch — the guest is watching the one thing they
 * will remember. `onReady` fires when the wait is over and the seal can go
 * live; frame 1 paints immediately regardless, so the gate shows a sealed
 * envelope rather than an empty rectangle while the rest arrives.
 *
 * Frames advance on rAF against a wall clock rather than one-per-tick, so a
 * dropped frame skips ahead instead of stretching the opening. The authored
 * timing comes from the spec and is not adjusted here — including a `tail`
 * rate, where the closing phase plays slower than the opening one.
 *
 * A single <img> whose src is swapped, not a stack of stacked images: every
 * frame is already decoded, so the swap is a paint with no fetch behind it.
 */
export function FrameSequence({
  frames,
  playing,
  onFinished,
  onReady,
}: FrameSequenceProps) {
  const [index, setIndex] = useState(1);
  const finished = useRef(false);

  /* Decode every frame up front. Aborts on unmount so a gate that is torn
     down mid-preload does not call back into a dead component. */
  useEffect(() => {
    let cancelled = false;

    Promise.all(
      frameSources(frames).map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            /* Resolve on error too: one missing frame should show a gap in the
               animation, never hang the seal forever. */
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => {
      if (!cancelled) onReady?.();
    });

    return () => {
      cancelled = true;
    };
  }, [frames, onReady]);

  useEffect(() => {
    if (!playing || finished.current) return;

    /* A one-frame sequence has nothing to advance through: it is a still being
       held, not an animation. Bailing here keeps `index` on frame 1 instead of
       letting the first tick satisfy `frame >= count` and report finished
       before anything has painted. The gate's own timer still runs, so the
       ceremony holds for its duration either way. */
    if (frames.count <= 1) return;

    const started = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - started;
      /* `frameAt` rather than elapsed x fps: a sequence may play its tail at a
         slower rate than its head, and that arithmetic belongs with the spec
         that declares it. */
      const frame = frameAt(frames, elapsed);

      if (frame >= frames.count) {
        setIndex(frames.count);
        finished.current = true;
        onFinished?.();
        return;
      }

      setIndex(frame);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames, onFinished]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- one <img> whose src
       is swapped per frame; next/image would remount and refetch on each. */
    <img
      alt=""
      aria-hidden
      className="envelope-frame"
      draggable={false}
      src={frameSrc(frames, index)}
    />
  );
}
