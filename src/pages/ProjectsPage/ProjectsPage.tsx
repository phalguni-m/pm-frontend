import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@/pages/ProjectsPage/ProjectsPage.module.css";
import { useProjectsIndex } from "@/store";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { SearchField } from "@/components/primitives/SearchField";
import { ProjectMark } from "@/components/primitives/ProjectMark";
import { AvatarGroup } from "@/components/primitives/AvatarGroup";
import { DonutGlyph } from "@/components/primitives/DonutGlyph";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Table, type TableColumn, type TableRowData } from "@/components/primitives/Table";
import { ProjectIcon, FilterIcon, ComposeIcon } from "@/components/icons";
import { projectMarkOf } from "@/lib/format";
import type { ProjectView, SectionView, TaskView } from "@/types/ui";

type ProjectsRow =
  | { kind: "project"; project: ProjectView }
  | { kind: "section"; section: SectionView; project: ProjectView }
  | { kind: "task"; task: TaskView; project: ProjectView };

interface RowStats {
  sections: number | null;
  open: number;
  waiting: number;
  blocked: number;
  overdue: number;
  team: { id: string; initials: string; name: string }[];
  progressPercent: number;
}

function taskStats(tasks: TaskView[]): Omit<RowStats, "sections" | "team" | "progressPercent"> {
  let open = 0;
  let waiting = 0;
  let blocked = 0;
  let overdue = 0;
  for (const task of tasks) {
    const status = task.state.status;
    if (status === "to_do" || status === "in_progress") open += 1;
    if (status === "waiting") waiting += 1;
    if (status === "blocked") blocked += 1;
    if (status !== "done" && task.dueDate && new Date(task.dueDate).getTime() < Date.now()) overdue += 1;
  }
  return { open, waiting, blocked, overdue };
}

function progressOf(tasks: TaskView[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.state.status === "done").length;
  return (done / tasks.length) * 100;
}

// section.tasks only carries top-level tasks; subtasks are TaskRef, not
// TaskView, and are intentionally excluded from these rollups — they already
// count toward their parent task's own status.
function sectionTasks(section: SectionView): TaskView[] {
  return section.tasks;
}

function projectTasks(project: ProjectView): TaskView[] {
  return project.sections.flatMap((section) => sectionTasks(section));
}

function matchesQuery(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const projects = useProjectsIndex();

  function toggleExpand(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  }

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects;
    return projects.filter(
      (project) =>
        matchesQuery(project.name, query) ||
        project.sections.some(
          (section) => matchesQuery(section.name, query) || section.tasks.some((task) => matchesQuery(task.title, query)),
        ),
    );
  }, [projects, query]);

  const rows: TableRowData<ProjectsRow>[] = useMemo(
    () =>
      filteredProjects.map((project) => ({
        id: project.id,
        data: { kind: "project", project },
        children: project.sections.map((section) => ({
          id: section.id,
          data: { kind: "section", section, project },
          children: section.tasks.map((task) => ({
            id: task.id,
            data: { kind: "task", task, project },
          })),
        })),
      })),
    [filteredProjects],
  );

  const columns: TableColumn<ProjectsRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Project",
        cardSlot: "title",
        render: (row) => {
          if (row.kind === "project") {
            return (
              <div className={styles.nameCell}>
                <ProjectMark mark={projectMarkOf(row.project.name)} name={row.project.name} size={24} />
                <span className={styles.nameText}>{row.project.name}</span>
              </div>
            );
          }
          if (row.kind === "section") {
            return <span className={styles.nameText}>{row.section.name}</span>;
          }
          return <span className={styles.nameText}>{row.task.title}</span>;
        },
      },
      {
        id: "sections",
        header: "Sections",
        align: "end",
        width: "content",
        render: (row) => {
          if (row.kind !== "project") return null;
          const count = row.project.sections.length;
          return <span className={count === 0 ? `tabular ${styles.countZero}` : "tabular"}>{count}</span>;
        },
      },
      {
        id: "open",
        header: "Open",
        align: "end",
        width: "content",
        cardSlot: "meta",
        render: (row) => {
          const tasks = row.kind === "project" ? projectTasks(row.project) : row.kind === "section" ? sectionTasks(row.section) : [];
          if (row.kind === "task") return null;
          const { open } = taskStats(tasks);
          return <span className={open === 0 ? `tabular ${styles.countZero}` : "tabular"}>{open}</span>;
        },
      },
      {
        id: "waiting",
        header: "Waiting",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (row) => {
          if (row.kind === "task") return null;
          const tasks = row.kind === "project" ? projectTasks(row.project) : sectionTasks(row.section);
          const { waiting } = taskStats(tasks);
          return <span className={waiting === 0 ? `tabular ${styles.countZero}` : "tabular"}>{waiting}</span>;
        },
      },
      {
        id: "blocked",
        header: "Blocked",
        align: "end",
        width: "content",
        hideBelowTablet: true,
        render: (row) => {
          if (row.kind === "task") return null;
          const tasks = row.kind === "project" ? projectTasks(row.project) : sectionTasks(row.section);
          const { blocked } = taskStats(tasks);
          return <span className={blocked === 0 ? `tabular ${styles.countZero}` : "tabular"}>{blocked}</span>;
        },
      },
      {
        id: "overdue",
        header: "Overdue",
        align: "end",
        width: "content",
        render: (row) => {
          if (row.kind === "task") return null;
          const tasks = row.kind === "project" ? projectTasks(row.project) : sectionTasks(row.section);
          const { overdue } = taskStats(tasks);
          return <span className={overdue === 0 ? `tabular ${styles.countZero}` : "tabular"}>{overdue}</span>;
        },
      },
      {
        id: "team",
        header: "Team",
        width: "content",
        cardSlot: "footerStart",
        render: (row) => {
          if (row.kind === "project") return <AvatarGroup members={row.project.members} size={24} />;
          if (row.kind === "task") return <AvatarGroup members={row.task.assignees} size={24} />;
          return null;
        },
      },
      {
        id: "progress",
        header: "Progress",
        align: "end",
        width: "content",
        cardSlot: "footerEnd",
        render: (row) => {
          const tasks = row.kind === "project" ? projectTasks(row.project) : row.kind === "section" ? sectionTasks(row.section) : [];
          if (row.kind === "task") return null;
          const percent = progressOf(tasks);
          return (
            <span className={styles.progressCell}>
              <DonutGlyph percent={percent} />
              <span className={`${styles.progressPercent} tabular`}>{Math.round(percent)}%</span>
            </span>
          );
        },
      },
    ],
    [],
  );

  function handleActivate(row: ProjectsRow) {
    if (row.kind === "project") {
      navigate(`/projects/${row.project.id}`);
    } else if (row.kind === "section") {
      navigate(`/projects/${row.project.id}/sections/${row.section.id}`);
    } else {
      navigate(`/projects/${row.project.id}/sections/${row.task.sectionId}?task=${row.task.id}`);
    }
  }

  return (
    <div className={styles.root}>
      <Card>
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Projects</h1>
            <p className={styles.description}>All projects, searchable.</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.search}>
              <SearchField
                placeholder="Search projects, sections, tasks"
                aria-label="Search projects"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
            <Button variant="default" icon={<FilterIcon size={16} />}>
              Filter
            </Button>
            <Button variant="primary" icon={<ComposeIcon size={16} />}>
              New task
            </Button>
          </div>
        </div>
      </Card>

      <Card flush>
        {rows.length === 0 ? (
          <EmptyState icon={<ProjectIcon size={18} />} message="No projects match your search" />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onRowActivate={handleActivate}
          />
        )}
      </Card>
    </div>
  );
}
