import type { PriorityLevel } from "@/types/database";
import { PRIORITY_LABEL } from "@/lib/constants";
import styles from "@/components/primitives/PriorityChip/PriorityChip.module.css";

export interface PriorityChipProps {
  priority: PriorityLevel;
}

const VARIANT_CLASS: Record<PriorityLevel, string | undefined> = {
  critical: styles.critical,
  high: styles.high,
  medium: styles.medium,
  low: styles.low,
};

export function PriorityChip({ priority }: PriorityChipProps) {
  return <span className={`${styles.root} ${VARIANT_CLASS[priority] ?? ""}`}>{PRIORITY_LABEL[priority]}</span>;
}
