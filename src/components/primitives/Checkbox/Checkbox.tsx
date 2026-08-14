import { useId, type InputHTMLAttributes } from "react";
import { CheckIcon } from "@/components/icons";
import styles from "@/components/primitives/Checkbox/Checkbox.module.css";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <span className={className ? `${styles.root} ${className}` : styles.root}>
      <input type="checkbox" id={inputId} className={styles.input} {...rest} />
      <label htmlFor={inputId} className={styles.box}>
        <span className={styles.check}>
          <CheckIcon size={12} />
        </span>
      </label>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
    </span>
  );
}
