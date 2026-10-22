import { describe, expect, it } from 'vitest';
import { withRef } from '@/components/store/WhatsappRef';
import { whatsappLink } from '@/lib/contact';

const text = (href: string) => new URL(href).searchParams.get('text');

describe('withRef', () => {
  const link = whatsappLink("Hello Rêve, I'd like to create a wedding invitation.");

  it('appends the referring wedding to the message', () => {
    expect(text(withRef(link, 'sarah-and-amine'))).toBe(
      "Hello Rêve, I'd like to create a wedding invitation.\n\n(ref: sarah-and-amine)",
    );
  });

  it('leaves the link alone without a ref', () => {
    expect(withRef(link, null)).toBe(link);
  });

  /* The value lands in a message the owner reads: only a plain slug passes. */
  it('drops anything that is not a slug', () => {
    expect(withRef(link, 'Free <b>money</b>')).toBe(link);
    expect(withRef(link, 'a'.repeat(80))).toBe(link);
  });

  it('does not stack the ref on a second click', () => {
    const once = withRef(link, 'sarah-and-amine');
    expect(withRef(once, 'sarah-and-amine')).toBe(once);
  });
});

/* Some WhatsApp clients print "+" literally, so spaces stay %20 as
   whatsappLink writes them. */
it('encodes spaces the way whatsappLink does', () => {
  const href = withRef(whatsappLink('Hello Rêve'), 'sarah-and-amine');
  expect(href).not.toContain('+');
  expect(href).toContain('Hello%20R');
});
