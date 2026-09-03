const PREFIX = 'reve:envelope-opened:';

/**
 * Whether this guest has already opened this invitation's envelope.
 *
 * Storage access is guarded because Safari private browsing throws on access.
 * Failing closed means the envelope simply replays, which is far better than
 * a crash on the one page that must never fail to load.
 */
export function hasOpened(slug: string): boolean {
  try {
    return window.localStorage.getItem(`${PREFIX}${slug}`) === '1';
  } catch {
    return false;
  }
}

export function markOpened(slug: string): void {
  try {
    window.localStorage.setItem(`${PREFIX}${slug}`, '1');
  } catch {
    // Storage unavailable (private browsing). The envelope simply replays.
  }
}
