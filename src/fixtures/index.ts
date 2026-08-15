/**
 * Single source of fixture data for the whole app. Every component consumes
 * data shaped by src/types/ui.ts through props — swapping this file for a
 * real API client is the only change required to go live.
 *
 * See docs/API_CONTRACT.md for the full per-export handoff doc: exact shape,
 * backing endpoint(s), required client-side assembly, and which fields have
 * no server source at all. The one-line comments below are pointers into
 * that document, not a replacement for it.
 */

import type { ProjectSummary, ProjectView, SectionView, StatusCounts } from "@/types/ui";
import { isOverdue } from "@/lib/format";
import { MEMBERS, MEMBER_BY_ID } from "@/fixtures/members";
import { PROJECTS, PROJECT_BY_ID } from "@/fixtures/projects";
import { TASKS, TASK_BY_ID } from "@/fixtures/tasks";
import { DELAY_CAUSES, DELAY_CAUSE_BY_ID } from "@/fixtures/delayCauses";
import { TASK_INTELLIGENCE_BY_ID } from "@/fixtures/taskIntelligence";
import { HISTORY } from "@/fixtures/history";
import { COMMENTS } from "@/fixtures/comments";
import { DEPENDENCIES } from "@/fixtures/dependencies";

// No server endpoint returns a StatusCounts tally — always computed
// client-side by iterating a task list. Will never have a server field.
function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

// UI-only assembly: joins the flat PROJECTS/TASKS fixture arrays into the
// nested ProjectView shape components expect. A real backend has no nested
// "project with its sections and tasks" response either (API_CONTRACT.md,
// PROJECTS_WITH_TASKS) — this same grouping-by-sectionId/parentTaskId logic
// is exactly what a real implementation would still need to do after
// fetching GET /api/projects/workspace/:id + per-project sections + tasks.
const projectsWithTasks: ProjectView[] = PROJECTS.map((project) => {
  const sections = project.sections.map((section) => ({
    ...section,
    tasks: TASKS.filter((task) => task.sectionId === section.id && task.parentTaskId === null),
  }));

  const counts = emptyCounts();
  for (const task of TASKS) {
    if (task.projectId !== project.id) continue;
    counts[task.state.status] += 1;
  }

  return { ...project, sections, statusCounts: counts };
});

// UI-only rollup — no GET /api/projects/:id/summary exists. statusCounts,
// memberCount, and overdueCount are all computed here from the same flat
// task/member data PROJECTS_WITH_TASKS needs; a real implementation
// computes this from the same fetched lists, not a separate cheaper call.
const projectSummaries: ProjectSummary[] = projectsWithTasks.map((project) => {
  const overdueCount = TASKS.filter(
    (task) =>
      task.projectId === project.id &&
      task.state.status !== "done" &&
      isOverdue(task.dueDate),
  ).length;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    statusCounts: project.statusCounts,
    memberCount: project.members.length,
    overdueCount,
  };
});

// UI-only index — no single-section GET endpoint exists server-side either
// (API_CONTRACT.md, SECTION_BY_ID); a real implementation resolves one
// section by id the same way, by keying the full per-project sections list.
const sectionById: Record<string, SectionView> = Object.fromEntries(
  projectsWithTasks.flatMap((project) => project.sections.map((section) => [section.id, section])),
);

// Future: GET /api/workspaces/:workspaceId/members or /api/projects/:id/members
// (embedded app_user join, flattened here). No global "all users" endpoint
// exists — members are always scoped to a workspace or project.
export { MEMBERS, MEMBER_BY_ID };

// Future: GET /api/tasks/project/:projectId (subtasks arrive intermixed,
// filter by parentTaskId client-side — see projectsWithTasks above).
export { TASKS, TASK_BY_ID };

// No server endpoint today — delay_cause table exists but no route exposes
// it. Must stay AbsentValue/hardcoded until GET /api/delay-causes ships.
// See API_CONTRACT.md "Blocked on backend" #2.
export { DELAY_CAUSES, DELAY_CAUSE_BY_ID };

// No single endpoint — assembled from 4 per-task calls (risk, impact,
// waiting-time, critical-path). See API_CONTRACT.md, TASK_INTELLIGENCE_BY_ID.
export { TASK_INTELLIGENCE_BY_ID };

// Future: GET /api/history/tasks/:taskId or /api/history/projects/:id/feed.
// changes: FieldChange[] has no server source — the backend stores full
// task_snapshot JSONB blobs, not field diffs; must be computed client-side
// by diffing consecutive snapshots. See API_CONTRACT.md, HISTORY.
export { HISTORY };

// No server endpoint today — task_comments table exists but zero routes
// touch it. Must stay AbsentValue until comments routes ship (or the
// feature is dropped). See API_CONTRACT.md "Blocked on backend" #4.
export { COMMENTS };

// Future: GET /api/dependencies/task/:taskId, called once per task and
// de-duplicated client-side — no project-wide edge-list endpoint exists.
// See API_CONTRACT.md "Blocked on backend" #1.
export { DEPENDENCIES };

// UI-only derivation, see projectsWithTasks above — not a single fetch.
export const PROJECTS_WITH_TASKS = projectsWithTasks;

// UI-only rollup, see projectSummaries above — no rollup endpoint exists.
export const PROJECT_SUMMARIES = projectSummaries;

// Future: GET /api/projects/:projectId (bare Project row) plus the same
// sections/tasks/members assembly as PROJECTS_WITH_TASKS.
export { PROJECT_BY_ID };

// UI-only index, see sectionById above — no single-section GET endpoint
// exists server-side either.
export const SECTION_BY_ID = sectionById;
