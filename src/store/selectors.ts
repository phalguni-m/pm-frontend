import { useMemo } from "react";
import { PROJECT_BY_ID, PROJECTS_WITH_TASKS, SECTION_BY_ID } from "@/fixtures";
import { useTasksContext } from "@/store/TasksContext";
import type { Comment, ProjectView, SectionView, StatusCounts, TaskRef, TaskView } from "@/types/ui";

const EMPTY_COMMENTS: Comment[] = [];

function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

/**
 * Every dependsOn/blocks/subtasks entry is a TaskRef snapshot taken when
 * fixtures were built — title, status, priority, isDeleted all freeze at
 * that moment. This is the single place a stored ref gets re-hydrated from
 * live task state before anything renders it, so a status/title edit (or a
 * delete) is reflected everywhere a ref to that task appears, and a ref
 * pointing at a since-deleted task carries isDeleted: true instead of
 * silently going stale.
 */
function refreshRef(ref: TaskRef, tasksById: Record<string, TaskView>): TaskRef {
  const live = tasksById[ref.id];
  if (!live) return ref;
  return {
    ...ref,
    title: live.title,
    status: live.state.status,
    priority: live.priority,
    isDeleted: live.isDeleted,
  };
}

function hydrateTask(task: TaskView, tasksById: Record<string, TaskView>): TaskView {
  const live = tasksById[task.id] ?? task;
  return {
    ...live,
    dependsOn: live.dependsOn.map((ref) => refreshRef(ref, tasksById)),
    blocks: live.blocks.map((ref) => refreshRef(ref, tasksById)),
    subtasks: live.subtasks.map((ref) => refreshRef(ref, tasksById)),
  };
}

function liveTopLevelTasks(sectionId: string, tasksById: Record<string, TaskView>): TaskView[] {
  const section = SECTION_BY_ID[sectionId];
  if (!section) return [];
  return section.tasks
    .map((task) => tasksById[task.id] ?? task)
    .filter((task) => !task.isDeleted)
    .map((task) => hydrateTask(task, tasksById));
}

function countsOf(tasks: TaskView[]): StatusCounts {
  const counts = emptyCounts();
  for (const task of tasks) {
    counts[task.state.status] += 1;
  }
  return counts;
}

export function useTask(taskId: string | undefined): TaskView | undefined {
  const { state } = useTasksContext();
  return useMemo(() => {
    if (!taskId) return undefined;
    const task = state.tasksById[taskId];
    // A deleted task (or one cascade-deleted with its parent) resolves to
    // undefined here, not a task with isDeleted: true — this is the single
    // check that closes a TaskPanel left pointing at a ?task= id that no
    // longer resolves to a live task, whether that happened via its own
    // delete button or a stale link opened after the fact.
    if (!task || task.isDeleted) return undefined;
    return hydrateTask(task, state.tasksById);
  }, [taskId, state.tasksById]);
}

export function useSection(sectionId: string | undefined): SectionView | undefined {
  const { state } = useTasksContext();
  return useMemo(() => {
    if (!sectionId) return undefined;
    const section = SECTION_BY_ID[sectionId];
    if (!section) return undefined;
    return { ...section, tasks: liveTopLevelTasks(sectionId, state.tasksById) };
  }, [sectionId, state.tasksById]);
}

export function useProject(projectId: string | undefined): ProjectView | undefined {
  const { state } = useTasksContext();
  return useMemo(() => {
    if (!projectId) return undefined;
    const project = PROJECT_BY_ID[projectId];
    if (!project) return undefined;

    const sections = project.sections.map((section) => ({
      ...section,
      tasks: liveTopLevelTasks(section.id, state.tasksById),
    }));

    // statusCounts covers top-level tasks only, matching how the fixture seam
    // computed it originally (src/fixtures/index.ts) — subtasks roll up into
    // their parent's own status, they don't get a second vote.
    const allTopLevel = sections.flatMap((section) => section.tasks);

    return { ...project, sections, statusCounts: countsOf(allTopLevel) };
  }, [projectId, state.tasksById]);
}

export function useProjectsIndex(): ProjectView[] {
  const { state } = useTasksContext();
  return useMemo(
    () =>
      PROJECTS_WITH_TASKS.map((project) => {
        const sections = project.sections.map((section) => ({
          ...section,
          tasks: liveTopLevelTasks(section.id, state.tasksById),
        }));
        const allTopLevel = sections.flatMap((section) => section.tasks);
        return { ...project, sections, statusCounts: countsOf(allTopLevel) };
      }),
    [state.tasksById],
  );
}

export function useComments(taskId: string | undefined): Comment[] {
  const { state } = useTasksContext();
  if (!taskId) return EMPTY_COMMENTS;
  return state.commentsByTaskId[taskId] ?? EMPTY_COMMENTS;
}

/**
 * Resolves a list of task ids (e.g. a task's own `subtasks` refs) to full
 * live TaskView objects, the same way the pre-store code used TASK_BY_ID —
 * a ref only carries id/title/status/priority/isDeleted, not enough to
 * render a real child row (assignees, dependsOn, its own subtasks, ...).
 * Deleted tasks are dropped rather than returned with isDeleted: true, same
 * rule as useTask.
 */
export function useTasksByIds(ids: string[]): TaskView[] {
  const { state } = useTasksContext();
  return useMemo(
    () =>
      ids
        .map((id) => state.tasksById[id])
        .filter((task): task is TaskView => task !== undefined && !task.isDeleted)
        .map((task) => hydrateTask(task, state.tasksById)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(","), state.tasksById],
  );
}
