import { useId, useRef, type ReactNode } from "react";
import styles from "@/components/primitives/Tabs/Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  ariaLabel: string;
}

export function Tabs({ tabs, activeTabId, onChange, children, ariaLabel }: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (next) {
      onChange(next.id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div>
      <div className={styles.list} role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className={styles.panel}
        role="tabpanel"
        id={`${baseId}-panel-${activeTabId}`}
        aria-labelledby={`${baseId}-tab-${activeTabId}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
