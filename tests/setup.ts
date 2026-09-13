import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `next/font` is a build-time transform: outside `next build` the loaders are
// undefined, so any module that declares a face throws on import. Templates
// art-direct their own faces, which puts a font import behind the registry —
// and therefore behind most component tests. The stub returns the same shape
// the real loader does.
// Named one by one rather than via a Proxy: Vitest checks each import against
// the mock's own keys, so a catch-all get() trap still reports the export as
// missing. A face added to a template must be added here too.
vi.mock('next/font/google', () => {
  const face = () => ({
    className: 'mock-font',
    variable: 'mock-font-variable',
    style: { fontFamily: 'mock-font' },
  });

  return {
    Caveat: face,
    Cormorant_Garamond: face,
    Geist: face,
    Marcellus: face,
  };
});

// Testing Library only auto-cleans when Vitest runs with `globals: true`.
// This project keeps globals off and unmounts explicitly instead, so renders
// from one test cannot leak into the next.
afterEach(() => {
  cleanup();
});

// jsdom fetches nothing, so an `new Image()` never fires `onload` or `onerror`
// and `FrameSequence`'s preload would hang forever — leaving the seal disabled
// and every envelope test timing out on a button it can never click.
//
// Resolving on the next microtask instead keeps the REAL behaviour under test:
// the seal is inert until the frames report ready, and then it is not. A stub
// that skipped the gating entirely would let a regression through.
class LoadedImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  #src = '';

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }
}

vi.stubGlobal('Image', LoadedImage);

// jsdom implements no media queries at all, and `EnvelopeGate` asks for
// `prefers-reduced-motion` to decide whether to play its rendered opening.
// Answering "no preference" is the right default: it exercises the full
// ceremony rather than the reduced-motion shortcut.
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}));
