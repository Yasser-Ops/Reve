'use client';

import { useEffect } from 'react';
import { CREDIT_CAMPAIGN_PARAM } from '@/components/invitation/ReveCredit';
import { WHATSAPP_HOST } from '@/lib/contact';

/* A slug, and nothing else: the value lands in a message the owner reads, so
   anything that is not plainly a slug is dropped rather than quoted. */
const REF_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** The message with the referring wedding appended, or unchanged. */
export function withRef(href: string, ref: string | null): string {
  if (!ref || !REF_PATTERN.test(ref)) return href;

  const url = new URL(href);
  const text = url.searchParams.get('text') ?? '';
  if (text.includes(`(ref: ${ref})`)) return href;

  /* Rebuilt by hand rather than through searchParams.set, which encodes
     spaces as "+": some WhatsApp clients print those literally. */
  return `${url.origin}${url.pathname}?text=${encodeURIComponent(`${text}\n\n(ref: ${ref})`)}`;
}

/**
 * Tags WhatsApp messages from visitors who arrived through an invitation.
 *
 * A guest who follows the credit at the foot of a couple's invitation lands
 * here with that wedding's slug in the URL. If they then message Rêve, the
 * pre-filled text ends with "(ref: <slug>)", so the sale itself, which happens
 * on WhatsApp where no analytics can see it, carries where it came from.
 * No cookie and no storage: it reads the current address at the moment of the
 * click, so it holds for the page the guest landed on.
 *
 * One delegated listener for every WhatsApp link, which keeps those links
 * server-rendered. It renders nothing.
 */
export function WhatsappRef() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>(
        `a[href^="https://${WHATSAPP_HOST}/"]`,
      );
      if (!link) return;

      const ref = new URLSearchParams(window.location.search).get(
        CREDIT_CAMPAIGN_PARAM,
      );
      link.href = withRef(link.href, ref);
    }

    /* Capture, so the href is rewritten before the browser follows it. */
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
