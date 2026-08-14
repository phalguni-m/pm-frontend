import type { ReactNode } from "react";
import styles from "@/components/primitives/CardGrid/CardGrid.module.css";

export interface CardGridProps {
  children: ReactNode;
}

// Three-up card row per SPEC §5 row layouts. ≤1280 becomes two-up with a
// trailing odd card spanning both columns; ≤900 collapses to one column.
export function CardGrid({ children }: CardGridProps) {
  return <div className={styles.root}>{children}</div>;
}
