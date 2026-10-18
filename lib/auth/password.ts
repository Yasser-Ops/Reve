import { z } from 'zod';
import { PASSWORD_MESSAGES, PASSWORD_RULES } from '@/lib/auth/messages';

/** The one rule set for any new password, so admin and portal cannot drift. */
export function passwordSchema(email: string): z.ZodString {
  return z
    .string()
    .min(PASSWORD_RULES.MIN, PASSWORD_MESSAGES.TOO_SHORT)
    .max(PASSWORD_RULES.MAX, PASSWORD_MESSAGES.TOO_LONG)
    .refine(
      (password) => password.toLowerCase() !== email.toLowerCase(),
      PASSWORD_MESSAGES.SAME_AS_EMAIL,
    );
}
