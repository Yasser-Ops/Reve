'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAdmin } from '@/lib/auth/actions';
import type { SignInResult } from '@/lib/auth/messages';

export function LoginForm({ notice }: { notice: string | null }) {
  const [result, action, pending] = useActionState<SignInResult | null, FormData>(
    signInAdmin,
    null,
  );
  const message = result?.message ?? notice;

  return (
    <form action={action} className="grid gap-4">
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
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
    </form>
  );
}
