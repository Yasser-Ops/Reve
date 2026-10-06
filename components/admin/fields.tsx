import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { TIERS, TIER_LABELS } from '@/lib/constants';

/*
 * Ids come from useId, never from the field's name: one admin page holds the
 * client's notes, every order's upgrade amount and the "add an order" fields
 * at once, and name-based ids made a label point at another form's field.
 */

export function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
}) {
  const id = useId();

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        id={id}
        name={name}
        required={required}
        type={type}
      />
    </div>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea defaultValue={defaultValue} id={id} name={name} placeholder={placeholder} />
    </div>
  );
}

/** The fields every order carries; the design is chosen later, per invitation. */
export function OrderFields() {
  const tierId = useId();

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={tierId}>Tier</Label>
        <NativeSelect defaultValue={TIERS.MANAGED} id={tierId} name="tier">
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Field label="Amount (USD)" name="amount" required type="number" />
      <Field label="Event date" name="eventDate" type="date" />
      <Field label="Due (leave empty: set to 48 hours once paid)" name="dueAt" type="date" />
      <TextareaField label="Order notes" name="notes" />
    </>
  );
}
