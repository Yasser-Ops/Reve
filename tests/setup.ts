import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when Vitest runs with `globals: true`.
// This project keeps globals off and unmounts explicitly instead, so renders
// from one test cannot leak into the next.
afterEach(() => {
  cleanup();
});
