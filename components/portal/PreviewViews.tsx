'use client';

import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { LiveInvitationDemo } from '@/components/store/LiveInvitationDemo';
import { defaultPreviewView, WIDE_VIEWPORT_QUERY } from '@/lib/portal/preview-view';
import { PREVIEW_VIEW, VIEW_PARAM, type PreviewView } from '@/lib/routes';

type PreviewViewsProps = {
  /** The view the URL chose, or null to follow the viewport. */
  requested: PreviewView | null;
  /** The server's guess at the viewport, from the user agent, for the first paint. */
  wideGuess: boolean;
  /** Which envelope opens over the invitation in the phone. */
  templateSlug: string;
  children: ReactNode;
};

/* Inline styles, like the review bar: this sits on the draft, outside
   AppSurface, where shadcn's tokens are absent. */
const WINE = '#6f2233';
const switcher: CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 70,
  display: 'flex',
  padding: 3,
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.94)',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1,
  WebkitFontSmoothing: 'antialiased',
  textRendering: 'optimizeLegibility',
};
const option = (on: boolean): CSSProperties => ({
  font: 'inherit',
  padding: '7px 12px',
  borderRadius: 999,
  border: 0,
  cursor: 'pointer',
  background: on ? WINE : 'transparent',
  color: on ? '#fff' : WINE,
});

const OPTIONS = [
  { view: PREVIEW_VIEW.PHONE, label: 'Phone' },
  { view: PREVIEW_VIEW.FULL, label: 'Full screen' },
] as const;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_VIEWPORT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * The client's draft, either inside the shared phone with the design's own
 * envelope (as on the design page) or filling the window. The draft itself is
 * rendered once on the server and handed in as children.
 *
 * The choice lives in `?view=` so a refresh keeps it. It is written with
 * `history.replaceState`, which Next folds into its router without a server
 * round trip, so switching never re-renders the review bar beside it. With no
 * choice in the URL, a viewport wider than a phone gets the phone and a phone
 * gets the full screen.
 */
export function PreviewViews({ requested, wideGuess, templateSlug, children }: PreviewViewsProps) {
  const [chosen, setChosen] = useState(requested);
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_VIEWPORT_QUERY).matches,
    () => wideGuess,
  );
  const view = chosen ?? defaultPreviewView(wide);

  function choose(next: PreviewView) {
    setChosen(next);
    const url = new URL(window.location.href);
    url.searchParams.set(VIEW_PARAM, next);
    window.history.replaceState(null, '', url);
  }

  return (
    <>
      <div aria-label="View" role="group" style={switcher}>
        {OPTIONS.map(({ view: value, label }) => (
          <button
            aria-pressed={view === value}
            key={value}
            onClick={() => choose(value)}
            style={option(view === value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {view === PREVIEW_VIEW.PHONE ? (
        <div className="grid min-h-dvh place-items-center bg-bone px-4 pb-10 pt-16">
          <LiveInvitationDemo envelope={templateSlug}>{children}</LiveInvitationDemo>
        </div>
      ) : (
        children
      )}
    </>
  );
}
