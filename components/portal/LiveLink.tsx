'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const COPIED_MS = 2000;

/** The address guests open, to copy or send on. */
export function LiveLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* Clipboard blocked: the field is selectable, so the link is still within reach. */
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Input
          aria-label="Your invitation link"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          value={url}
        />
        <Button onClick={copy} type="button" variant="outline">
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <a
        className={buttonVariants({ variant: 'outline', className: 'justify-self-start' })}
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        rel="noreferrer"
        target="_blank"
      >
        Share on WhatsApp
      </a>
    </div>
  );
}
