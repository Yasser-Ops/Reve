'use client';

import type { ReactNode } from 'react';

/**
 * The list's GET form. A select applies as soon as it changes; the search box
 * still waits for Enter, so typing does not navigate on every key. Without
 * JavaScript it is an ordinary form.
 */
export function AutoSubmitForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      method="get"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
