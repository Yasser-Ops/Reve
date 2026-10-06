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

  /* Final review: the operator types numbers the local way. */
  it('adds the Lebanese country code to a number typed the local way', () => {
    expect(whatsappChat('70 123 456')).toBe('https://wa.me/96170123456');
    expect(whatsappChat('03 123 456')).toBe('https://wa.me/9613123456');
    expect(whatsappChat('3 123 456')).toBe('https://wa.me/9613123456');
  });

  /* Second review: "+961 03 ..." keeps a trunk 0 Lebanese numbers drop. */
  it('drops the trunk 0 written after the country code', () => {
    expect(whatsappChat('+961 03 123 456')).toBe('https://wa.me/9613123456');
    expect(whatsappChat('00961 03 123 456')).toBe('https://wa.me/9613123456');
    expect(whatsappChat('961 03 123 456')).toBe('https://wa.me/9613123456');
  });

  it('leaves an international number from another country alone', () => {
    expect(whatsappChat('+33 6 12 34 56 78')).toBe('https://wa.me/33612345678');
  });

  it('gives nothing for a number too short to dial', () => {
    expect(whatsappChat('123')).toBeNull();
  });
});
