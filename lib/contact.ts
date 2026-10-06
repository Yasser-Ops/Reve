/**
 * Single source of truth for how Rêve is reached.
 *
 * The WhatsApp number is the business's real front door: order intake hands
 * off to it, every call to action falls back to it, and the footer lists it.
 * Keeping it here means changing the number is one edit, not a search.
 */
export const CONTACT = {
  whatsappNumber: '+961 76 753 145',
  /** E.164 without punctuation, as wa.me requires. */
  whatsappE164: '96176753145',
  instagramHandle: '@reve___lb',
  instagramUrl: 'https://www.instagram.com/reve___lb/',
} as const;

/**
 * A wa.me link carrying a prefilled message.
 *
 * Passing the order reference here is what makes the handoff feel deliberate
 * rather than dumping the customer into an empty chat.
 */
export function whatsappLink(message: string): string {
  return `https://wa.me/${CONTACT.whatsappE164}?text=${encodeURIComponent(message)}`;
}

/** Clients are in Lebanon unless their number says otherwise. */
const LOCAL_COUNTRY_CODE = '961';

/** A Lebanese number without its country code has at most this many digits. */
const LOCAL_NUMBER_MAX_DIGITS = 8;

/**
 * A wa.me chat with a client, from the number as it was typed. A leading 00
 * is the international prefix; wa.me wants the digits alone. A number typed
 * the local way ("70 123 456", "03 123 456") gets Lebanon's code, without the
 * trunk 0.
 */
export function whatsappChat(phone: string): string | null {
  let digits = phone.replace(/\D/g, '').replace(/^00/, '');
  const international = phone.trim().startsWith('+') || phone.trim().startsWith('00');

  if (!international && digits.startsWith('0')) {
    digits = LOCAL_COUNTRY_CODE + digits.slice(1);
  } else if (!international && digits.length <= LOCAL_NUMBER_MAX_DIGITS) {
    digits = LOCAL_COUNTRY_CODE + digits;
  }

  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}
