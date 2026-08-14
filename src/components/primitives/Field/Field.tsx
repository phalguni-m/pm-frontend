import type { ReactNode } from "react";
import styles from "@/components/primitives/Field/Field.module.css";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  errorMessage?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, required = false, errorMessage, children }: FieldProps) {
  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
      {errorMessage && (
        <span className={styles.error} role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
