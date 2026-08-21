import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "@/pages/ProjectPage/ProjectPage.module.css";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { TASK_INTELLIGENCE_BY_ID, DELAY_CAUSES } from "@/fixtures";
import { useProject, useTasksContext } from "@/store";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { IconTile } from "@/components/primitives/IconTile";
import { ProjectMark } from "@/components/primitives/ProjectMark";
import { AvatarGroup } from "@/components/primitives/AvatarGroup";
import { AbsentValue } from "@/components/primitives/AbsentValue";
import { StripedBar } from "@/components/primitives/StripedBar";
import { Table, type TableColumn, type TableRowData } from "@/components/primitives/Table";
import { NewSectionDialog } from "@/components/project/NewSectionDialog";
import { TasksIcon, HistoryIcon, BlockedIcon, ComposeIcon } from "@/components/icons";
import { formatDuration, projectMarkOf, sentenceCase } from "@/lib/format";
import type { SectionView, TaskIntelligence, TaskView } from "@/types/ui";

interface SectionRow {
  section: SectionView;
  total: number;
  inProgress: number;
  waiting: number;
  blocked: number;
  done: number;
  highRisk: number;
  progressPercent: number;
}

function intelligenceOf(task: TaskView): TaskIntelligence | undefined {
  return TASK_INTELLIGENCE_BY_ID[task.id];
}

function sectionStats(section: SectionView): SectionRow {
  const tasks = section.tasks;
  let inProgress = 0;
  let waiting = 0;
  let blocked = 0;
  let done = 0;
  let highRisk = 0;

  for (const task of tasks) {
    const status = task.state.status;
    if (status === "in_progress") inProgress += 1;
    if (status === "waiting") waiting += 1;
    if (status === "blocked") blocked += 1;
    if (status === "done") done += 1;

    const intelligence = intelligenceOf(task);
    if (intelligence && intelligence.riskScore >= 61) highRisk += 1;
  }

  return {
    section,
    total: tasks.length,
    inProgress,
    waiting,
    blocked,
    done,
    highRisk,
    progressPercent: tasks.length === 0 ? 0 : (done / tasks.length) * 100,
  };
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const { dispatch } = useTasksContext();
  const [isNewSectionOpen, setIsNewSectionOpen] = useState(false);

  const allTasks = useMemo(() => (project ? project.sections.flatMap((s) => s.tasks) : []), [project]);

  const sectionRows = useMemo(() => (project ? project.sections.map(sectionStats) : []), [project]);

  const waitingHoursTotal = useMemo(() => {
    let total = 0;
    for (const task of allTasks) {
      if (task.state.status === "waiting" && task.state.waitingSince !== null) {
        total += (Date.now() - new Date(task.state.waitingSince).getTime()) / (1000 * 60 * 60);
      }
    }
    return total;
  }, [allTasks]);

  const waitingByCause = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of allTasks) {
      if (task.state.status === "waiting" && task.state.delayCause !== null) {
        const causeId = task.state.delayCause.id;
        counts.set(causeId, (counts.get(causeId) ?? 0) + 1);
      }
    }
    return DELAY_CAUSES.map((cause) => ({ cause, count: counts.get(cause.id) ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [allTasks]);

  const maxCauseCount = waitingByCause[0]?.count ?? 0;

  const blockedCount = useMemo(() => allTasks.filter((t) => t.state.status === "blocked").length, [allTasks]);
  const overdueCount = useMemo(
    () => allTasks.filter((t) => t.state.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < Date.now()).length,
    [allTasks],
  );
  const highRiskCount = useMemo(
    () => allTasks.filter((t) => (intelligenceOf(t)?.riskScore ?? 0) >= 61).length,
    [allTasks],
  );

  const totalCount = allTasks.length;
  const inProgressCount = useMemo(() => allTasks.filter((t) => t.state.status === "in_progress").length, [allTasks]);

  const sectionColumns: TableColumn<SectionRow>[] = useMemo(
    () => [
      {
        id: "section",
        header: "Section",
        cardSlot: "title",
        render: (row) => (
          <div className={styles.sectionCell}>
            <div className={styles.sectionName}>{row.section.name}</div>
            {row.section.description && <div className={styles.sectionDescription}>{row.section.description}</div>}
          </div>
        ),
      },
      {
        id: "total",
        header: "Total",
        align: "end",
        width: "content",
        cardSlot: "meta",
        render: (row) => <span className={row.total === 0 ? `tabular ${styles.countZero}` : "tabular"}>{row.total}</span>,
      },
      {
        id: "inProgress",
        header: "In progress",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (row) => <span className={row.inProgress === 0 ? `tabular ${styles.countZero}` : "tabular"}>{row.inProgress}</span>,
      },
      {
        id: "waiting",
        header: "Waiting",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (row) => <span className={row.waiting === 0 ? `tabular ${styles.countZero}` : "tabular"}>{row.waiting}</span>,
      },
      {
        id: "blocked",
        header: "Blocked",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (row) => <span className={row.blocked === 0 ? `tabular ${styles.countZero}` : "tabular"}>{row.blocked}</span>,
      },
      {
        id: "done",
        header: "Done",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (row) => <span className={row.done === 0 ? `tabular ${styles.countZero}` : "tabular"}>{row.done}</span>,
      },
      {
        id: "highRisk",
        header: "High risk",
        align: "end",
        width: "content",
        cardSlot: "footerStart",
        render: (row) =>
          row.highRisk > 0 ? (
            <button
              type="button"
              className={styles.riskLink}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/projects/${project?.id}/sections/${row.section.id}`);
              }}
            >
              {row.highRisk}
            </button>
          ) : (
            <span className={`tabular ${styles.countZero}`}>0</span>
          ),
      },
      {
        id: "progress",
        header: "Progress",
        align: "end",
        width: "content",
        cardSlot: "footerEnd",
        render: (row) => (
          <span className={styles.progressCell}>
            <span className={styles.progressBar}>
              <StripedBar
                segments={[
                  { status: "in_progress", count: row.inProgress },
                  { status: "waiting", count: row.waiting },
                  { status: "blocked", count: row.blocked },
                  { status: "to_do", count: row.total - row.inProgress - row.waiting - row.blocked - row.done },
                  { status: "done", count: row.done },
                ]}
                showLegend={false}
              />
            </span>
            <span className={`${styles.progressPercent} tabular`}>{Math.round(row.progressPercent)}%</span>
          </span>
        ),
      },
    ],
    [navigate, project],
  );

  if (!project) {
    return <NotFoundPage message="This project doesn't exist." />;
  }

  const sectionRowData: TableRowData<SectionRow>[] = sectionRows.map((row) => ({ id: row.section.id, data: row }));

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <ProjectMark mark={projectMarkOf(project.name)} name={project.name} size={44} />
        <div className={styles.headerText}>
          <h1 className={styles.headerName}>{project.name}</h1>
          {project.description && <p className={styles.headerDescription}>{project.description}</p>}
        </div>
        <div className={styles.headerActions}>
          <AvatarGroup members={project.members} size={28} />
          <div className={styles.headerButtons}>
            <Button variant="default" onClick={() => navigate(`/projects/${project.id}/graph`)}>
              Graph
            </Button>
            <Button variant="default" onClick={() => navigate(`/projects/${project.id}/insights`)}>
              Insights
            </Button>
            <Button variant="primary" icon={<ComposeIcon size={16} />} onClick={() => setIsNewSectionOpen(true)}>
              Section
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTopRow}>
            <IconTile icon={<TasksIcon size={18} />} />
          </div>
          <span className={styles.statLabel}>Total</span>
          <div className={styles.statFigureRow}>
            <span className={styles.statFigure}>{totalCount}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTopRow}>
            <IconTile icon={<TasksIcon size={18} />} />
          </div>
          <span className={styles.statLabel}>In progress</span>
          <div className={styles.statFigureRow}>
            <span className={styles.statFigure}>{inProgressCount}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTopRow}>
            <IconTile icon={<HistoryIcon size={18} />} />
          </div>
          <span className={styles.statLabel}>Waiting hours</span>
          <div className={styles.statFigureRow}>
            <span className={styles.statFigure}>{formatDuration(waitingHoursTotal)}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTopRow}>
            <IconTile icon={<BlockedIcon size={18} />} />
          </div>
          <span className={styles.statLabel}>Blocked</span>
          <div className={styles.statFigureRow}>
            <span className={styles.statFigure}>{blockedCount}</span>
          </div>
        </div>
      </div>

      <div className={styles.bodyRow}>
        <Card
          title="Sections"
          subtitle="Modules in this project."
          flush
          footer={{
            message: sectionRowData.length === 0 ? "No sections yet." : `${sectionRowData.length} section${sectionRowData.length === 1 ? "" : "s"}.`,
            linkLabel: "Add section",
            onLinkClick: () => setIsNewSectionOpen(true),
          }}
        >
          {sectionRowData.length === 0 ? (
            <div className={styles.absentBlock}>
              <AbsentValue />
            </div>
          ) : (
            <Table
              columns={sectionColumns}
              rows={sectionRowData}
              expandedIds={new Set()}
              onToggleExpand={() => {}}
              onRowActivate={(row) => navigate(`/projects/${project.id}/sections/${row.section.id}`)}
            />
          )}
        </Card>

        <div className={styles.intelligenceStack}>
          <Card title="Waiting" subtitle="Where time is going.">
            {waitingByCause.length === 0 ? (
              <AbsentValue />
            ) : (
              <>
                <span className={`${styles.waitingTotal} tabular`}>{formatDuration(waitingHoursTotal)}</span>
                <div className={styles.waitingRows}>
                  {waitingByCause.map(({ cause, count }) => (
                    <div key={cause.id} className={styles.waitingRow}>
                      <span className={styles.waitingCauseLabel}>{sentenceCase(cause.name)}</span>
                      <span className={styles.waitingInlineBarTrack}>
                        <span
                          className={styles.waitingInlineBarFill}
                          style={{ width: `${maxCauseCount === 0 ? 0 : (count / maxCauseCount) * 100}%` }}
                        />
                      </span>
                      <span className={styles.waitingCauseCount}>{count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card title="Handoffs" subtitle="Delay between owners.">
            <div className={styles.absentBlock}>
              <AbsentValue />
            </div>
          </Card>

          <Card title="Context switching" subtitle="Task switches per member.">
            <div className={styles.absentBlock}>
              <AbsentValue />
            </div>
          </Card>

          <Card title="Warnings">
            {blockedCount === 0 && overdueCount === 0 && highRiskCount === 0 ? (
              <div className={styles.noWarnings}>No warnings</div>
            ) : (
              <div className={styles.warningsList}>
                {blockedCount > 0 && (
                  <div className={styles.warningRow}>
                    <span className={styles.warningDot} />
                    {blockedCount} blocked
                  </div>
                )}
                {overdueCount > 0 && (
                  <div className={styles.warningRow}>
                    <span className={styles.warningDot} />
                    {overdueCount} overdue
                  </div>
                )}
                {highRiskCount > 0 && (
                  <div className={styles.warningRow}>
                    <span className={styles.warningDot} />
                    {highRiskCount} high-risk
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <NewSectionDialog
        isOpen={isNewSectionOpen}
        onClose={() => setIsNewSectionOpen(false)}
        onCreate={(name) => dispatch({ type: "CREATE_SECTION", projectId: project.id, name })}
      />
    </div>
  );
}
