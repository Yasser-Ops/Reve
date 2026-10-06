'use client';

import { useActionState, useState } from 'react';
import { FieldControl } from '@/components/admin/content-form/FieldControl';
import { PhoneFrame } from '@/components/store/PhoneFrame';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ActionResult } from '@/lib/admin/action-result';
import {
  parseContentText,
  pruneContent,
  type FormField,
  type MediaOptions,
} from '@/lib/admin/content-form';
import { saveContent } from '@/lib/admin/invitation-actions';

type ContentEditorProps = {
  invitationId: string;
  fields: FormField[];
  initial: Record<string, unknown>;
  media: MediaOptions;
  previewUrl: string;
};

type Mode = 'form' | 'json';

/**
 * The design's fields on the left, the real invitation on the right. Both
 * tabs edit one value; saving sends it through the same server check as
 * before. The preview reloads after each successful save, so it shows
 * exactly what was stored.
 */
export function ContentEditor({
  invitationId,
  fields,
  initial,
  media,
  previewUrl,
}: ContentEditorProps) {
  const [value, setValue] = useState<Record<string, unknown>>(initial);
  const [mode, setMode] = useState<Mode>('form');
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [result, run, pending] = useActionState<ActionResult | null, FormData>(
    async (previous, formData) => {
      const next = await saveContent(previous, formData);
      if (next.ok) setVersion((current) => current + 1);
      return next;
    },
    null,
  );

  const issues = new Map(
    (result && !result.ok ? (result.issues ?? []) : []).map((issue) => [issue.path, issue.message]),
  );
  const payload = mode === 'json' ? text : JSON.stringify(pruneContent(fields, value));

  function showJson() {
    setText(JSON.stringify(pruneContent(fields, value), null, 2));
    setParseError(null);
    setMode('json');
  }

  /* Broken JSON keeps you on the JSON tab with the reason; nothing typed is lost. */
  function showForm() {
    const parsed = parseContentText(text);
    if (!parsed.ok) {
      setParseError(parsed.message);
      return;
    }
    setValue(parsed.value);
    setParseError(null);
    setMode('form');
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_410px]">
      <form action={run} className="grid content-start gap-5">
        <input name="invitationId" type="hidden" value={invitationId} />
        <input name="content" type="hidden" value={payload} />

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-[22px]">Content</h2>
          <Button onClick={mode === 'form' ? showJson : showForm} type="button" variant="ghost">
            {mode === 'form' ? 'Advanced: edit JSON' : 'Back to the form'}
          </Button>
        </div>

        {mode === 'form' ? (
          <div className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6">
            {fields.map((field) => (
              <FieldControl
                field={field}
                issues={issues}
                key={field.key}
                media={media}
                onChange={(next) => setValue((current) => ({ ...current, [field.key]: next }))}
                path={field.key}
                value={value[field.key]}
              />
            ))}
          </div>
        ) : (
          <Textarea
            aria-label="Invitation content (JSON)"
            className="min-h-[560px] font-mono text-[13px]"
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            value={text}
          />
        )}

        {parseError ? (
          <Alert variant="destructive">
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        ) : null}
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

        <Button className="justify-self-start" disabled={pending} size="lg" type="submit">
          {pending ? 'Saving' : 'Save content'}
        </Button>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PhoneFrame maxWidth={410}>
          <iframe
            className="block h-[680px] w-full"
            key={version}
            src={previewUrl}
            title="Invitation preview"
          />
        </PhoneFrame>
      </div>
    </div>
  );
}
