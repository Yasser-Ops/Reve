import { describe, expect, it } from 'vitest';
import { passwordSchema } from '@/lib/auth/password';
import { PASSWORD_MESSAGES } from '@/lib/auth/messages';

const schema = passwordSchema('a@b.co');

describe('passwordSchema', () => {
  it('7 characters is refused', () => {
    const result = schema.safeParse('1234567');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(PASSWORD_MESSAGES.TOO_SHORT);
  });

  it('73 characters is refused', () => {
    const result = schema.safeParse('x'.repeat(73));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(PASSWORD_MESSAGES.TOO_LONG);
  });

  it('the email itself is refused, any case', () => {
    const result = passwordSchema('abcd@b.co').safeParse('ABCD@B.CO');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(PASSWORD_MESSAGES.SAME_AS_EMAIL);
  });

  it('8 characters passes', () => {
    expect(schema.safeParse('12345678').success).toBe(true);
  });
});
