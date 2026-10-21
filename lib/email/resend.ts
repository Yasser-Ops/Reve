import 'server-only';
import { env } from '@/lib/env';

/**
 * The one place Rêve sends email from.
 *
 * Plain fetch to Resend's REST API rather than its SDK: one endpoint, one
 * call shape, and nothing to keep in step. `no-store` because a Server
 * Action's fetch to an external API is otherwise cached.
 */
const RESEND_URL = 'https://api.resend.com/emails';

/** Must sit on the domain verified in Resend, or every send is refused. */
export const EMAIL_FROM = 'Rêve <studio@reveinvitations.com>';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Why a send failed, for the caller to word: `rate-limited` is worth retrying. */
export class EmailSendError extends Error {
  constructor(
    readonly status: number,
    readonly reason: 'rate-limited' | 'refused',
  ) {
    super(`Resend refused the email (${status})`);
  }
}

const TOO_MANY_REQUESTS = 429;

export async function sendEmail(message: EmailMessage): Promise<void> {
  const response = await fetch(RESEND_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    console.error('Resend send failed', response.status, await response.text().catch(() => ''));
    throw new EmailSendError(
      response.status,
      response.status === TOO_MANY_REQUESTS ? 'rate-limited' : 'refused',
    );
  }
}
