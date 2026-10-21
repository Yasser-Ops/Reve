import { describe, expect, it } from 'vitest';
import { inviteEmail, resetEmail } from '@/lib/email/templates';

const URL_WITH_QUERY =
  'https://reve.test/auth/confirm?token_hash=abc&type=invite&next=%2Fportal%2Fwelcome';

describe('inviteEmail', () => {
  it('greets the client by first name and carries the link in both parts', () => {
    const email = inviteEmail({ to: 'maya@example.com', name: 'Maya Khoury', url: URL_WITH_QUERY });

    expect(email.to).toBe('maya@example.com');
    expect(email.subject).toBe('Your Rêve portal is ready');
    expect(email.text).toContain('Hello Maya,');
    expect(email.text).toContain(URL_WITH_QUERY);
    /* In HTML the query's ampersands are escaped, as an attribute requires. */
    expect(email.html).toContain(URL_WITH_QUERY.replaceAll('&', '&amp;'));
  });

  it('falls back to a plain greeting without a name', () => {
    expect(inviteEmail({ to: 'a@b.co', name: '  ', url: URL_WITH_QUERY }).text).toContain(
      'Hello,',
    );
  });

  /* The name is typed by the operator from a client's message: it is text,
     never markup. */
  it('escapes the name into the HTML', () => {
    const email = inviteEmail({ to: 'a@b.co', name: '<b>Maya</b>', url: URL_WITH_QUERY });
    expect(email.html).not.toContain('<b>Maya');
    expect(email.html).toContain('&lt;b&gt;Maya');
  });
});

describe('resetEmail', () => {
  it('carries the link and tells someone who did not ask to ignore it', () => {
    const email = resetEmail({ to: 'maya@example.com', url: URL_WITH_QUERY });

    expect(email.subject).toBe('Reset your Rêve password');
    expect(email.text).toContain(URL_WITH_QUERY);
    expect(email.text).toContain('If you did not ask for this, ignore this email.');
  });
});
