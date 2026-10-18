import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh, channel, removeChannel } = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return { refresh: vi.fn(), channel, removeChannel: vi.fn() };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ channel: () => channel, removeChannel }),
}));

import { LIVE_TABLE, LiveRefresh } from '@/components/LiveRefresh';

const DEBOUNCE = 500;
const THROTTLE = 5000;

function fire() {
  const handler = channel.on.mock.calls[0]?.[2] as () => void;
  act(() => handler());
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
}

function show() {
  setVisibility('visible');
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('LiveRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    refresh.mockClear();
    removeChannel.mockClear();
    channel.on.mockClear();
    channel.subscribe.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible');
  });

  it('subscribes to INSERT and UPDATE on each table', () => {
    render(<LiveRefresh tables={[LIVE_TABLE.REVIEWS, LIVE_TABLE.ORDERS]} />);
    expect(channel.on).toHaveBeenCalledTimes(4);
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('refreshes once after the debounce', () => {
    render(<LiveRefresh tables={[LIVE_TABLE.REVIEWS]} />);
    fire();
    act(() => vi.advanceTimersByTime(DEBOUNCE - 1));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('collapses a burst into one refresh', () => {
    render(<LiveRefresh tables={[LIVE_TABLE.REVIEWS]} />);
    fire();
    act(() => vi.advanceTimersByTime(200));
    fire();
    act(() => vi.advanceTimersByTime(200));
    fire();
    act(() => vi.advanceTimersByTime(DEBOUNCE));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the tab becomes visible, at most once per throttle window', () => {
    render(<LiveRefresh tables={[LIVE_TABLE.ORDERS]} />);
    show();
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(THROTTLE - 1));
    show();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('does not refresh while the tab is hidden', () => {
    render(<LiveRefresh tables={[LIVE_TABLE.ORDERS]} />);
    setVisibility('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('removes the channel, listeners and pending refresh on unmount', () => {
    const { unmount } = render(<LiveRefresh tables={[LIVE_TABLE.REVIEWS]} />);
    fire();
    unmount();
    expect(removeChannel).toHaveBeenCalledWith(channel);
    act(() => vi.advanceTimersByTime(DEBOUNCE));
    show();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
