'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SignInResult } from '@/lib/auth/messages';
import { signInClient } from '@/lib/auth/portal-actions';
import { ROUTES } from '@/lib/routes';

export function LoginForm() {
  const [result, action, pending] = useActionState<SignInResult | null, FormData>(
    signInClient,
    null,
  );

  return (
    <form action={action} className="grid gap-4">
      {result ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      <Button disabled={pending} type="submit">
        {pending ? 'Signing in' : 'Sign in'}
      </Button>

      <Link
        className="text-center text-[13px] text-muted-foreground underline"
        href={ROUTES.PORTAL_FORGOT}
      >
        Forgot your password?
      </Link>
    </form>
  );
}
