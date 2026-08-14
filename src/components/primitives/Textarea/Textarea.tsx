import type { TextareaHTMLAttributes } from "react";
import styles from "@/components/primitives/Textarea/Textarea.module.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Bordered variant for standalone form contexts (e.g. Comments composer). Default is borderless, per the task panel Description field. */
  bordered?: boolean;
  error?: boolean;
}

export function Textarea({ bordered = false, error = false, className, ...rest }: TextareaProps) {
  const classes = [styles.root, bordered ? styles.bordered : undefined, error ? styles.error : undefined, className]
    .filter(Boolean)
    .join(" ");
  return <textarea className={classes} aria-invalid={error || undefined} {...rest} />;
}
