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

/**
 * A wa.me chat with a client, from the number as it was typed. A leading 00
 * is the international prefix; wa.me wants the digits alone.
 */
export function whatsappChat(phone: string): string | null {
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
