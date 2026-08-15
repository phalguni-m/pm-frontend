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

// CSS classes carry every tone color now (see StripedBar.module.css's header
// comment for why) — this just maps status -> class name instead of status
// -> a var() string interpolated into an SVG attribute.
const TONE_CLASS: Record<StatusType, string | undefined> = {
  in_progress: styles.toneInProgress,
  waiting: styles.toneWaiting,
  blocked: styles.toneBlocked,
  to_do: styles.toneToDo,
  done: styles.toneDone,
};

// Pattern spec. Deliberately NOT differentiated by angle alone — at a 14px
// bar height a segment may render only 1-3 tile repeats, which isn't enough
// signal for a viewer to reliably perceive "angle" as a feature (and the
// closest angle pair, 45°/-45°, are mirror images of each other, the single
// easiest pair to misread as "the same slanted texture" at a glance despite
// being 90° apart mathematically). Instead each status gets a structurally
// different pattern KIND — solid / dashed line / solid diagonal / dot grid /
// solid vertical — so no two statuses are confusable even at a handful of
// tile repeats, independent of angle perception entirely:
//   in_progress — solid fill, no pattern at all (densest end of the ramp,
//                 "current work"; zero reliance on line perception)
//   waiting     — dashed horizontal line (broken vs. continuous is a SHAPE
//                 distinction, not an angle one — reads even at 1 repeat)
//   blocked     — solid diagonal line, 45° (the only diagonal in the set;
//                 no mirror-image partner left to be confused with)
//   to_do       — dot grid (dots vs. lines is the strongest structural
//                 distinction possible — unmistakable from every other
//                 status regardless of size)
//   done        — solid vertical line, widest pitch (orthogonal to
//                 blocked's diagonal; lightest tone + quietest pattern,
//                 correctly receding for completed work)
type PatternSpec =
  | { kind: "dash"; tileWidth: number; tileHeight: number; dashLength: number; strokeWidth: number }
  | { kind: "diagonal"; size: number; strokeWidth: number }
  | { kind: "dot"; tileSize: number; radius: number }
  | { kind: "vertical"; pitch: number; strokeWidth: number };

const HATCH: Record<StatusType, PatternSpec | null> = {
  in_progress: null,
  waiting: { kind: "dash", tileWidth: 8, tileHeight: 8, dashLength: 4, strokeWidth: 2 },
  blocked: { kind: "diagonal", size: 5, strokeWidth: 2 },
  to_do: { kind: "dot", tileSize: 8, radius: 1.3 },
  done: { kind: "vertical", pitch: 11, strokeWidth: 1.5 },
};

// Contrast stroke drawn over the full-strength tone fill: a light stroke for
// the darker/denser meters (in_progress, waiting, blocked), a dark stroke for
// the lighter meters (to_do, done). Only statuses with a HATCH entry use this.
const STROKE_CLASS: Record<StatusType, string | undefined> = {
  in_progress: styles.strokeOnDark,
  waiting: styles.strokeOnDark,
  blocked: styles.strokeOnDark,
  to_do: styles.strokeOnLight,
  done: styles.strokeOnLight,
};

// Same contrast split, as a fill — only the to_do dot pattern needs this
// (a <circle> with no stroke of its own).
const FILL_CLASS: Record<StatusType, string | undefined> = {
  in_progress: styles.fillOnDark,
  waiting: styles.fillOnDark,
  blocked: styles.fillOnDark,
  to_do: styles.fillOnLight,
  done: styles.fillOnLight,
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
  const pattern = flat ? null : HATCH[status];
  const toneClass = TONE_CLASS[status];
  const strokeClass = STROKE_CLASS[status];
  const strokeOpacity = STROKE_OPACITY[status];

  if (!pattern) {
    return (
      <pattern id={patternId} width="1" height="1">
        <rect width="1" height="1" className={toneClass} />
      </pattern>
    );
  }

  if (pattern.kind === "dash") {
    const { tileWidth, tileHeight, dashLength, strokeWidth } = pattern;
    const y = tileHeight / 2;
    return (
      <pattern id={patternId} width={tileWidth} height={tileHeight} patternUnits="userSpaceOnUse">
        <rect width={tileWidth} height={tileHeight} className={toneClass} />
        <line
          x1={0}
          y1={y}
          x2={dashLength}
          y2={y}
          className={strokeClass}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      </pattern>
    );
  }

  if (pattern.kind === "diagonal") {
    const { size, strokeWidth } = pattern;
    return (
      <pattern id={patternId} width={size} height={size} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width={size} height={size} className={toneClass} />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2={size}
          className={strokeClass}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      </pattern>
    );
  }

  if (pattern.kind === "dot") {
    const { tileSize, radius } = pattern;
    const center = tileSize / 2;
    return (
      <pattern id={patternId} width={tileSize} height={tileSize} patternUnits="userSpaceOnUse">
        <rect width={tileSize} height={tileSize} className={toneClass} />
        <circle cx={center} cy={center} r={radius} className={FILL_CLASS[status]} fillOpacity={strokeOpacity} />
      </pattern>
    );
  }

  // "vertical"
  const { pitch, strokeWidth } = pattern;
  return (
    <pattern id={patternId} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
      <rect width={pitch} height={pitch} className={toneClass} />
      <line
        x1={pitch / 2}
        y1="0"
        x2={pitch / 2}
        y2={pitch}
        className={strokeClass}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
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
      <rect x="0.5" y="0.5" width={size - 1} height={size - 1} className={styles.segmentBorder} />
    </svg>
  );
}

// Below this rendered width, a segment's hatch reads as noise rather than a
// pattern — drop it and fall back to flat tone. Also the floor below which a
// segment's *own* proportional width would round to nothing: a status with a
// nonzero count always renders at least this wide (see minWidth logic below)
// rather than vanishing, and — per the same rule — never attempts a hatch at
// that floor width either, regardless of whether a given status's specific
// pitch happens to be small enough to theoretically tile. One threshold,
// same for all five statuses, rather than a per-status special case.
const MIN_HATCHED_WIDTH = 8;
const MIN_SEGMENT_WIDTH = 4;

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

  // Mount-in motion: segments render at width 0 on first paint, then flip to
  // their real width one frame later so the width transition (see .segment
  // in StripedBar.module.css) actually has something to animate from. A
  // live count change afterward just re-renders at the new width directly —
  // the same CSS transition smooths that too, no separate code path needed.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(frame);
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

  // Widths render as percentages (like before this block) so layout works
  // immediately via CSS, without depending on the ResizeObserver's first
  // callback having already landed — pixelWidths below is only used to
  // decide the hatch-vs-flat cutoff and the minimum-segment-width floor,
  // never as the actual rendered width unit.
  const rawPercents = ordered.map((segment) => (total > 0 ? (segment.count / total) * 100 : 0));

  // Once real measurements are available, raise any segment that would
  // round to an unreadably thin (or effectively invisible) sliver up to a
  // minimum pixel floor, converted back to the equivalent percentage. The
  // percentage points added to small segments are taken back out of the
  // largest segment, so the bar's total width still exactly fills the
  // container instead of overflowing it — a 1-task-of-200 segment stays
  // visible without silently vanishing, and without every other segment's
  // proportions drifting to compensate.
  const minPercent = usableWidth > 0 ? (MIN_SEGMENT_WIDTH / usableWidth) * 100 : 0;
  const rawPixelWidths = ordered.map((segment) => (total > 0 ? usableWidth * (segment.count / total) : 0));
  let largestIndex = 0;
  for (let i = 1; i < rawPixelWidths.length; i += 1) {
    if (rawPixelWidths[i]! > rawPixelWidths[largestIndex]!) largestIndex = i;
  }
  const percentDeficit =
    usableWidth > 0 ? rawPercents.reduce((sum, p) => sum + Math.max(0, minPercent - p), 0) : 0;
  const widthPercents = rawPercents.map((p, i) => {
    if (usableWidth <= 0) return p;
    if (p < minPercent) return minPercent;
    if (i === largestIndex) return Math.max(minPercent, p - percentDeficit);
    return p;
  });
  const pixelWidths = widthPercents.map((p) => usableWidth * (p / 100));

  return (
    <div>
      <div
        ref={containerRef}
        className={styles.root}
        role="img"
        aria-label={`Task status distribution: ${ordered.map((s) => `${s.count} ${STATUS_LABEL[s.status]}`).join(", ")}`}
      >
        {ordered.map((segment, index) => {
          const patternId = `bar-${segment.status}-${uid}`;
          const pixelWidth = pixelWidths[index]!;
          const flat = usableWidth > 0 && pixelWidth < MIN_HATCHED_WIDTH;
          const renderPercent = hasMounted ? widthPercents[index]! : 0;

          return (
            <svg
              key={segment.status}
              className={styles.segment}
              style={{ width: `${renderPercent}%` }}
              height={14}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <HatchDef status={segment.status} patternId={patternId} flat={flat} />
              </defs>
              <rect width="100%" height="14" fill={`url(#${patternId})`} />
              <rect x="0" y="0.5" width="100%" height="13" className={styles.segmentBorder} />
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
