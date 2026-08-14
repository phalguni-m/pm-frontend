import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon } from "@/components/icons";
import styles from "@/components/primitives/Menu/Menu.module.css";

export interface MenuItemData {
  id: string;
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  items: MenuItemData[];
  onSelect: (id: string) => void;
}

export function Menu({ items, onSelect }: MenuProps) {
  const [activeIndex, setActiveIndex] = useState(() => items.findIndex((item) => !item.disabled));
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  function moveFocus(from: number, direction: 1 | -1) {
    const count = items.length;
    if (count === 0) return;
    let next = from;
    for (let step = 0; step < count; step++) {
      next = (next + direction + count) % count;
      if (!items[next]?.disabled) {
        setActiveIndex(next);
        return;
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(activeIndex, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(activeIndex, -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) onSelect(item.id);
    }
  }

  return (
    <div className={styles.root} role="menu" onKeyDown={handleKeyDown}>
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          type="button"
          role="menuitem"
          className={index === activeIndex ? `${styles.item} ${styles.itemActive}` : styles.item}
          tabIndex={index === activeIndex ? 0 : -1}
          disabled={item.disabled}
          aria-disabled={item.disabled || undefined}
          onClick={() => !item.disabled && onSelect(item.id)}
          onFocus={() => setActiveIndex(index)}
        >
          {item.icon && (
            <span className={styles.itemIcon} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className={styles.itemLabel}>{item.label}</span>
          {item.selected && (
            <span className={styles.itemTick} aria-hidden="true">
              <CheckIcon size={14} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
