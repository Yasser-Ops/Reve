import { CONTACT, whatsappLink } from '@/lib/contact';
import type { EmailMessage } from '@/lib/email/resend';

/**
 * Rêve's own auth emails, in place of Supabase's defaults.
 *
 * Table layout and inline styles: mail clients strip <style> and ignore
 * flexbox, and Outlook still renders with Word. Colours are the storefront's
 * (app/globals.css), written out because no client resolves a CSS variable.
 * Every email also ships as plain text, which spam filters weigh and some
 * people read.
 */
const COLOURS = {
  bone: '#f6f1ea',
  sand: '#e4dace',
  cocoa: '#6b5844',
  ink: '#1c1c1e',
  wine: '#6f2233',
} as const;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** "Maya Khoury" greets as Maya; a missing or blank name gets no name. */
function greeting(fullName: string | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? `Hello ${first},` : 'Hello,';
}

type Layout = {
  preheader: string;
  heading: string;
  greeting: string;
  paragraphs: readonly string[];
  action: { label: string; url: string };
  footnote: string;
};

function render(layout: Layout): Pick<EmailMessage, 'html' | 'text'> {
  const url = escapeHtml(layout.action.url);
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLOURS.cocoa};">${escapeHtml(text)}</p>`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(layout.heading)}</title></head>
<body style="margin:0;padding:0;background:${COLOURS.bone};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(layout.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOURS.bone};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 0 28px;font-family:${SERIF};font-size:26px;letter-spacing:1px;color:${COLOURS.ink};">Rêve</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${COLOURS.sand};border-radius:16px;padding:36px 32px;">
<h1 style="margin:0 0 20px;font-family:${SERIF};font-size:24px;font-weight:normal;line-height:1.3;color:${COLOURS.ink};">${escapeHtml(layout.heading)}</h1>
${paragraph(layout.greeting)}
${layout.paragraphs.map(paragraph).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr>
<td style="border-radius:999px;background:${COLOURS.wine};">
<a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${COLOURS.bone};text-decoration:none;">${escapeHtml(layout.action.label)}</a>
</td></tr></table>
<p style="margin:0 0 8px;font-family:${SANS};font-size:12.5px;line-height:1.6;color:${COLOURS.cocoa};">If the button does not open, copy this link into your browser:</p>
<p style="margin:0 0 20px;font-family:${SANS};font-size:12.5px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:${COLOURS.wine};">${url}</a></p>
<p style="margin:0;font-family:${SANS};font-size:12.5px;line-height:1.6;color:${COLOURS.cocoa};">${escapeHtml(layout.footnote)}</p>
</td></tr>
<tr><td style="padding:24px 8px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${COLOURS.cocoa};">
Digital invitations, designed by hand in Lebanon.<br>
Questions? <a href="${escapeHtml(whatsappLink('Hello Rêve, I have a question about my portal.'))}" style="color:${COLOURS.wine};">WhatsApp ${escapeHtml(CONTACT.whatsappNumber)}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    layout.heading,
    '',
    layout.greeting,
    '',
    ...layout.paragraphs.flatMap((p) => [p, '']),
    `${layout.action.label}: ${layout.action.url}`,
    '',
    layout.footnote,
    '',
    '-- ',
    'Rêve. Digital invitations, designed by hand in Lebanon.',
    `WhatsApp ${CONTACT.whatsappNumber}`,
  ].join('\n');

  return { html, text };
}

/** The invite, and the re-sent invite: both open the welcome step. */
export function inviteEmail(input: { to: string; name?: string; url: string }): EmailMessage {
  const heading = 'Your Rêve portal is ready';
  return {
    to: input.to,
    subject: heading,
    ...render({
      preheader: 'Choose a password to see your invitation before anyone else does.',
      heading,
      greeting: greeting(input.name),
      paragraphs: [
        'Your invitation is in our hands, and your private portal is ready. It is where you review the invitation before anyone else sees it, approve it or ask for changes, and follow your guests’ replies.',
        'Open it below and choose a password to get started.',
      ],
      action: { label: 'Open my portal', url: input.url },
      footnote:
        'The link works once and expires after a while. If it has, message us and we will send a new one.',
    }),
  };
}

export function resetEmail(input: { to: string; url: string }): EmailMessage {
  const heading = 'Choose a new password';
  return {
    to: input.to,
    subject: 'Reset your Rêve password',
    ...render({
      preheader: 'A link to choose a new password for your Rêve portal.',
      heading,
      greeting: greeting(undefined),
      paragraphs: [
        'Someone asked to reset the password for your Rêve portal. If it was you, choose a new one below.',
      ],
      action: { label: 'Choose a new password', url: input.url },
      footnote:
        'If you did not ask for this, ignore this email. Your password stays as it is, and the link expires on its own.',
    }),
  };
}
