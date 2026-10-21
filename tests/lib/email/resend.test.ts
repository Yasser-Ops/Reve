import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { RESEND_API_KEY: 're_test_key' } }));

import { EMAIL_FROM, EmailSendError, sendEmail } from '@/lib/email/resend';

const MESSAGE = { to: 'maya@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' };

describe('sendEmail', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the message to Resend from the studio address, uncached', async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"e1"}', { status: 200 }));

    await sendEmail(MESSAGE);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' });
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    expect(JSON.parse(init.body)).toEqual({
      from: EMAIL_FROM,
      to: ['maya@example.com'],
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
    expect(EMAIL_FROM).toBe('Rêve <studio@reveinvitations.com>');
  });

  it('throws a rate-limited error on 429', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response('slow down', { status: 429 }));
    await expect(sendEmail(MESSAGE)).rejects.toMatchObject({
      reason: 'rate-limited',
      status: 429,
    });
  });

  it('throws a refused error on any other failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response('bad domain', { status: 403 }));
    const error = await sendEmail(MESSAGE).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(EmailSendError);
    expect(error).toMatchObject({ reason: 'refused', status: 403 });
  });
});
