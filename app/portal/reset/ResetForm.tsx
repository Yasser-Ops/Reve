'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/lib/admin/action-result';
import { PASSWORD_RULES } from '@/lib/auth/messages';
import { setNewPassword } from '@/lib/auth/portal-actions';

export function ResetForm() {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    setNewPassword,
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
        <Label htmlFor="password">New password</Label>
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
        <Label htmlFor="confirm">Repeat the new password</Label>
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

      <Button disabled={pending} type="submit">
        {pending ? 'Saving' : 'Save password'}
      </Button>
    </form>
  );
}
