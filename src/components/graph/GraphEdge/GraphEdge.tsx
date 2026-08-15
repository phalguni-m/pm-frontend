import styles from "@/components/graph/GraphEdge/GraphEdge.module.css";
import type { GraphEdgeLayout } from "@/lib/graph";

export interface GraphEdgeProps {
  edge: GraphEdgeLayout;
  from: { x: number; y: number };
  to: { x: number; y: number };
  isCritical?: boolean;
  isDimmed?: boolean;
}

/**
 * Cubic bezier that bows toward the right for forward edges (the common
 * case, left-to-right layering) and bows the opposite way for back-edges —
 * the reversed curvature plus the dashed stroke is what makes a cycle read
 * as "goes backward" without reaching for a signal color SPEC reserves for
 * seven other cases.
 */
function pathFor(from: { x: number; y: number }, to: { x: number; y: number }, isBackEdge: boolean): string {
  const dx = Math.max(Math.abs(to.x - from.x) * 0.5, 40) * (isBackEdge ? -1 : 1);
  const c1x = from.x + dx;
  const c2x = to.x - dx;
  return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;
}

export function GraphEdge({ edge, from, to, isCritical = false, isDimmed = false }: GraphEdgeProps) {
  const classes = [
    styles.path,
    edge.isBackEdge && styles.backEdge,
    isCritical && styles.critical,
    isDimmed && styles.dimmed,
  ]
    .filter(Boolean)
    .join(" ");

  const markerId = isCritical ? "graph-arrow-critical" : edge.isBackEdge ? "graph-arrow-back" : "graph-arrow";

  return <path className={classes} d={pathFor(from, to, edge.isBackEdge)} fill="none" markerEnd={`url(#${markerId})`} />;
}
