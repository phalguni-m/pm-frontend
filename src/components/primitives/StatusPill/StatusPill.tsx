import { useId } from "react";
import type { StatusType } from "@/types/database";
import { STATUS_LABEL } from "@/lib/constants";
import styles from "@/components/primitives/StatusPill/StatusPill.module.css";

export interface StatusPillProps {
  status: StatusType;
}

const DOT_SIZE = 8;
const R = DOT_SIZE / 2;

function StatusDot({ status }: { status: StatusType }) {
  const uid = useId();
  const clipId = `status-dot-clip-${uid}`;

  switch (status) {
    case "to_do":
      return (
        <svg className={styles.dot} width={DOT_SIZE} height={DOT_SIZE} viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`} aria-hidden="true">
          <circle cx={R} cy={R} r={R - 0.75} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
        </svg>
      );
    case "in_progress":
      return (
        <svg className={styles.dot} width={DOT_SIZE} height={DOT_SIZE} viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`} aria-hidden="true">
          <circle cx={R} cy={R} r={R - 0.75} fill="none" stroke="var(--meter-1)" strokeWidth="1.5" />
          <defs>
            <clipPath id={clipId}>
              <rect x={R} y="0" width={R} height={DOT_SIZE} />
            </clipPath>
          </defs>
          <circle cx={R} cy={R} r={R - 0.75} fill="var(--meter-1)" clipPath={`url(#${clipId})`} />
        </svg>
      );
    case "waiting":
      return (
        <svg className={styles.dot} width={DOT_SIZE} height={DOT_SIZE} viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`} aria-hidden="true">
          <circle
            cx={R}
            cy={R}
            r={R - 0.75}
            fill="none"
            stroke="var(--meter-2)"
            strokeWidth="1.5"
            strokeDasharray="1.6 1.4"
          />
        </svg>
      );
    case "blocked":
      return (
        <svg className={styles.dot} width={DOT_SIZE} height={DOT_SIZE} viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`} aria-hidden="true">
          <circle cx={R} cy={R} r={R - 0.5} fill="var(--signal-critical)" />
        </svg>
      );
    case "done":
      return (
        <svg className={styles.dot} width={DOT_SIZE} height={DOT_SIZE} viewBox={`0 0 ${DOT_SIZE} ${DOT_SIZE}`} aria-hidden="true">
          <circle cx={R} cy={R} r={R - 0.5} fill="var(--meter-1)" />
          <path
            d={`M${R - 1.6},${R} l1,1 l1.8,-2`}
            fill="none"
            stroke="var(--bg-card)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={styles.root}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}
