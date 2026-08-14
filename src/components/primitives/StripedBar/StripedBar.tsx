import { useEffect, useId, useRef, useState } from "react";
import type { StatusType } from "@/types/database";
import { STATUS_LABEL } from "@/lib/constants";
import styles from "@/components/primitives/StripedBar/StripedBar.module.css";

export interface StripedBarSegment {
  status: StatusType;
  count: number;
}

export interface StripedBarProps {
  segments: StripedBarSegment[];
  showLegend?: boolean;
}

// Densest-first order per spec; drives both segment order and hatch density.
const STATUS_ORDER: StatusType[] = ["in_progress", "waiting", "blocked", "to_do", "done"];

const TONE_VAR: Record<StatusType, string> = {
  in_progress: "var(--meter-1)",
  waiting: "var(--meter-2)",
  blocked: "var(--meter-3)",
  to_do: "var(--meter-4)",
  done: "var(--meter-5)",
};

// Hatch spec: in_progress solid (no hatch, the densest end of the ramp) ·
// waiting 2px stroke / 6px pitch, 45° · blocked 3px / 4px pitch, -45°
// (cross-reads against waiting) · to_do 1px / 10px pitch, 90° vertical ·
// done 1px / 14px pitch, 0° horizontal (widest pitch, stays quietest without
// being featureless — a fourth distinct angle vs. waiting/blocked/to_do).
const HATCH: Record<StatusType, { size: number; strokeWidth: number; angle: number } | null> = {
  in_progress: null,
  waiting: { size: 6, strokeWidth: 2, angle: 45 },
  blocked: { size: 4, strokeWidth: 3, angle: -45 },
  to_do: { size: 10, strokeWidth: 1, angle: 90 },
  done: { size: 14, strokeWidth: 1, angle: 0 },
};

// Contrast stroke drawn over the full-strength tone fill: a light stroke for
// the darker/denser meters (in_progress, waiting, blocked), a dark stroke for
// the lighter meters (to_do, done). Only statuses with a HATCH entry use this.
const STROKE_VAR: Record<StatusType, string> = {
  in_progress: "var(--bg-card)",
  waiting: "var(--bg-card)",
  blocked: "var(--bg-card)",
  to_do: "var(--text-primary)",
  done: "var(--text-primary)",
};

const STROKE_OPACITY: Record<StatusType, number> = {
  in_progress: 0.4,
  waiting: 0.4,
  blocked: 0.4,
  to_do: 0.25,
  done: 0.25,
};

function HatchDef({
  status,
  patternId,
  flat = false,
}: {
  status: StatusType;
  patternId: string;
  flat?: boolean;
}) {
  const hatch = flat ? null : HATCH[status];
  const tone = TONE_VAR[status];

  if (!hatch) {
    return (
      <pattern id={patternId} width="1" height="1">
        <rect width="1" height="1" fill={tone} />
      </pattern>
    );
  }

  return (
    <pattern
      id={patternId}
      width={hatch.size}
      height={hatch.size}
      patternTransform={`rotate(${hatch.angle})`}
      patternUnits="userSpaceOnUse"
    >
      <rect width={hatch.size} height={hatch.size} fill={tone} />
      <line
        x1="0"
        y1="0"
        x2="0"
        y2={hatch.size}
        stroke={STROKE_VAR[status]}
        strokeOpacity={STROKE_OPACITY[status]}
        strokeWidth={hatch.strokeWidth}
      />
    </pattern>
  );
}

export function StripedBarSwatch({ status, size = 12 }: { status: StatusType; size?: number }) {
  const uid = useId();
  const patternId = `swatch-${status}-${uid}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="presentation">
      <defs>
        <HatchDef status={status} patternId={patternId} />
      </defs>
      <rect width={size} height={size} fill={`url(#${patternId})`} />
    </svg>
  );
}

// Below this rendered width, a segment's hatch reads as noise rather than a
// pattern — drop it and fall back to flat tone.
const MIN_HATCHED_WIDTH = 8;

export function StripedBar({ segments, showLegend = true }: StripedBarProps) {
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const ordered = STATUS_ORDER.map((status) => segments.find((s) => s.status === status)).filter(
    (s): s is StripedBarSegment => s !== undefined && s.count > 0,
  );
  // The container's own gaps eat into the width available to segments —
  // subtract them before turning percentages into a pixel estimate, so the
  // 8px hatch-vs-flat threshold is checked against real rendered size, not
  // fed back into the width that produced it.
  const gapTotal = Math.max(0, ordered.length - 1) * 3;
  const usableWidth = Math.max(0, containerWidth - gapTotal);

  return (
    <div>
      <div
        ref={containerRef}
        className={styles.root}
        role="img"
        aria-label={`Task status distribution: ${ordered.map((s) => `${s.count} ${STATUS_LABEL[s.status]}`).join(", ")}`}
      >
        {ordered.map((segment) => {
          const patternId = `bar-${segment.status}-${uid}`;
          const widthPct = total > 0 ? (segment.count / total) * 100 : 0;
          const pixelWidth = usableWidth * (widthPct / 100);
          const flat = usableWidth > 0 && pixelWidth < MIN_HATCHED_WIDTH;
          if (import.meta.env.DEV) {
            console.debug(
              `[StripedBar] ${segment.status}: count=${segment.count} pct=${widthPct.toFixed(1)}% px=${pixelWidth.toFixed(1)} flat=${flat}`,
            );
          }
          return (
            <svg
              key={segment.status}
              className={styles.segment}
              style={{ width: `${widthPct}%` }}
              height={14}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <HatchDef status={segment.status} patternId={patternId} flat={flat} />
              </defs>
              <rect width="100%" height="14" fill={`url(#${patternId})`} />
            </svg>
          );
        })}
      </div>
      {showLegend && (
        <div className={styles.legend}>
          {ordered.map((segment) => (
            <div key={segment.status} className={styles.legendRow}>
              <div className={styles.legendItem}>
                <div className={styles.swatch}>
                  <StripedBarSwatch status={segment.status} />
                </div>
                <span className={styles.legendLabel}>{STATUS_LABEL[segment.status]}</span>
              </div>
              <span className={styles.legendCount}>
                <span className={styles.legendCountValue}>{segment.count}</span>
                <span className={styles.legendCountUnit}>{segment.count === 1 ? "task" : "tasks"}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
