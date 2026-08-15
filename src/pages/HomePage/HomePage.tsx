import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@/pages/HomePage/HomePage.module.css";
import { DELAY_CAUSES } from "@/fixtures";
import { useProjectsIndex } from "@/store";
import { Card } from "@/components/primitives/Card";
import { IconTile } from "@/components/primitives/IconTile";
import { StripedBar } from "@/components/primitives/StripedBar";
import { ResponsiveTallyMeter } from "@/components/primitives/TallyMeter";
import { AbsentValue } from "@/components/primitives/AbsentValue";
import { CardGrid } from "@/components/primitives/CardGrid";
import { ProjectsTable, type ProjectsRow } from "@/components/project/ProjectsTable";
import { TimelineCard, type TimelineTask } from "@/components/project/TimelineCard";
import { TasksIcon, HistoryIcon, BlockedIcon } from "@/components/icons";
import { formatDuration } from "@/lib/format";
import type { StatusCounts, TaskView } from "@/types/ui";

function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

export function HomePage() {
  const navigate = useNavigate();
  const projects = useProjectsIndex();

  const allTasks = useMemo(
    () => projects.flatMap((project) => project.sections.flatMap((section) => section.tasks)),
    [projects],
  );

  const statusCounts = useMemo(() => {
    const counts = emptyCounts();
    for (const project of projects) {
      for (const status of Object.keys(counts) as (keyof StatusCounts)[]) {
        counts[status] += project.statusCounts[status];
      }
    }
    return counts;
  }, [projects]);

  const totalCount = statusCounts.to_do + statusCounts.in_progress + statusCounts.waiting + statusCounts.blocked + statusCounts.done;

  const waitingHoursTotal = useMemo(() => {
    let total = 0;
    for (const task of allTasks) {
      if (task.state.status === "waiting") {
        total += (Date.now() - new Date(task.state.waitingSince).getTime()) / (1000 * 60 * 60);
      }
    }
    return total;
  }, [allTasks]);

  const waitingByCause = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of allTasks) {
      if (task.state.status === "waiting") {
        const causeId = task.state.delayCause.id;
        counts.set(causeId, (counts.get(causeId) ?? 0) + 1);
      }
    }
    return DELAY_CAUSES.map((cause) => ({ cause, count: counts.get(cause.id) ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [allTasks]);

  const blockedCount = useMemo(() => allTasks.filter((t: TaskView) => t.state.status === "blocked").length, [allTasks]);
  const overdueCount = useMemo(
    () => allTasks.filter((t: TaskView) => t.state.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < Date.now()).length,
    [allTasks],
  );

  const completionPercent = totalCount === 0 ? 0 : (statusCounts.done / totalCount) * 100;

  const timelineTasks: TimelineTask[] = useMemo(
    () => projects.flatMap((project) => project.sections.flatMap((section) => section.tasks.map((task) => ({ task, projectName: project.name })))),
    [projects],
  );

  function handleRowActivate(row: ProjectsRow) {
    if (row.kind === "project") {
      navigate(`/projects/${row.project.id}`);
    } else if (row.kind === "section") {
      navigate(`/projects/${row.project.id}/sections/${row.section.id}`);
    } else {
      navigate(`/projects/${row.project.id}/sections/${row.task.sectionId}?task=${row.task.id}`);
    }
  }

  function handleTimelineTaskActivate(task: TaskView) {
    const project = projects.find((p) => p.sections.some((s) => s.tasks.some((t) => t.id === task.id)));
    if (!project || !task.sectionId) return;
    navigate(`/projects/${project.id}/sections/${task.sectionId}?task=${task.id}`);
  }

  return (
    <div className={styles.root}>
      <CardGrid>
        <Card
          icon={<IconTile icon={<TasksIcon size={18} />} />}
          title="Overall Tasks"
          subtitle={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}.`}
          footer={{ message: "View all tasks", linkLabel: "View all", onLinkClick: () => navigate("/my-tasks") }}
        >
          <div className={styles.overallHeader}>
            <span className={styles.overallLabel}>Tasks</span>
            <span className={`${styles.overallTotal} tabular`}>{totalCount}</span>
          </div>
          <StripedBar
            segments={[
              { status: "in_progress", count: statusCounts.in_progress },
              { status: "waiting", count: statusCounts.waiting },
              { status: "blocked", count: statusCounts.blocked },
              { status: "to_do", count: statusCounts.to_do },
              { status: "done", count: statusCounts.done },
            ]}
          />
        </Card>

        <Card
          icon={<IconTile icon={<HistoryIcon size={18} />} />}
          title="Attention"
          subtitle="What needs you now."
          footer={{
            message: waitingByCause[0] ? `Biggest bottleneck: ${waitingByCause[0].cause.name}` : "No bottlenecks right now",
            linkLabel: "View all",
            onLinkClick: () => navigate("/my-tasks"),
          }}
        >
          <div className={styles.attentionFigures}>
            <div className={styles.attentionFigure}>
              <span className={styles.attentionLabel}>Waiting</span>
              <span className={`${styles.attentionValue} tabular`}>{formatDuration(waitingHoursTotal)}</span>
            </div>
            <div className={styles.attentionFigure}>
              <span className={styles.attentionLabel}>Blocked</span>
              <span className={`${styles.attentionValue} tabular`}>{blockedCount}</span>
            </div>
            <div className={styles.attentionFigure}>
              <span className={styles.attentionLabel}>Overdue</span>
              <span className={`${styles.attentionValue} tabular`}>{overdueCount}</span>
            </div>
          </div>
          {waitingByCause.length === 0 ? (
            <AbsentValue />
          ) : (
            <div className={styles.causeRows}>
              {waitingByCause.slice(0, 3).map(({ cause, count }) => (
                <div key={cause.id} className={styles.causeRow}>
                  <span className={styles.causeLabel}>{cause.name}</span>
                  <span className={`${styles.causeCount} tabular`}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          icon={<IconTile icon={<BlockedIcon size={18} />} />}
          title="Progress"
          subtitle="Completion across all projects."
          footer={{
            message: `${statusCounts.done} of ${totalCount} tasks complete`,
            linkLabel: "View all",
            onLinkClick: () => navigate("/my-tasks"),
          }}
        >
          <div className={styles.progressStack}>
            <ResponsiveTallyMeter label="Completion" percent={completionPercent} />
            <div className={styles.onTimeRow}>
              <span className={styles.onTimeLabel}>On-time delivery</span>
              <AbsentValue />
            </div>
          </div>
        </Card>
      </CardGrid>

      <TimelineCard tasks={timelineTasks} onTaskActivate={handleTimelineTaskActivate} onViewAllClick={() => navigate("/my-tasks")} />

      <ProjectsTable
        title="Projects"
        subtitle="All projects, searchable."
        compact
        onRowActivate={handleRowActivate}
      />
    </div>
  );
}
