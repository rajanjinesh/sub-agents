import { Field, inputClass } from "./Field";

export function NumberField({
  id,
  label,
  value,
  min,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
  error?: string;
}) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className={inputClass}
      />
    </Field>
  );
}
