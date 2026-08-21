import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import styles from "@/pages/SectionPage/SectionPage.module.css";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { TASK_INTELLIGENCE_BY_ID, DELAY_CAUSES, HISTORY } from "@/fixtures";
import { useSection, useTask, useComments, useTasksByIds, useTasksContext, baseProjectOf } from "@/store";
import { CURRENT_USER_ID } from "@/lib/constants";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { DropdownPill } from "@/components/primitives/DropdownPill";
import { EmptyState } from "@/components/primitives/EmptyState";
import { AvatarGroup } from "@/components/primitives/AvatarGroup";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import { StatusPill } from "@/components/primitives/StatusPill";
import { WaitingIndicator } from "@/components/primitives/WaitingIndicator";
import { AbsentValue } from "@/components/primitives/AbsentValue";
import { OverdueChip } from "@/components/primitives/OverdueChip";
import { RiskBadge } from "@/components/primitives/RiskBadge";
import { Table, type TableColumn, type TableRowData } from "@/components/primitives/Table";
import { TaskPanel } from "@/components/task/TaskPanel";
import { NewTaskDialog } from "@/components/task/NewTaskDialog";
import { TasksIcon, ComposeIcon, LinkIcon } from "@/components/icons";
import { formatDate, isOverdue, riskTierOf } from "@/lib/format";
import type { TaskView } from "@/types/ui";

const SORT_ITEMS = [
  { id: "default", label: "Default" },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" },
  { id: "due", label: "Due" },
];

const SORT_LABEL: Record<string, string> = Object.fromEntries(SORT_ITEMS.map((item) => [item.id, item.label]));

function sortTasks(tasks: TaskView[], sortId: string): TaskView[] {
  if (sortId === "priority") {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
  }
  if (sortId === "status") {
    const order = { to_do: 0, in_progress: 1, waiting: 2, blocked: 3, done: 4 };
    return [...tasks].sort((a, b) => order[a.state.status] - order[b.state.status]);
  }
  if (sortId === "due") {
    return [...tasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }
  // "default" — position-ascending, ties broken by id for determinism. This
  // is also the only sort under which drag-reorder is enabled (see
  // draggable={sortId === "default"} below): dragging while a Priority/
  // Status/Due sort is active would swap `position` while the visible order
  // stays sort-derived, silently lying about what the drag just did.
  return [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id));
}

export function SectionPage() {
  const { projectId, sectionId } = useParams<{ projectId: string; sectionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useTasksContext();
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const project = projectId ? baseProjectOf(projectId, state.projectsById) : undefined;
  const section = useSection(sectionId);

  const sortId = searchParams.get("sort") ?? "default";

  const expandedIds = useMemo(() => {
    const raw = searchParams.get("expanded");
    return new Set(raw ? raw.split(",").filter(Boolean) : []);
  }, [searchParams]);

  const sortedTasks = useMemo(() => (section ? sortTasks(section.tasks, sortId) : []), [section, sortId]);

  // Every subtask id referenced across this section's top-level tasks,
  // resolved to full live TaskView rows the same way the pre-store code
  // resolved them via TASK_BY_ID — a ref alone can't render a child row.
  const subtaskIds = useMemo(() => sortedTasks.flatMap((task) => task.subtasks.map((ref) => ref.id)), [sortedTasks]);
  const subtasksById = useTasksByIds(subtaskIds);
  const subtaskLookup = useMemo(() => new Map(subtasksById.map((task) => [task.id, task])), [subtasksById]);

  const rows: TableRowData<TaskView>[] = useMemo(
    () =>
      sortedTasks.map((task) => ({
        id: task.id,
        data: task,
        children:
          task.subtasks.length > 0
            ? task.subtasks
                .map((ref) => subtaskLookup.get(ref.id))
                .filter((subtask): subtask is TaskView => subtask !== undefined)
                .map((subtask) => ({ id: subtask.id, data: subtask }))
            : undefined,
      })),
    [sortedTasks, subtaskLookup],
  );

  const columns: TableColumn<TaskView>[] = useMemo(
    () => [
      {
        id: "task",
        header: "Task",
        sortable: false,
        cardSlot: "title",
        render: (task) => (
          <div className={styles.taskTitleCell}>
            <span className={styles.taskTitleText}>{task.title}</span>
            {task.subtasks.length > 0 && (
              <span className={styles.subtaskCount}>{task.subtasks.length}</span>
            )}
          </div>
        ),
      },
      {
        id: "assignees",
        header: "Assignees",
        width: "content",
        cardSlot: "meta",
        render: (task) => <AvatarGroup members={task.assignees} size={24} />,
      },
      {
        id: "priority",
        header: "Priority",
        width: "content",
        cardSlot: "title",
        render: (task) => <PriorityChip priority={task.priority} />,
      },
      {
        id: "status",
        header: "Status",
        width: "content",
        cardSlot: "meta",
        render: (task) => <StatusPill status={task.state.status} />,
      },
      {
        id: "waiting",
        header: "Waiting",
        width: "content",
        cardSlot: "meta",
        render: (task) =>
          task.state.status === "waiting" && task.state.waitingSince !== null && task.state.delayCause !== null ? (
            <span className={styles.waitingCell}>
              <WaitingIndicator waitingSince={task.state.waitingSince} causeName={task.state.delayCause.name} />
            </span>
          ) : (
            <AbsentValue />
          ),
      },
      {
        id: "due",
        header: "Due",
        align: "end",
        width: "content",
        cardSlot: "footerEnd",
        render: (task) => {
          if (!task.dueDate) return <AbsentValue />;
          const overdue = task.state.status !== "done" && isOverdue(task.dueDate);
          return (
            <span className={styles.dueCell}>
              <span className={overdue ? `${styles.dueText} ${styles.dueOverdue} tabular` : `${styles.dueText} tabular`}>
                {formatDate(task.dueDate)}
              </span>
              {overdue && <OverdueChip />}
            </span>
          );
        },
      },
      {
        id: "risk",
        header: "Risk",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        cardSlot: "footerEnd",
        render: (task) => {
          const intelligence = TASK_INTELLIGENCE_BY_ID[task.id];
          if (!intelligence) return <AbsentValue />;
          return <RiskBadge tier={riskTierOf(intelligence.riskScore)} />;
        },
      },
      {
        id: "deps",
        header: "Deps",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (task) => {
          // Refs are refreshed against live task state before this prop arrives
          // (see refreshRef in src/store/selectors.ts), so a ref's isDeleted
          // reflects whether the task it points at is still around — a deleted
          // blocker shouldn't keep counting toward this column.
          const count = task.dependsOn.filter((ref) => !ref.isDeleted).length + task.blocks.filter((ref) => !ref.isDeleted).length;
          if (count === 0) return <AbsentValue />;
          return (
            <span className={styles.depsCell}>
              <span className="tabular">{count}</span>
              <span className={styles.depsLinkIcon}>
                <LinkIcon size={14} />
              </span>
            </span>
          );
        },
      },
    ],
    [],
  );

  const openTaskId = searchParams.get("task");
  const openTaskView = useTask(openTaskId ?? undefined);
  const openTaskComments = useComments(openTaskId ?? undefined);

  if (!project || !section || section.projectId !== project.id) {
    return <NotFoundPage message="This section doesn't exist." />;
  }

  function handleSortChange(id: string) {
    const next = new URLSearchParams(searchParams);
    if (id === "default") next.delete("sort");
    else next.set("sort", id);
    setSearchParams(next, { replace: true });
  }

  function handleToggleExpand(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    const params = new URLSearchParams(searchParams);
    if (next.size === 0) params.delete("expanded");
    else params.set("expanded", Array.from(next).join(","));
    setSearchParams(params, { replace: true });
  }

  function handleReorder(taskId: string, direction: "up" | "down") {
    dispatch({ type: "REORDER_TASK", taskId, direction });
  }

  function openTask(taskId: string) {
    const params = new URLSearchParams(searchParams);
    params.set("task", taskId);
    setSearchParams(params);
  }

  function handleRowActivate(task: TaskView) {
    openTask(task.id);
  }

  function closeTaskPanel() {
    const params = new URLSearchParams(searchParams);
    params.delete("task");
    setSearchParams(params);
  }

  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>{section.name}</h1>
            {section.description && <p className={styles.description}>{section.description}</p>}
          </div>
          <div className={styles.headerActions}>
            <DropdownPill
              label={`Sort: ${SORT_LABEL[sortId] ?? "Default"}`}
              items={SORT_ITEMS.map((item) => ({ ...item, selected: item.id === sortId }))}
              onSelect={handleSortChange}
            />
            <Button variant="primary" icon={<ComposeIcon size={16} />} onClick={() => setIsNewTaskOpen(true)}>
              New task
            </Button>
          </div>
        </div>
      </Card>

      <Card flush>
        {rows.length === 0 ? (
          <EmptyState
            icon={<TasksIcon size={18} />}
            message="No tasks in this section"
            action={{ label: "New task", onClick: () => setIsNewTaskOpen(true) }}
          />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onRowActivate={handleRowActivate}
            draggable={sortId === "default"}
            onReorder={sortId === "default" ? handleReorder : undefined}
          />
        )}
      </Card>

      {openTaskView && (
        <TaskPanel
          task={openTaskView}
          intelligence={TASK_INTELLIGENCE_BY_ID[openTaskView.id]}
          delayCauses={DELAY_CAUSES}
          projectMembers={project.members}
          comments={openTaskComments}
          history={HISTORY.filter((entry) => entry.taskId === openTaskView.id)}
          onClose={closeTaskPanel}
          onSubtaskActivate={openTask}
          onSave={(patch) => {
            dispatch({ type: "UPDATE_TASK", taskId: openTaskView.id, patch });
            closeTaskPanel();
          }}
          onDelete={() => {
            dispatch({ type: "DELETE_TASK", taskId: openTaskView.id });
            closeTaskPanel();
          }}
          onAddComment={(body) => {
            dispatch({ type: "ADD_COMMENT", taskId: openTaskView.id, authorId: CURRENT_USER_ID, body });
          }}
          onCreateSubtask={(draft) => dispatch({ type: "CREATE_TASK", draft })}
        />
      )}

      <NewTaskDialog
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        projectId={project.id}
        sectionId={section.id}
        parentTaskId={null}
        projectMembers={project.members}
        onCreate={(draft) => dispatch({ type: "CREATE_TASK", draft })}
      />
    </div>
  );
}
