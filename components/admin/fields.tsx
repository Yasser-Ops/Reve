import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { TIERS } from '@/lib/constants';

export function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input defaultValue={defaultValue} id={name} name={name} required={required} type={type} />
    </div>
  );
}

/** The fields every order carries; the design is chosen later, per invitation. */
export function OrderFields() {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="tier">Tier</Label>
        <NativeSelect defaultValue={TIERS.MANAGED} id="tier" name="tier">
          {Object.values(TIERS).map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Field label="Amount (USD)" name="amount" required type="number" />
      <Field label="Event date" name="eventDate" type="date" />
      <Field label="Due (leave empty: set to 48 hours once paid)" name="dueAt" type="date" />
      <div className="grid gap-2">
        <Label htmlFor="notes">Order notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
    </>
  );
}
