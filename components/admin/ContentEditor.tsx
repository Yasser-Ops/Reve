'use client';

import { useActionState, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/lib/admin/action-result';
import { saveContent } from '@/lib/admin/invitation-actions';

type ContentEditorProps = {
  invitationId: string;
  initial: string;
  previewUrl: string;
};

/**
 * JSON on the left, the real invitation on the right. The preview is an
 * iframe onto the bare draft route, reloaded after each successful save, so
 * it shows exactly what was stored.
 */
export function ContentEditor({ invitationId, initial, previewUrl }: ContentEditorProps) {
  const [text, setText] = useState(initial);
  const [version, setVersion] = useState(0);
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await saveContent(previous, formData);
      if (next.ok) setVersion((current) => current + 1);
      return next;
    },
    null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <form action={run} className="grid content-start gap-3">
        <input name="invitationId" type="hidden" value={invitationId} />
        <Textarea
          aria-label="Invitation content (JSON)"
          className="min-h-[560px] font-mono text-[13px]"
          name="content"
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          value={text}
        />
        {result && !result.ok ? (
          <Alert variant="destructive">
            <AlertDescription>
              {result.message}
              {result.issues?.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {result.issues.map((issue) => (
                    <li key={`${issue.path}:${issue.message}`}>
                      <code>{issue.path || '(whole document)'}</code>: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        {result?.ok ? <p className="text-muted-foreground">Saved.</p> : null}
        <Button disabled={pending} type="submit">
          {pending ? 'Saving' : 'Save content'}
        </Button>
      </form>

      <iframe
        className="h-[800px] w-[400px] rounded-xl border"
        key={version}
        src={previewUrl}
        title="Invitation preview"
      />
    </div>
  );
}
