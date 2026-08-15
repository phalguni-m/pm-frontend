import { MEMBER_BY_ID } from "@/fixtures";
import { CURRENT_USER_ID } from "@/lib/constants";
import type { Comment, SectionView, TaskDraft, TaskPatch, TaskState, TaskView } from "@/types/ui";

// Store-shape for a section: everything SectionView has except `tasks`,
// which is always live-derived from tasksById (same reasoning as why
// tasksById doesn't store a task's `subtasks` array directly — see
// selectors.ts's hydrateTask). Sections used to be read straight off the
// static PROJECTS fixture with no reducer state at all; CREATE_SECTION
// needs somewhere real to write to, so this mirrors tasksById's pattern
// one level up.
export type SectionRecord = Omit<SectionView, "tasks">;

export interface TasksState {
  tasksById: Record<string, TaskView>;
  sectionsById: Record<string, SectionRecord>;
  commentsByTaskId: Record<string, Comment[]>;
}

export function initTasksState(tasks: TaskView[], sections: SectionRecord[], comments: Comment[]): TasksState {
  const tasksById: Record<string, TaskView> = {};
  for (const task of tasks) {
    tasksById[task.id] = task;
  }

  const sectionsById: Record<string, SectionRecord> = {};
  for (const section of sections) {
    sectionsById[section.id] = section;
  }

  const commentsByTaskId: Record<string, Comment[]> = {};
  for (const comment of comments) {
    (commentsByTaskId[comment.taskId] ??= []).push(comment);
  }

  return { tasksById, sectionsById, commentsByTaskId };
}

export type TasksAction =
  | { type: "UPDATE_TASK"; taskId: string; patch: TaskPatch & { state: TaskState; assigneeIds: string[] } }
  | { type: "DELETE_TASK"; taskId: string }
  | { type: "ADD_COMMENT"; taskId: string; authorId: string; body: string }
  | { type: "CREATE_TASK"; draft: TaskDraft }
  | { type: "REORDER_TASK"; taskId: string; direction: "up" | "down" }
  | { type: "CREATE_SECTION"; projectId: string; name: string };

// Siblings are same sectionId + same parentTaskId, live (isDeleted excluded)
// tasks — the same scope CREATE_TASK uses to pick a new task's position.
// Sorting by position (ties broken by id) rather than trusting insertion
// order is what makes this correct even if position values were ever
// non-sequential; every sibling group in the seed fixtures is already 0..N
// sequential (audited before this action was added), but REORDER_TASK
// doesn't depend on that being true.
function siblingsOf(tasksById: Record<string, TaskView>, task: TaskView): TaskView[] {
  return Object.values(tasksById)
    .filter((t) => !t.isDeleted && t.sectionId === task.sectionId && t.parentTaskId === task.parentTaskId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id.localeCompare(b.id));
}

function descendantIdsOf(tasksById: Record<string, TaskView>, rootId: string): string[] {
  const ids: string[] = [];
  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) continue;
    for (const task of Object.values(tasksById)) {
      // visited guards against a self-referential or cyclic parentTaskId
      // (A is its own parent, or A -> B -> A) re-matching forever — nothing
      // upstream of this function currently prevents that shape from
      // existing, so this can't assume the data is a tree.
      if (task.parentTaskId === currentId && !visited.has(task.id)) {
        visited.add(task.id);
        ids.push(task.id);
        queue.push(task.id);
      }
    }
  }
  return ids;
}

export function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case "UPDATE_TASK": {
      const existing = state.tasksById[action.taskId];
      if (!existing) return state;

      const { assigneeIds, ...rest } = action.patch;
      const assignees = assigneeIds
        .map((id) => MEMBER_BY_ID[id])
        .filter((member): member is TaskView["assignees"][number] => member !== undefined);

      const updated: TaskView = {
        ...existing,
        ...rest,
        assignees,
        updatedAt: new Date().toISOString(),
      };

      return { ...state, tasksById: { ...state.tasksById, [action.taskId]: updated } };
    }

    case "DELETE_TASK": {
      const existing = state.tasksById[action.taskId];
      if (!existing) return state;

      // Cascade: a deleted task takes its descendants with it. Subtasks are
      // only ever reachable through their parent row in the UI, so an
      // "orphaned but alive" subtask would be invisible everywhere while
      // still counting toward every derived total — a cascade is the only
      // option that keeps the visible state and the stored state honest
      // with each other.
      const idsToDelete = [action.taskId, ...descendantIdsOf(state.tasksById, action.taskId)];

      const nextTasksById = { ...state.tasksById };
      for (const id of idsToDelete) {
        const task = nextTasksById[id];
        if (!task) continue;
        nextTasksById[id] = { ...task, isDeleted: true, updatedAt: new Date().toISOString() };
      }

      return { ...state, tasksById: nextTasksById };
    }

    case "CREATE_TASK": {
      const { draft } = action;

      // parentTaskId is only ever supplied by "+ Add subtask" (the currently
      // open task's own id, never user-typed — there's no picker), but a
      // stale click after that task was deleted elsewhere should still be
      // refused rather than creating an orphaned child. Same bail pattern as
      // UPDATE_TASK's "if (!existing) return state".
      if (draft.parentTaskId) {
        const parent = state.tasksById[draft.parentTaskId];
        if (!parent || parent.isDeleted) return state;
      }

      const assignees = draft.assigneeIds
        .map((id) => MEMBER_BY_ID[id])
        .filter((member): member is TaskView["assignees"][number] => member !== undefined);

      // Nothing in the app currently reads TaskView.position (see
      // src/store/selectors.ts and every page — order is plain array/insert
      // order). Set it anyway, one past the current max among siblings, so
      // the field isn't garbage if drag-reorder ever starts reading it.
      const siblingPositions = Object.values(state.tasksById)
        .filter((t) => !t.isDeleted && t.sectionId === draft.sectionId && t.parentTaskId === draft.parentTaskId)
        .map((t) => t.position ?? -1);
      const position = siblingPositions.length > 0 ? Math.max(...siblingPositions) + 1 : 0;

      const createdBy = MEMBER_BY_ID[CURRENT_USER_ID] ?? null;

      const created: TaskView = {
        id: crypto.randomUUID(),
        title: draft.title,
        description: draft.description,
        projectId: draft.projectId,
        sectionId: draft.sectionId,
        parentTaskId: draft.parentTaskId,
        priority: draft.priority,
        // Every new task starts "to_do" — deliberate, not a missing field.
        // The waiting invariant (TaskState union) means a status picker here
        // would have to reproduce the entire delay-cause-required dance
        // TaskPanel already owns; simpler and honest to let creation produce
        // only the one TaskState variant that never needs extra input, and
        // route anyone who wants a different starting status through the
        // existing, already-correct edit flow.
        state: { status: "to_do", delayCause: null, waitingSince: null },
        startDate: draft.startDate,
        dueDate: draft.dueDate,
        position,
        assignees,
        dependsOn: [],
        blocks: [],
        subtasks: [],
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        isDeleted: false,
      };

      return { ...state, tasksById: { ...state.tasksById, [created.id]: created } };
    }

    case "REORDER_TASK": {
      const existing = state.tasksById[action.taskId];
      if (!existing) return state;

      // Same-parent-scope siblings only — this is what structurally prevents
      // a subtask from being dragged out of its parent: the swap partner is
      // always drawn from this exact sibling group, never from a different
      // sectionId/parentTaskId, so a reorder can only ever move a task
      // within its existing group, never re-parent it.
      const siblings = siblingsOf(state.tasksById, existing);
      const index = siblings.findIndex((t) => t.id === existing.id);
      const swapIndex = action.direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= siblings.length) return state;

      const partner = siblings[swapIndex]!;
      const now = new Date().toISOString();

      return {
        ...state,
        tasksById: {
          ...state.tasksById,
          [existing.id]: { ...existing, position: partner.position, updatedAt: now },
          [partner.id]: { ...partner, position: existing.position, updatedAt: now },
        },
      };
    }

    case "CREATE_SECTION": {
      const name = action.name.trim();
      if (name.length === 0) return state;

      // Appended at the end of the project's section order — same
      // max(siblings)+1 convention CREATE_TASK already uses for position.
      const siblingPositions = Object.values(state.sectionsById)
        .filter((s) => s.projectId === action.projectId)
        .map((s) => s.position);
      const position = siblingPositions.length > 0 ? Math.max(...siblingPositions) + 1 : 0;

      const created: SectionRecord = {
        id: crypto.randomUUID(),
        projectId: action.projectId,
        name,
        description: null,
        position,
      };

      return { ...state, sectionsById: { ...state.sectionsById, [created.id]: created } };
    }

    case "ADD_COMMENT": {
      const author = MEMBER_BY_ID[action.authorId];
      if (!author) return state;

      const comment: Comment = {
        id: crypto.randomUUID(),
        taskId: action.taskId,
        author,
        body: action.body,
        createdAt: new Date().toISOString(),
      };

      const existing = state.commentsByTaskId[action.taskId] ?? [];
      return {
        ...state,
        commentsByTaskId: { ...state.commentsByTaskId, [action.taskId]: [...existing, comment] },
      };
    }

    default:
      return state;
  }
}
