import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replace, setSession } = vi.hoisted(() => ({
  replace: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { setSession } }),
}));

import { SessionFromHash } from '@/app/auth/session/SessionFromHash';

const EXPIRED = '/portal/login?notice=link-expired';

describe('SessionFromHash', () => {
  beforeEach(() => {
    replace.mockReset();
    setSession.mockReset().mockResolvedValue({ error: null });
    window.history.replaceState(null, '', '/auth/session?next=%2Fportal%2Fwelcome');
  });

  it('a missing fragment goes to link-expired', async () => {
    render(<SessionFromHash next="/portal/welcome" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(EXPIRED));
    expect(setSession).not.toHaveBeenCalled();
  });

  it('a rejected setSession goes to link-expired', async () => {
    setSession.mockRejectedValue(new Error('network'));
    window.location.hash = '#access_token=a&refresh_token=r';
    render(<SessionFromHash next="/portal/welcome" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(EXPIRED));
  });

  it('a refused session goes to link-expired', async () => {
    setSession.mockResolvedValue({ error: new Error('bad') });
    window.location.hash = '#access_token=a&refresh_token=r';
    render(<SessionFromHash next="/portal/welcome" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(EXPIRED));
  });

  it('success replaces to the safe next', async () => {
    window.location.hash = '#access_token=a&refresh_token=r';
    render(<SessionFromHash next="/portal/welcome" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portal/welcome'));
    expect(setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
  });

  it('clears the hash before setSession is called', async () => {
    let hashAtCall: string | null = null;
    setSession.mockImplementation(async () => {
      hashAtCall = window.location.hash;
      return { error: null };
    });
    window.location.hash = '#access_token=a&refresh_token=r';
    render(<SessionFromHash next="/portal/welcome" />);
    await waitFor(() => expect(setSession).toHaveBeenCalled());
    expect(hashAtCall).toBe('');
  });

  it('under StrictMode reads the fragment once and navigates once', async () => {
    window.location.hash = '#access_token=a&refresh_token=r';
    render(
      <StrictMode>
        <SessionFromHash next="/portal/welcome" />
      </StrictMode>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portal/welcome'));
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
