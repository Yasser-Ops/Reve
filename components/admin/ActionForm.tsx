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
  /** Called after the action reports success, e.g. to close a dialog. */
  onSuccess?: () => void;
  /** Holds the submit button shut, e.g. while publishing would be refused. */
  disabled?: boolean;
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
  onSuccess,
  disabled,
  children,
}: ActionFormProps) {
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.ok) onSuccess?.();
      return next;
    },
    null,
  );

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
      <Button disabled={pending || disabled} type="submit" variant={variant}>
        {pending ? (pendingLabel ?? submitLabel) : submitLabel}
      </Button>
    </form>
  );
}
