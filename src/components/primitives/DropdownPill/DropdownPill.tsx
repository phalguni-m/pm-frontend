import type { ReactNode } from "react";
import { ChevronIcon } from "@/components/icons";
import { Popover } from "@/components/primitives/Popover";
import { Menu, type MenuItemData } from "@/components/primitives/Menu";
import styles from "@/components/primitives/DropdownPill/DropdownPill.module.css";

export interface DropdownPillProps {
  label: string;
  items: MenuItemData[];
  onSelect: (id: string) => void;
  leadingMark?: ReactNode;
  disabled?: boolean;
  /** Controlled open state — lets a consumer force the menu open (e.g. the task panel auto-opening the delay-cause picker the instant status becomes "waiting"). Omit for normal click-to-open behaviour. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function DropdownPill({ label, items, onSelect, leadingMark, disabled = false, isOpen, onOpenChange }: DropdownPillProps) {
  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={(triggerProps) => (
        <button
          type="button"
          className={styles.trigger}
          disabled={disabled}
          onClick={triggerProps.onClick}
          aria-expanded={triggerProps["aria-expanded"]}
          aria-haspopup={triggerProps["aria-haspopup"]}
        >
          {leadingMark && (
            <span className={styles.mark} aria-hidden="true">
              {leadingMark}
            </span>
          )}
          <span className={styles.label}>{label}</span>
          <span className={triggerProps["aria-expanded"] ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron} aria-hidden="true">
            <ChevronIcon size={14} />
          </span>
        </button>
      )}
    >
      {(close) => (
        <Menu
          items={items}
          onSelect={(id) => {
            onSelect(id);
            close();
          }}
        />
      )}
    </Popover>
  );
}
