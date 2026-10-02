import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({
  id,
  label,
  hint,
  className = "",
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--lifeos-ink-soft)]">
        {label}
      </span>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] px-3.5 py-2.5 text-[var(--lifeos-ink)] outline-none transition placeholder:text-[var(--lifeos-muted)] focus:border-[var(--lifeos-accent)] focus:ring-2 focus:ring-[var(--lifeos-accent-soft)] ${className}`}
        {...rest}
      />
      {hint ? (
        <span className="mt-1.5 block text-xs text-[var(--lifeos-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
