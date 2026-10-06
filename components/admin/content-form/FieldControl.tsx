'use client';

import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyValue,
  isRecord,
  isoToLocalInput,
  localInputToIso,
  type FormField,
  type MediaOptions,
} from '@/lib/admin/content-form';

type FieldControlProps = {
  field: FormField;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Dotted path, matching the server's issue paths ("venue.name", "schedule.0.time"). */
  path: string;
  issues: ReadonlyMap<string, string>;
  media: MediaOptions;
};

const asString = (value: unknown) => (typeof value === 'string' ? value : '');
const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

function Issue({ message }: { message: string | undefined }) {
  return message ? <p className="text-[12px] text-wine">{message}</p> : null;
}

function Fields({
  fields,
  value,
  onChange,
  path,
  issues,
  media,
}: Omit<FieldControlProps, 'field'> & { fields: readonly FormField[] }) {
  const record = asRecord(value);
  return (
    <div className="grid gap-4">
      {fields.map((child) => (
        <FieldControl
          field={child}
          issues={issues}
          key={child.key}
          media={media}
          onChange={(next) => onChange({ ...record, [child.key]: next })}
          path={path ? `${path}.${child.key}` : child.key}
          value={record[child.key]}
        />
      ))}
    </div>
  );
}

/** One content field. Groups and lists render their own fields through this again. */
export function FieldControl({ field, value, onChange, path, issues, media }: FieldControlProps) {
  const id = useId();
  const issue = issues.get(path);
  const label = (
    <Label htmlFor={id}>
      {field.label}
      {field.required ? null : (
        <span className="font-normal text-muted-foreground"> (optional)</span>
      )}
    </Label>
  );

  switch (field.kind) {
    case 'text':
    case 'url':
    case 'media':
      return (
        <div className="grid gap-2">
          {label}
          <Input
            aria-invalid={issue ? true : undefined}
            id={id}
            list={field.kind === 'media' ? `${id}-uploads` : undefined}
            onChange={(event) => onChange(event.target.value)}
            type={field.kind === 'url' ? 'url' : 'text'}
            value={asString(value)}
          />
          {field.kind === 'media' ? (
            <datalist id={`${id}-uploads`}>
              {media[field.media].map((url) => (
                <option key={url} value={url} />
              ))}
            </datalist>
          ) : null}
          <Issue message={issue} />
        </div>
      );
    case 'textarea':
      return (
        <div className="grid gap-2">
          {label}
          <Textarea
            aria-invalid={issue ? true : undefined}
            id={id}
            onChange={(event) => onChange(event.target.value)}
            value={asString(value)}
          />
          <Issue message={issue} />
        </div>
      );
    case 'datetime':
      return (
        <div className="grid gap-2">
          {label}
          <Input
            aria-invalid={issue ? true : undefined}
            id={id}
            onChange={(event) => onChange(localInputToIso(event.target.value))}
            type="datetime-local"
            value={isoToLocalInput(asString(value))}
          />
          <Issue message={issue} />
        </div>
      );
    case 'choice':
      return (
        <div className="grid gap-2">
          {label}
          <NativeSelect
            id={id}
            onChange={(event) => onChange(event.target.value)}
            value={asString(value)}
          >
            {field.required ? null : <option value="">None</option>}
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
          <Issue message={issue} />
        </div>
      );
    case 'group':
      if (!field.required && value === undefined) {
        return (
          <Button
            className="justify-self-start"
            onClick={() => onChange(emptyValue(field.fields))}
            type="button"
            variant="outline"
          >
            Add {field.label.toLowerCase()}
          </Button>
        );
      }
      return (
        <fieldset className="grid gap-4 rounded-xl border p-4">
          <legend className="px-1 font-medium">{field.label}</legend>
          <Fields
            fields={field.fields}
            issues={issues}
            media={media}
            onChange={onChange}
            path={path}
            value={value}
          />
          <Issue message={issue} />
          {field.required ? null : (
            <Button
              className="justify-self-start"
              onClick={() => onChange(undefined)}
              type="button"
              variant="ghost"
            >
              Remove {field.label.toLowerCase()}
            </Button>
          )}
        </fieldset>
      );
    case 'list': {
      const rows: unknown[] = Array.isArray(value) ? value : [];
      const move = (from: number, to: number) => {
        const next = [...rows];
        const [row] = next.splice(from, 1);
        next.splice(to, 0, row);
        onChange(next);
      };
      return (
        <fieldset className="grid gap-3">
          <legend className="font-medium">{field.label}</legend>
          {rows.map((row, index) => (
            /* Rows have no identity of their own; the index is the identity. */
            <div className="grid gap-3 rounded-xl border p-4" key={index}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    aria-label="Move down"
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, index + 1)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    aria-label="Remove"
                    onClick={() => onChange(rows.filter((_, at) => at !== index))}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <X />
                  </Button>
                </div>
              </div>
              <Fields
                fields={field.item}
                issues={issues}
                media={media}
                onChange={(next) =>
                  onChange(rows.map((current, at) => (at === index ? next : current)))
                }
                path={`${path}.${index}`}
                value={row}
              />
            </div>
          ))}
          <Issue message={issue} />
          <Button
            className="justify-self-start"
            onClick={() => onChange([...rows, emptyValue(field.item)])}
            type="button"
            variant="outline"
          >
            Add to {field.label.toLowerCase()}
          </Button>
        </fieldset>
      );
    }
  }
}
