import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--lifeos-accent)] text-white hover:bg-[var(--lifeos-accent-hover)] shadow-sm",
  secondary:
    "bg-[var(--lifeos-surface)] text-[var(--lifeos-ink)] border border-[var(--lifeos-border)] hover:bg-[var(--lifeos-accent-soft)]",
  ghost:
    "bg-transparent text-[var(--lifeos-ink-soft)] hover:bg-[var(--lifeos-accent-soft)] hover:text-[var(--lifeos-ink)]",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lifeos-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
