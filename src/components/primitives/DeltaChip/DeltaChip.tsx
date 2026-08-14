import styles from "@/components/primitives/DeltaChip/DeltaChip.module.css";

export type DeltaDirection = "up" | "down";

export interface DeltaChipProps {
  direction: DeltaDirection;
  value: string;
  /** Marks a delta the user should act on (e.g. rising wait time). Never green — there is no positive hue in this palette. */
  needsAttention?: boolean;
}

export function DeltaChip({ direction, value, needsAttention = false }: DeltaChipProps) {
  return (
    <span className={needsAttention ? `${styles.root} ${styles.attention}` : styles.root}>
      <span className={styles.arrow} aria-hidden="true">
        {direction === "up" ? "↑" : "↓"}
      </span>
      {value}
    </span>
  );
}
