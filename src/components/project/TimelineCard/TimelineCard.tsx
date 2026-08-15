import { useMemo } from "react";
import styles from "@/components/project/TimelineCard/TimelineCard.module.css";
import { Card } from "@/components/primitives/Card";
import { EmptyState } from "@/components/primitives/EmptyState";
import { ProjectMark } from "@/components/primitives/ProjectMark";
import { AvatarGroup } from "@/components/primitives/AvatarGroup";
import { TimelineIcon } from "@/components/icons";
import { formatDate, projectMarkOf } from "@/lib/format";
import type { PriorityLevel } from "@/types/database";
import type { TaskView } from "@/types/ui";

export interface TimelineTask {
  task: TaskView;
  projectName: string;
}

export interface TimelineCardProps {
  tasks: TimelineTask[];
  onTaskActivate: (task: TaskView) => void;
  onViewAllClick: () => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Priority accent rule per SPEC's GRAPH/HOME conventions — the same two
// signal tokens PriorityChip already uses for critical/high, no new hue.
const ACCENT_CLASS: Record<PriorityLevel, string> = {
  critical: "accentCritical",
  high: "accentHigh",
  medium: "accentNeutral",
  low: "accentNeutral",
};

function dayIndex(iso: string, rangeStart: number): number {
  return Math.round((new Date(iso).getTime() - rangeStart) / MS_PER_DAY);
}

/**
 * SPEC's HOME Row 2 "Timeline" card — a Gantt built from each task's
 * start/due. SPEC's header controls (date range, Filter, +Schedule) were
 * removed in Block 16 — no filtering/scheduling logic exists anywhere in
 * the app, and a visible control that does nothing on click is worse than
 * no control at all.
 */
export function TimelineCard({ tasks, onTaskActivate, onViewAllClick }: TimelineCardProps) {
  const scheduled = useMemo(() => tasks.filter((t) => t.task.startDate !== null && t.task.dueDate !== null), [tasks]);
  const unscheduledCount = tasks.length - scheduled.length;

  const range = useMemo(() => {
    if (scheduled.length === 0) return null;
    const starts = scheduled.map((t) => new Date(t.task.startDate!).getTime());
    const dues = scheduled.map((t) => new Date(t.task.dueDate!).getTime());
    const rangeStart = Math.min(...starts);
    const rangeEnd = Math.max(...dues);
    const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / MS_PER_DAY));
    return { rangeStart, rangeEnd, totalDays };
  }, [scheduled]);

  // Week ticks across the visible range, plus the leading/trailing edge —
  // a static axis, not a scrolling/zooming widget (SPEC describes ticks and
  // dashed verticals, not interactive panning).
  const ticks = useMemo(() => {
    if (!range) return [];
    const result: { dayOffset: number; label: string }[] = [];
    for (let day = 0; day <= range.totalDays; day += 7) {
      const iso = new Date(range.rangeStart + day * MS_PER_DAY).toISOString();
      result.push({ dayOffset: day, label: formatDate(iso) });
    }
    return result;
  }, [range]);

  // Today's position on the same scale ticks/bars already use. null when
  // today falls outside the visible range — clamping to an edge would
  // silently claim "today is here" when it isn't, so the marker simply
  // doesn't render rather than showing a misleading position.
  const todayPercent = useMemo(() => {
    if (!range) return null;
    const todayOffset = dayIndex(new Date().toISOString(), range.rangeStart);
    if (todayOffset < 0 || todayOffset > range.totalDays) return null;
    return (todayOffset / range.totalDays) * 100;
  }, [range]);

  if (!range || scheduled.length === 0) {
    return (
      <Card icon={<TimelineIcon size={18} />} title="Timeline" subtitle="Task schedule and deadlines.">
        <EmptyState icon={<TimelineIcon size={18} />} message="No tasks have a start date yet" />
      </Card>
    );
  }

  return (
    <Card
      icon={<TimelineIcon size={18} />}
      title="Timeline"
      subtitle="Task schedule and deadlines."
      footer={{
        message: unscheduledCount > 0 ? `${unscheduledCount} task${unscheduledCount === 1 ? "" : "s"} have no start date` : "All tasks scheduled",
        linkLabel: "View all",
        onLinkClick: onViewAllClick,
      }}
    >
      <div className={styles.root}>
        <div className={styles.axis}>
          {ticks.map((tick) => (
            <span key={tick.dayOffset} className={styles.tickLabel} style={{ left: `${(tick.dayOffset / range.totalDays) * 100}%` }}>
              {tick.label}
            </span>
          ))}
        </div>

        <div className={styles.bars}>
          {/* Dashed verticals continue down through every row, aligned to
              the same day offsets as the axis ticks above — the SAME scale
              (range.rangeStart/range.totalDays) that positions the bars
              below, so a bar's left edge always lands under its own tick. */}
          {ticks.map((tick) => (
            <span key={tick.dayOffset} className={styles.tickLine} style={{ left: `${(tick.dayOffset / range.totalDays) * 100}%` }} />
          ))}

          {/* Today marker — solid (vs. the ordinary ticks' dashed treatment)
              and one token stronger, so it reads as a reference point rather
              than another tick. Omitted entirely when today falls outside
              the visible range, rather than clamped to an edge. */}
          {todayPercent !== null && <span className={styles.todayLine} style={{ left: `${todayPercent}%` }} />}

          {scheduled.map(({ task, projectName }, index) => {
            const startOffset = dayIndex(task.startDate!, range.rangeStart);
            const endOffset = dayIndex(task.dueDate!, range.rangeStart);
            const spanDays = Math.max(1, endOffset - startOffset);
            const leftPercent = (startOffset / range.totalDays) * 100;
            const widthPercent = (spanDays / range.totalDays) * 100;
            const isLastRow = index === scheduled.length - 1;

            return (
              <div key={task.id} className={isLastRow ? `${styles.barTrack} ${styles.barTrackLast}` : styles.barTrack}>
                <button
                  type="button"
                  className={`${styles.bar} ${styles[ACCENT_CLASS[task.priority]]}`}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  onClick={() => onTaskActivate(task)}
                  title={`${task.title} — ${formatDate(task.startDate!)} to ${formatDate(task.dueDate!)}`}
                >
                  <ProjectMark mark={projectMarkOf(projectName)} name={projectName} size={16} />
                  <span className={styles.barTitle}>{task.title}</span>
                  {task.assignees.length > 0 && (
                    <span className={styles.barAvatars}>
                      <AvatarGroup members={task.assignees} size={20} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
