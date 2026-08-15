import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { GraphNode, NODE_WIDTH, NODE_HEIGHT, NODE_HEIGHT_CPM } from "@/components/graph/GraphNode";
import { GraphEdge } from "@/components/graph/GraphEdge";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Button } from "@/components/primitives/Button";
import { BlockedIcon } from "@/components/icons";
import styles from "@/components/graph/DependencyGraph/DependencyGraph.module.css";
import type { GraphLayout } from "@/lib/graph";
import type { CriticalPathResult } from "@/lib/criticalPath";
import type { TaskView } from "@/types/ui";

export interface DependencyGraphProps {
  layout: GraphLayout;
  tasks: TaskView[];
  selectedTaskId?: string;
  onNodeActivate: (taskId: string) => void;
  criticalPath: CriticalPathResult;
  isCriticalPathMode: boolean;
  onToggleCriticalPathMode: () => void;
}

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

function anchorOf(x: number, y: number, nodeHeight: number) {
  return { x: x + NODE_WIDTH / 2, y: y + nodeHeight / 2 };
}

function titleOf(tasksById: Map<string, TaskView>, id: string): string {
  return tasksById.get(id)?.title ?? id;
}

/**
 * Owns pan/zoom and renders the SVG canvas. No react-router-dom import and
 * no useNavigate — same rule as Table and ProjectsTable: this component
 * knows nothing about routes, it only calls onNodeActivate and lets the
 * owning page decide what that means.
 */
export function DependencyGraph({
  layout,
  tasks,
  selectedTaskId,
  onNodeActivate,
  criticalPath,
  isCriticalPathMode,
  onToggleCriticalPathMode,
}: DependencyGraphProps) {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const dragState = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    dragState.current = { startX: event.clientX, startY: event.clientY, startPan: pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    setPan({ x: dragState.current.startPan.x + dx, y: dragState.current.startPan.y + dy });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + direction * ZOOM_STEP)));
  }

  const hasCycles = layout.cycles.length > 0;
  const showCpmContent = isCriticalPathMode && !criticalPath.degraded;
  // Mirrors GraphNode's own height calc (isCriticalPathMode prop = showCpmContent
  // below) so canvas sizing/edge anchors always match what actually renders —
  // a degraded graph keeps nodes at NODE_HEIGHT even while the toggle is on,
  // since no slack row renders when there's nothing valid to show.
  const nodeHeight = showCpmContent ? NODE_HEIGHT_CPM : NODE_HEIGHT;

  const toggle = (
    <div className={styles.header}>
      <Button
        variant={isCriticalPathMode ? "primary" : "default"}
        onClick={onToggleCriticalPathMode}
        aria-pressed={isCriticalPathMode}
      >
        Critical Path Mode
      </Button>
    </div>
  );

  if (layout.nodes.length === 0) {
    return (
      <div className={styles.root}>
        {toggle}
        <div className={styles.emptyWrap}>
          <EmptyState icon={<BlockedIcon size={18} />} message="No dependencies to show for this project" />
        </div>
      </div>
    );
  }

  const contentWidth = Math.max(...layout.nodes.map((n) => n.x)) + NODE_WIDTH + 80;
  const contentHeight = Math.max(...layout.nodes.map((n) => n.y)) + nodeHeight + 80;

  return (
    <div className={styles.root}>
      {toggle}

      {hasCycles && (
        <div className={styles.warningStrip} role="status">
          <span className={styles.warningLabel}>Cycle detected</span>
          <span className={styles.warningDetail}>
            {layout.cycles
              .map((cycle) => cycle.map((id) => titleOf(tasksById, id)).join(" → "))
              .join("; ")}
          </span>
        </div>
      )}

      {isCriticalPathMode && criticalPath.degraded && (
        <div className={styles.warningStrip} role="status">
          <span className={styles.warningLabel}>Critical path unavailable</span>
          <span className={styles.warningDetail}>
            This graph contains a cycle, so earliest/latest start and slack can&apos;t be computed. Resolve the
            cycle above to use Critical Path Mode.
          </span>
        </div>
      )}

      <div
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className={styles.surface}
          style={{
            width: contentWidth,
            height: contentHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg className={styles.edgeLayer} width={contentWidth} height={contentHeight}>
            <defs>
              <marker id="graph-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" className={styles.arrowHead} />
              </marker>
              <marker
                id="graph-arrow-back"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 z" className={styles.arrowHeadBack} />
              </marker>
              <marker
                id="graph-arrow-critical"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 z" className={styles.arrowHeadCritical} />
              </marker>
            </defs>
            {layout.edges.map((edge) => {
              const fromNode = nodeById.get(edge.from);
              const toNode = nodeById.get(edge.to);
              if (!fromNode || !toNode) return null;

              const fromCpm = criticalPath.tasks.get(edge.from);
              const toCpm = criticalPath.tasks.get(edge.to);
              const isCriticalEdge =
                showCpmContent && fromCpm?.isCritical === true && toCpm?.isCritical === true && fromCpm.earlyFinish === toCpm.earlyStart;
              const isDimmedEdge = showCpmContent && !isCriticalEdge;

              return (
                <GraphEdge
                  key={edge.id}
                  edge={edge}
                  from={anchorOf(fromNode.x, fromNode.y, nodeHeight)}
                  to={anchorOf(toNode.x, toNode.y, nodeHeight)}
                  isCritical={isCriticalEdge}
                  isDimmed={isDimmedEdge}
                />
              );
            })}
          </svg>

          <div className={styles.nodeLayer}>
            {layout.nodes.map((node) => {
              const task = tasksById.get(node.id);
              if (!task) return null;
              return (
                <GraphNode
                  key={node.id}
                  task={task}
                  x={node.x}
                  y={node.y}
                  isSelected={node.id === selectedTaskId}
                  onActivate={onNodeActivate}
                  isCriticalPathMode={showCpmContent}
                  cpm={showCpmContent ? criticalPath.tasks.get(node.id) : undefined}
                />
              );
            })}
          </div>
        </div>

        <div className={styles.zoomControls}>
          <button type="button" className={styles.zoomButton} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))} aria-label="Zoom out">
            −
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={styles.zoomButton} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))} aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
