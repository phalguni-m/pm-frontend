/**
 * Single source of fixture data for the whole app. Every component consumes
 * data shaped by src/types/ui.ts through props — swapping this file for a
 * real API client is the only change required to go live.
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

function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

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

const sectionById: Record<string, SectionView> = Object.fromEntries(
  projectsWithTasks.flatMap((project) => project.sections.map((section) => [section.id, section])),
);

export { MEMBERS, MEMBER_BY_ID };
export { TASKS, TASK_BY_ID };
export { DELAY_CAUSES, DELAY_CAUSE_BY_ID };
export { TASK_INTELLIGENCE_BY_ID };
export { HISTORY };
export { COMMENTS };
export const PROJECTS_WITH_TASKS = projectsWithTasks;
export const PROJECT_SUMMARIES = projectSummaries;
export { PROJECT_BY_ID };
export const SECTION_BY_ID = sectionById;
