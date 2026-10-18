import type { CSSProperties } from 'react';

/*
 * THE FIRST SCREEN IS THE SCREEN THE INVITATION IS SHOWN ON, NOT THE WINDOW.
 *
 * A template's hero fills one screen. On a guest's phone that is the viewport
 * (`100dvh`), but a template also renders scaled inside the store's phone, the
 * collection thumbnails and the homepage comparison, where `dvh` still means
 * the BROWSER window: resize the window and the hero grew past the phone's
 * screen or stopped short of it. Every scaled container therefore declares the
 * height of its own screen, in the template's unscaled pixels, and templates
 * size their first screen from this variable instead of the viewport.
 */
const SCREEN_HEIGHT_VAR = '--invitation-screen-h';

/** One screen of the invitation: the container's, or the viewport's. */
export const SCREEN_HEIGHT = `var(${SCREEN_HEIGHT_VAR}, 100dvh)`;

/** A share of one screen, e.g. `screenShare(0.52)`. */
export function screenShare(fraction: number): string {
  return `calc(${SCREEN_HEIGHT} * ${fraction})`;
}

/**
 * Set on the element a template renders inside when it is drawn at
 * `width` pixels and shown through a screen of `aspect` (width / height).
 */
export function screenFor(width: number, aspect: number): CSSProperties {
  return { [SCREEN_HEIGHT_VAR]: `${width / aspect}px` } as CSSProperties;
}
