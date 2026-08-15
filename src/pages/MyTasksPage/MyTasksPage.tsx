import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@/pages/MyTasksPage/MyTasksPage.module.css";
import { useMyTasks, type MyTaskRow } from "@/store";
import { CURRENT_USER_ID } from "@/lib/constants";
import { Card } from "@/components/primitives/Card";
import { EmptyState } from "@/components/primitives/EmptyState";
import { StatusPill } from "@/components/primitives/StatusPill";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import { AbsentValue } from "@/components/primitives/AbsentValue";
import { OverdueChip } from "@/components/primitives/OverdueChip";
import { Table, type TableColumn, type TableRowData } from "@/components/primitives/Table";
import { TasksIcon } from "@/components/icons";
import { formatDate, isOverdue } from "@/lib/format";

/**
 * The only cross-project view in the app — every task assigned to
 * CURRENT_USER_ID, flat, across all projects. Read-only: no filtering, no
 * sorting controls, no bulk actions, no assignment UI (see Block 17 scope).
 * Reuses Table as-is (no fork, no additive change) — a MyTaskRow is just
 * another generic row shape, same as SectionPage's TaskView rows.
 */
export function MyTasksPage() {
  const navigate = useNavigate();
  const rows = useMyTasks(CURRENT_USER_ID);

  const tableRows: TableRowData<MyTaskRow>[] = useMemo(() => rows.map((row) => ({ id: row.task.id, data: row })), [rows]);

  const columns: TableColumn<MyTaskRow>[] = useMemo(
    () => [
      {
        id: "task",
        header: "Task",
        cardSlot: "title",
        render: (row) => <span className={styles.taskTitleText}>{row.task.title}</span>,
      },
      {
        id: "project",
        header: "Project",
        width: "content",
        cardSlot: "title",
        render: (row) => <span className={styles.projectText}>{row.projectName}</span>,
      },
      {
        id: "section",
        header: "Section",
        width: "content",
        cardSlot: "meta",
        render: (row) => (row.sectionName ? <span className={styles.sectionText}>{row.sectionName}</span> : <AbsentValue />),
      },
      {
        id: "status",
        header: "Status",
        width: "content",
        cardSlot: "meta",
        render: (row) => <StatusPill status={row.task.state.status} />,
      },
      {
        id: "priority",
        header: "Priority",
        width: "content",
        cardSlot: "title",
        render: (row) => <PriorityChip priority={row.task.priority} />,
      },
      {
        id: "due",
        header: "Due",
        align: "end",
        width: "content",
        cardSlot: "footerEnd",
        render: (row) => {
          const { task } = row;
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
    ],
    [],
  );

  function handleRowActivate(row: MyTaskRow) {
    if (row.sectionId) {
      navigate(`/projects/${row.projectId}/sections/${row.sectionId}?task=${row.task.id}`);
    } else {
      navigate(`/projects/${row.projectId}`);
    }
  }

  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>My Tasks</h1>
            <p className={styles.description}>Every task assigned to you, across all projects.</p>
          </div>
        </div>
      </Card>

      <Card flush>
        {tableRows.length === 0 ? (
          <EmptyState icon={<TasksIcon size={18} />} message="No tasks assigned to you" />
        ) : (
          <Table columns={columns} rows={tableRows} expandedIds={new Set()} onToggleExpand={() => {}} onRowActivate={handleRowActivate} />
        )}
      </Card>
    </div>
  );
}
