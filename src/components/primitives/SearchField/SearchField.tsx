import type { InputHTMLAttributes } from "react";
import { SearchIcon } from "@/components/icons";
import { Kbd } from "@/components/primitives/Kbd";
import styles from "@/components/primitives/SearchField/SearchField.module.css";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  shortcutHint?: string;
}

export function SearchField({ shortcutHint, className, ...rest }: SearchFieldProps) {
  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <span className={styles.icon} aria-hidden="true">
        <SearchIcon size={16} />
      </span>
      <input type="search" className={styles.input} {...rest} />
      {shortcutHint && (
        <span className={styles.hint}>
          <Kbd>{shortcutHint}</Kbd>
        </span>
      )}
    </div>
  );
}
