import { describe, expect, it } from 'vitest';
import { CONTACT, whatsappChat, whatsappLink } from '@/lib/contact';

describe('whatsappLink', () => {
  it('builds a wa.me link for the business number', () => {
    expect(whatsappLink('Hello')).toBe('https://wa.me/96176753145?text=Hello');
  });

  it('encodes spaces and punctuation so the message survives', () => {
    const link = whatsappLink('Hi Rêve, order RV-0412 — is it ready?');
    expect(link).toContain('RV-0412');
    expect(link).not.toContain(' ');
  });

  it('round-trips the message through decoding', () => {
    const message = 'Order RV-0412 · Cap Blanc · 12 June 2027';
    const encoded = whatsappLink(message).split('?text=')[1];
    expect(decodeURIComponent(encoded)).toBe(message);
  });

  it('exposes a bare E.164 number with no punctuation', () => {
    expect(CONTACT.whatsappE164).toMatch(/^\d+$/);
  });
});

describe('whatsappChat', () => {
  it('opens a chat with the digits of an international number', () => {
    expect(whatsappChat('+961 70 123 456')).toBe('https://wa.me/96170123456');
    expect(whatsappChat('00961 70 123 456')).toBe('https://wa.me/96170123456');
  });

  it('gives nothing for a number too short to dial', () => {
    expect(whatsappChat('123')).toBeNull();
  });
});
