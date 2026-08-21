import { useMemo } from "react";
import { PROJECT_BY_ID, PROJECTS_WITH_TASKS } from "@/fixtures";
import { useTasksContext } from "@/store/TasksContext";
import type { ProjectRecord, SectionRecord } from "@/store/tasksReducer";
import type { Comment, ProjectView, SectionView, StatusCounts, TaskRef, TaskView } from "@/types/ui";

const EMPTY_COMMENTS: Comment[] = [];

function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

/**
 * Every dependsOn/blocks entry is a TaskRef snapshot taken when fixtures were
 * built — title, status, priority, isDeleted all freeze at that moment. This
 * is the single place a stored ref gets re-hydrated from live task state
 * before anything renders it, so a status/title edit (or a delete) is
 * reflected everywhere a ref to that task appears, and a ref pointing at a
 * since-deleted task carries isDeleted: true instead of silently going stale.
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

function toRef(task: TaskView): TaskRef {
  return { id: task.id, identifier: task.identifier, title: task.title, status: task.state.status, priority: task.priority, isDeleted: task.isDeleted };
}

/**
 * A task's children (top-level tasks in a section, or a task's own subtasks)
 * used to be read off task.subtasks / SECTION_BY_ID[id].tasks — a list
 * computed once from the static fixture array at load time. That's fine for
 * edits and deletes (refreshRef re-hydrates entries already in the list) but
 * silently breaks task create: a brand-new task written into tasksById would
 * never appear anywhere, because none of those lists are membership-derived
 * from tasksById, they're frozen at whatever the fixtures looked like on
 * import. liveChildrenOf and hydrateTask's subtasks field below both filter
 * live tasksById directly instead, so a new task shows up the instant it's
 * dispatched, same as SECTION_BY_ID[id].tasks did for existing ones.
 */
function liveChildrenOf(tasksById: Record<string, TaskView>, predicate: (task: TaskView) => boolean): TaskView[] {
  return Object.values(tasksById).filter((task) => !task.isDeleted && predicate(task));
}

function hydrateTask(task: TaskView, tasksById: Record<string, TaskView>): TaskView {
  const live = tasksById[task.id] ?? task;
  return {
    ...live,
    dependsOn: live.dependsOn.map((ref) => refreshRef(ref, tasksById)),
    blocks: live.blocks.map((ref) => refreshRef(ref, tasksById)),
    subtasks: liveChildrenOf(tasksById, (t) => t.parentTaskId === live.id).map(toRef),
  };
}

/**
 * Section identity (id/name/description/position) is reducer state now
 * (Block 16C's CREATE_SECTION), read live from sectionsById exactly the
 * same way task identity is read from tasksById — a section created this
 * session shows up the instant it's dispatched, not just tasks. Sorted by
 * position, ties broken by id, same convention REORDER_TASK's siblingsOf
 * already uses for task ordering.
 */
function liveSectionsOf(projectId: string, sectionsById: Record<string, SectionRecord>): SectionRecord[] {
  return Object.values(sectionsById)
    .filter((section) => section.projectId === projectId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

function liveTopLevelTasks(sectionId: string, tasksById: Record<string, TaskView>): TaskView[] {
  return liveChildrenOf(tasksById, (task) => task.sectionId === sectionId && task.parentTaskId === null).map((task) =>
    hydrateTask(task, tasksById),
  );
}

function countsOf(tasks: TaskView[]): StatusCounts {
  const counts = emptyCounts();
  for (const task of tasks) {
    counts[task.state.status] += 1;
  }
  return counts;
}

// Project identity: live state.projectsById wins when it has an entry for
// this id (live mode, src/store/TasksContext.tsx), otherwise falls back to
// the fixture PROJECT_BY_ID exactly as before. Fixture mode never populates
// projectsById, so this is a no-op fallback for it — same "live wins if
// present" pattern liveSectionsOf/liveTopLevelTasks already establish for
// sections/tasks. Exported so the pages that resolve project identity
// directly (GraphPage, SectionPage, InsightsPage, Breadcrumbs — none of
// them go through useProject) can reuse this instead of duplicating the
// fallback logic four times.
export function baseProjectOf(projectId: string, projectsById: Record<string, ProjectRecord>): ProjectRecord | undefined {
  return projectsById[projectId] ?? PROJECT_BY_ID[projectId];
}

// Every project id this app currently knows about: live projectsById ids
// plus fixture PROJECTS_WITH_TASKS ids, deduped. Live mode adds real
// projects on top of the fixture set rather than replacing it — the two
// live projects with no section/task data yet (see TasksContext.tsx) still
// need an id to appear in this list with empty sections.
function allProjectIds(projectsById: Record<string, ProjectRecord>): string[] {
  const ids = new Set<string>(PROJECTS_WITH_TASKS.map((p) => p.id));
  for (const id of Object.keys(projectsById)) ids.add(id);
  return Array.from(ids);
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
    const section = state.sectionsById[sectionId];
    if (!section) return undefined;
    return { ...section, tasks: liveTopLevelTasks(sectionId, state.tasksById) };
  }, [sectionId, state.sectionsById, state.tasksById]);
}

export function useProject(projectId: string | undefined): ProjectView | undefined {
  const { state } = useTasksContext();
  return useMemo(() => {
    if (!projectId) return undefined;
    const project = baseProjectOf(projectId, state.projectsById);
    if (!project) return undefined;

    const sections = liveSectionsOf(projectId, state.sectionsById).map((section) => ({
      ...section,
      tasks: liveTopLevelTasks(section.id, state.tasksById),
    }));

    // statusCounts covers top-level tasks only, matching how the fixture seam
    // computed it originally (src/fixtures/index.ts) — subtasks roll up into
    // their parent's own status, they don't get a second vote.
    const allTopLevel = sections.flatMap((section) => section.tasks);

    return { ...project, sections, statusCounts: countsOf(allTopLevel) };
  }, [projectId, state.projectsById, state.sectionsById, state.tasksById]);
}

export function useProjectsIndex(): ProjectView[] {
  const { state } = useTasksContext();
  return useMemo(
    () =>
      allProjectIds(state.projectsById)
        .map((id) => baseProjectOf(id, state.projectsById))
        .filter((project): project is ProjectRecord => project !== undefined)
        .map((project) => {
          const sections = liveSectionsOf(project.id, state.sectionsById).map((section) => ({
            ...section,
            tasks: liveTopLevelTasks(section.id, state.tasksById),
          }));
          const allTopLevel = sections.flatMap((section) => section.tasks);
          return { ...project, sections, statusCounts: countsOf(allTopLevel) };
        }),
    [state.projectsById, state.sectionsById, state.tasksById],
  );
}

export interface MyTaskRow {
  task: TaskView;
  projectId: string;
  projectName: string;
  sectionId: string | null;
  sectionName: string | null;
}

/**
 * Every task assigned to userId across every project, flat — the only
 * cross-project view in the app. Reads state.tasksById directly (not
 * PROJECTS_WITH_TASKS/useProjectsIndex, which only surface top-level tasks
 * per section) because a subtask carries its own independent assigneeIds
 * too, and both live flat in the same tasksById map — filtering there in
 * one pass catches both without needing a second per-task subtask fetch.
 * Sorted by dueDate ascending, undated tasks last, ties broken by id for
 * determinism (same convention as every other sort in this codebase).
 */
export function useMyTasks(userId: string): MyTaskRow[] {
  const { state } = useTasksContext();
  return useMemo(() => {
    const rows = Object.values(state.tasksById)
      .filter((task) => !task.isDeleted && task.assignees.some((member) => member.id === userId))
      .map((task) => {
        const hydrated = hydrateTask(task, state.tasksById);
        const project = baseProjectOf(hydrated.projectId, state.projectsById);
        const section = hydrated.sectionId ? state.sectionsById[hydrated.sectionId] : undefined;
        return {
          task: hydrated,
          projectId: hydrated.projectId,
          projectName: project?.name ?? "Unknown project",
          sectionId: section?.id ?? null,
          sectionName: section?.name ?? null,
        };
      });

    return rows.sort((a, b) => {
      if (!a.task.dueDate && !b.task.dueDate) return a.task.id.localeCompare(b.task.id);
      if (!a.task.dueDate) return 1;
      if (!b.task.dueDate) return -1;
      return a.task.dueDate.localeCompare(b.task.dueDate) || a.task.id.localeCompare(b.task.id);
    });
  }, [userId, state.tasksById, state.sectionsById, state.projectsById]);
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
