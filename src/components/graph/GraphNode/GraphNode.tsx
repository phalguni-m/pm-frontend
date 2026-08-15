import { StatusPill } from "@/components/primitives/StatusPill";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import styles from "@/components/graph/GraphNode/GraphNode.module.css";
import type { TaskCPMResult } from "@/lib/criticalPath";
import type { TaskView } from "@/types/ui";

export const NODE_WIDTH = 184;
export const NODE_HEIGHT = 72;
// Critical Path Mode adds a third row (slack readout) below title + meta.
// Layout math in DependencyGraph always reserves this taller footprint
// rather than branching per-node, so node vertical spacing never shifts
// when the mode is toggled on a graph already rendered at NODE_HEIGHT.
export const NODE_HEIGHT_CPM = 96;

export interface GraphNodeProps {
  task: TaskView;
  x: number;
  y: number;
  isSelected: boolean;
  onActivate: (taskId: string) => void;
  /** Present only when Critical Path Mode is on and the graph isn't degraded. */
  cpm?: TaskCPMResult;
  isCriticalPathMode: boolean;
}

function slackLabel(cpm: TaskCPMResult): string {
  return cpm.isCritical ? "Critical" : `Slack ${cpm.slack}d`;
}

export function GraphNode({ task, x, y, isSelected, onActivate, cpm, isCriticalPathMode }: GraphNodeProps) {
  const isCritical = isCriticalPathMode && cpm?.isCritical === true;
  const isDimmed = isCriticalPathMode && cpm !== undefined && !cpm.isCritical;
  const height = isCriticalPathMode ? NODE_HEIGHT_CPM : NODE_HEIGHT;

  const classes = [styles.root, isSelected && styles.selected, isCritical && styles.critical, isDimmed && styles.dimmed]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      style={{ left: x, top: y, width: NODE_WIDTH, height }}
      onClick={() => onActivate(task.id)}
    >
      <span className={styles.title}>{task.title}</span>
      <span className={styles.meta}>
        <StatusPill status={task.state.status} />
        <PriorityChip priority={task.priority} />
      </span>
      {isCriticalPathMode && cpm && (
        <span className={isCritical ? `${styles.slack} ${styles.slackCritical}` : styles.slack}>
          {slackLabel(cpm)}
          {cpm.isEstimatedDuration && <span className={styles.estimateMark}> (est.)</span>}
        </span>
      )}
    </button>
  );
}
