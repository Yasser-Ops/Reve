'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/lib/admin/action-result';
import { PORTAL_MESSAGES } from '@/lib/auth/messages';
import { requestReset } from '@/lib/auth/portal-actions';
import { ROUTES } from '@/lib/routes';

export function ForgotForm() {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    requestReset,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      {result?.ok ? (
        <Alert>
          <AlertDescription>
            {PORTAL_MESSAGES.RESET_LINK_SENT}
          </AlertDescription>
        </Alert>
      ) : null}
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>

      <Button disabled={pending} type="submit">
        {pending ? 'Sending' : 'Send reset link'}
      </Button>

      <Link
        className="text-center text-[13px] text-muted-foreground underline"
        href={ROUTES.PORTAL_LOGIN}
      >
        Back to sign in
      </Link>
    </form>
  );
}
