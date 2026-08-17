import { useEffect, useState } from "react";
import { formatWaitingDuration, sentenceCase } from "@/lib/format";
import styles from "@/components/primitives/WaitingIndicator/WaitingIndicator.module.css";

export interface WaitingIndicatorProps {
  waitingSince: string;
  causeName: string;
}

const DOT_SIZE = 12;
const R = DOT_SIZE / 2;

function DashedRingDot() {
  return (
    <svg className={styles.dot} width={DOT_SIZE} height={DOT_SIZE} viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`} aria-hidden="true">
      <circle
        cx={R}
        cy={R}
        r={R - 1}
        fill="none"
        stroke="var(--meter-2)"
        strokeWidth="1.5"
        strokeDasharray="2 1.8"
      />
    </svg>
  );
}

export function WaitingIndicator({ waitingSince, causeName }: WaitingIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hours = Math.max(0, (now - new Date(waitingSince).getTime()) / (1000 * 60 * 60));

  return (
    <span className={styles.root}>
      <DashedRingDot />
      <span className={styles.duration}>{formatWaitingDuration(hours)}</span>
      <span className={styles.separator} aria-hidden="true">
        &middot;
      </span>
      <span className={styles.cause}>{sentenceCase(causeName)}</span>
    </span>
  );
}
