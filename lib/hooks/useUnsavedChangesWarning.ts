'use client';

import { useEffect } from 'react';

export const UNSAVED_CHANGES_PROMPT = 'You have unsaved changes. Leave without saving?';

/**
 * While `dirty`, asks before the page is left: the browser's own prompt for a
 * reload, close or typed URL, and a confirm for an in-app link (Next's Link
 * navigates without unloading, so `beforeunload` never fires for it).
 */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    /* Capture phase, before Link's own handler routes away. */
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return;
      if (!window.confirm(UNSAVED_CHANGES_PROMPT)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
