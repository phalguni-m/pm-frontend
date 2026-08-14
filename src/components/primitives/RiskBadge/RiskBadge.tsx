import styles from "@/components/primitives/RiskBadge/RiskBadge.module.css";

export interface RiskBadgeProps {
  tier: 1 | 2 | 3 | 4 | 5;
}

export function RiskBadge({ tier }: RiskBadgeProps) {
  const isHigh = tier >= 4;
  return <span className={isHigh ? `${styles.root} ${styles.high}` : styles.root}>{`R${tier}`}</span>;
}
