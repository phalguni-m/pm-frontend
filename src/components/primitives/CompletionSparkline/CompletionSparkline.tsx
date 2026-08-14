const SIZE = 20;
const BAR_WIDTH = 3;
const GAP = 2;
const HEIGHTS = [7, 11, 15];

export interface CompletionSparklineProps {
  percent: number;
}

// Three bars, tone by how much of the ratio each bar represents — a compact
// stand-in for TallyMeter used in tight spaces like the sidebar project row.
export function CompletionSparkline({ percent }: CompletionSparklineProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filledBars = Math.round((clamped / 100) * HEIGHTS.length);

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img">
      <title>{`${Math.round(clamped)} percent complete`}</title>
      {HEIGHTS.map((height, index) => {
        const x = index * (BAR_WIDTH + GAP) + 1;
        const y = SIZE - height - 2;
        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={BAR_WIDTH}
            height={height}
            rx={1.5}
            fill={index < filledBars ? "var(--meter-1)" : "var(--meter-empty)"}
          />
        );
      })}
    </svg>
  );
}
