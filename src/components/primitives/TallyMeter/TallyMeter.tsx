import type { ReactNode } from "react";
import styles from "@/components/primitives/TallyMeter/TallyMeter.module.css";

export interface TallyMeterProps {
  label: string;
  percent: number;
  delta?: ReactNode;
  /** Bar count adapts to breakpoint: 28 desktop, 20 tablet, 14 mobile, 14 at ≤380. */
  barCount?: number;
}

export function TallyMeter({ label, percent, delta, barCount = 28 }: TallyMeterProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filledBars = Math.round((clamped / 100) * barCount);

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <span className={styles.label}>{label}</span>
        {delta}
        <span className={styles.percent}>{Math.round(clamped)}%</span>
      </div>
      <div
        className={styles.bars}
        role="img"
        aria-label={`${label}: ${Math.round(clamped)} percent complete`}
      >
        {Array.from({ length: barCount }, (_, i) => (
          <div
            key={i}
            className={i < filledBars ? `${styles.bar} ${styles.barFilled}` : styles.bar}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
