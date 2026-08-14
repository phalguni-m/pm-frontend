import type { InputHTMLAttributes } from "react";
import styles from "@/components/primitives/Input/Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error = false, className, ...rest }: InputProps) {
  const classes = [styles.root, error ? styles.error : undefined, className].filter(Boolean).join(" ");
  return <input className={classes} aria-invalid={error || undefined} {...rest} />;
}
