import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "@/components/primitives/Button/Button.module.css";

export type ButtonVariant = "default" | "primary" | "quiet" | "icon";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
  default: styles.default,
  primary: styles.primary,
  quiet: styles.quiet,
  icon: styles.icon,
};

export function Button({ variant = "default", icon, loading = false, disabled, children, className, ...rest }: ButtonProps) {
  const classes = [styles.root, VARIANT_CLASS[variant], className].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? (
        <span className={styles.loadingSpinner} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
            <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      ) : (
        icon && (
          <span className={styles.leadingIcon} aria-hidden="true">
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
}
