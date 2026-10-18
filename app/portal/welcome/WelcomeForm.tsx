'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/lib/admin/action-result';
import { PASSWORD_RULES } from '@/lib/auth/messages';
import { acceptInvite } from '@/lib/auth/portal-actions';

export function WelcomeForm() {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    acceptInvite,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="new-password"
          id="password"
          maxLength={PASSWORD_RULES.MAX}
          minLength={PASSWORD_RULES.MIN}
          name="password"
          required
          type="password"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm">Repeat the password</Label>
        <Input
          autoComplete="new-password"
          id="confirm"
          maxLength={PASSWORD_RULES.MAX}
          minLength={PASSWORD_RULES.MIN}
          name="confirm"
          required
          type="password"
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          className="mt-0.5 size-4 accent-foreground"
          id="terms"
          name="terms"
          required
          type="checkbox"
        />
        <Label className="font-normal leading-snug" htmlFor="terms">
          I accept the terms and confirm I am 18 or older.
        </Label>
      </div>

      <Button disabled={pending} type="submit">
        {pending ? 'Saving' : 'Open my portal'}
      </Button>
    </form>
  );
}
