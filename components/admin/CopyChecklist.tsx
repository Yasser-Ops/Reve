'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** The design's "what we need from you", ready to paste into WhatsApp. */
export function CopyChecklist({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      onClick={async () => {
        await navigator.clipboard.writeText(message);
        setCopied(true);
      }}
      type="button"
      variant="outline"
    >
      {copied ? 'Copied' : 'Copy what we need'}
    </Button>
  );
}
