'use client';

import { useActionState, useId, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionResult } from '@/lib/admin/action-result';
import { deleteClient } from '@/lib/admin/client-actions';
import { namesMatch } from '@/lib/admin/names';

function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

type DeleteClientDialogProps = {
  clientId: string;
  fullName: string;
  orders: number;
  invitations: number;
  /** A published invitation: the server refuses, so the dialog does not offer. */
  blocked: boolean;
};

/** Deleting is irreversible, so it asks for the client's name, typed out. */
export function DeleteClientDialog({
  clientId,
  fullName,
  orders,
  invitations,
  blocked,
}: DeleteClientDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    deleteClient,
    null,
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>Delete client</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {fullName}?</DialogTitle>
          <DialogDescription>
            {blocked
              ? 'One of their invitations is live. Unpublish it first, then delete the client.'
              : `This removes ${count(orders, 'order')}, ${count(invitations, 'invitation')} and every uploaded file. It cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {blocked ? null : (
          <form action={run} className="grid gap-3">
            <input name="clientId" type="hidden" value={clientId} />
            <Label htmlFor={inputId}>Type {fullName} to confirm</Label>
            <Input
              autoComplete="off"
              id={inputId}
              name="confirmName"
              onChange={(event) => setTyped(event.target.value)}
              value={typed}
            />
            {result && !result.ok ? (
              <Alert variant="destructive">
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Keep</DialogClose>
              <Button
                disabled={!namesMatch(typed, fullName) || pending}
                type="submit"
                variant="destructive"
              >
                {pending ? 'Deleting' : 'Delete for good'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
