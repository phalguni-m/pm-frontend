import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styles from "@/pages/GraphPage/GraphPage.module.css";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Card } from "@/components/primitives/Card";
import { EmptyState } from "@/components/primitives/EmptyState";
import { StatusPill } from "@/components/primitives/StatusPill";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import { Button } from "@/components/primitives/Button";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { BlockedIcon } from "@/components/icons";
import { DEPENDENCIES } from "@/fixtures";
import { useTasksContext, baseProjectOf } from "@/store";
import { computeGraphLayout } from "@/lib/graph";
import { computeCriticalPath, type TaskCPMResult } from "@/lib/criticalPath";
import type { TaskView } from "@/types/ui";

interface TaskDepRow {
  task: TaskView;
  blocking: TaskView[];
  blockedBy: TaskView[];
  cpm?: TaskCPMResult;
}

/**
 * Below --bp-tablet (900px, src/styles/tokens.css) the SVG
 * canvas is unusable — too little room to pan/zoom meaningfully — so a
 * grouped blocking/blocked-by list renders instead. Both views mount
 * simultaneously and are toggled by CSS media queries in
 * GraphPage.module.css, the same dual-render pattern Table uses for its
 * grid/card breakpoint (see Table.module.css), rather than a JS media-query
 * listener. Critical Path Mode (?cpm=1) applies to both views — the list
 * shows the same slack/critical-marker readout the canvas nodes do.
 */
export function GraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useTasksContext();
  const project = projectId ? baseProjectOf(projectId, state.projectsById) : undefined;

  const projectTasks = useMemo(() => {
    if (!project) return [];
    return Object.values(state.tasksById).filter((task) => task.projectId === project.id && !task.isDeleted);
  }, [project, state.tasksById]);

  const taskIds = useMemo(() => projectTasks.map((task) => task.id), [projectTasks]);

  const projectDeps = useMemo(() => {
    const idSet = new Set(taskIds);
    return DEPENDENCIES.filter(
      (dep) => dep.blocking_task_id && dep.blocked_task_id && idSet.has(dep.blocking_task_id) && idSet.has(dep.blocked_task_id),
    );
  }, [taskIds]);

  const layout = useMemo(() => computeGraphLayout(projectDeps, taskIds), [projectDeps, taskIds]);
  const criticalPath = useMemo(() => computeCriticalPath(layout, projectTasks), [layout, projectTasks]);

  const selectedTaskId = searchParams.get("task") ?? undefined;
  const isCriticalPathMode = searchParams.get("cpm") === "1";
  const showCpmContent = isCriticalPathMode && !criticalPath.degraded;

  const listRows: TaskDepRow[] = useMemo(() => {
    const tasksById = new Map(projectTasks.map((task) => [task.id, task]));
    return projectTasks
      .map((task) => {
        const blocking = projectDeps
          .filter((dep) => dep.blocking_task_id === task.id)
          .map((dep) => tasksById.get(dep.blocked_task_id!))
          .filter((t): t is TaskView => t !== undefined);
        const blockedBy = projectDeps
          .filter((dep) => dep.blocked_task_id === task.id)
          .map((dep) => tasksById.get(dep.blocking_task_id!))
          .filter((t): t is TaskView => t !== undefined);
        return { task, blocking, blockedBy, cpm: criticalPath.tasks.get(task.id) };
      })
      .filter((row) => row.blocking.length > 0 || row.blockedBy.length > 0);
  }, [projectTasks, projectDeps, criticalPath]);

  if (!project) {
    return <NotFoundPage message="This project doesn't exist." />;
  }

  function handleNodeActivate(taskId: string) {
    const task = projectTasks.find((t) => t.id === taskId);
    if (!task || !task.sectionId) return;
    navigate(`/projects/${project!.id}/sections/${task.sectionId}?task=${taskId}`);
  }

  function handleToggleCriticalPathMode() {
    const next = new URLSearchParams(searchParams);
    if (isCriticalPathMode) next.delete("cpm");
    else next.set("cpm", "1");
    setSearchParams(next, { replace: true });
  }

  const isEmpty = layout.nodes.length === 0 || projectDeps.length === 0;

  return (
    <div className={styles.root}>
      <PageHeader title={`${project.name} — Dependency graph`} />

      {isEmpty ? (
        <Card flush>
          <EmptyState icon={<BlockedIcon size={18} />} message="No dependencies to show for this project" />
        </Card>
      ) : (
        <>
          <Card flush>
            <div className={styles.canvasView}>
              <DependencyGraph
                layout={layout}
                tasks={projectTasks}
                selectedTaskId={selectedTaskId}
                onNodeActivate={handleNodeActivate}
                criticalPath={criticalPath}
                isCriticalPathMode={isCriticalPathMode}
                onToggleCriticalPathMode={handleToggleCriticalPathMode}
              />
            </div>
          </Card>

          <div className={styles.listView}>
            <Card
              flush
              title="Blocking / blocked-by"
              subtitle={`${project.name}, grouped per task.`}
              actions={
                <Button
                  variant={isCriticalPathMode ? "primary" : "default"}
                  onClick={handleToggleCriticalPathMode}
                  aria-pressed={isCriticalPathMode}
                >
                  Critical Path Mode
                </Button>
              }
            >
              {isCriticalPathMode && criticalPath.degraded && (
                <div className={styles.listDegraded}>
                  <span className={styles.listDegradedLabel}>Critical path unavailable</span>
                  <span>
                    This graph contains a cycle, so earliest/latest start and slack can&apos;t be computed. Resolve
                    the cycle to use Critical Path Mode.
                  </span>
                </div>
              )}
              <div className={styles.listWrap}>
                {listRows.map(({ task, blocking, blockedBy, cpm }) => (
                  <button
                    type="button"
                    key={task.id}
                    className={styles.listRow}
                    onClick={() => handleNodeActivate(task.id)}
                  >
                    <div className={styles.listRowHeader}>
                      <span className={styles.listRowTitle}>{task.title}</span>
                      <StatusPill status={task.state.status} />
                      <PriorityChip priority={task.priority} />
                      {showCpmContent && cpm && (
                        <span className={cpm.isCritical ? `${styles.listSlack} ${styles.listSlackCritical}` : styles.listSlack}>
                          {cpm.isCritical ? "Critical" : `Slack ${cpm.slack}d`}
                          {cpm.isEstimatedDuration && " (est.)"}
                        </span>
                      )}
                    </div>
                    {blockedBy.length > 0 && (
                      <div className={styles.listGroup}>
                        <span className={styles.listGroupLabel}>Blocked by</span>
                        <ul className={styles.listGroupItems}>
                          {blockedBy.map((t) => (
                            <li key={t.id}>{t.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {blocking.length > 0 && (
                      <div className={styles.listGroup}>
                        <span className={styles.listGroupLabel}>Blocking</span>
                        <ul className={styles.listGroupItems}>
                          {blocking.map((t) => (
                            <li key={t.id}>{t.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
