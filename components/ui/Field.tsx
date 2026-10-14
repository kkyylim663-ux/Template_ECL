import type { ReactNode, SelectHTMLAttributes } from 'react';

/**
 * Form primitives. Presentation only — no state, no validation logic — so they
 * work inside both server and client components.
 */

export function Field({
  htmlFor,
  label,
  error,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-muted block text-xs font-medium">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? <p className="text-muted mt-1 text-[11px]">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function TextField({ id, label, error, hint, className, ...input }: TextFieldProps) {
  return (
    <Field htmlFor={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        name={id}
        aria-invalid={error ? 'true' : undefined}
        className={`border-line bg-panel text-ink placeholder:text-muted focus:border-accent w-full rounded-[var(--radius-tag)] border px-3 py-2 text-sm outline-none ${
          error ? 'border-[var(--color-danger)]' : ''
        } ${className ?? ''}`}
        {...input}
      />
    </Field>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ id, label, error, hint, options, ...select }: SelectFieldProps) {
  return (
    <Field htmlFor={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        name={id}
        aria-invalid={error ? 'true' : undefined}
        className={`border-line bg-panel text-ink focus:border-accent w-full rounded-[var(--radius-tag)] border px-3 py-2 text-sm outline-none ${
          error ? 'border-[var(--color-danger)]' : ''
        }`}
        {...select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p className="border-line bg-panel-soft text-muted rounded-[var(--radius-tag)] border px-3 py-2 text-xs">
      {children}
    </p>
  );
}

export function PrimaryButton({
  children,
  ...props
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className="bg-accent hover:bg-accent-bright rounded-[8px] px-4 py-2 text-sm font-semibold text-[#1b1b1b] disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );
}
