'use client';

import { useActionState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ActionResult, FormAction } from '@/lib/admin/action-result';

type ActionFormProps = {
  action: FormAction;
  submitLabel: string;
  pendingLabel?: string;
  successMessage?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  className?: string;
  children?: ReactNode;
};

/**
 * The one client island every admin form shares. The fields are server-
 * rendered children; this owns only the pending state and the result line.
 */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  successMessage,
  variant,
  className,
  children,
}: ActionFormProps) {
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={run} className={className ?? 'grid gap-3'}>
      {children}
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}
      {result?.ok && successMessage ? (
        <p className="text-muted-foreground">{successMessage}</p>
      ) : null}
      <Button disabled={pending} type="submit" variant={variant}>
        {pending ? (pendingLabel ?? submitLabel) : submitLabel}
      </Button>
    </form>
  );
}
