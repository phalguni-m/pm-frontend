import { MEMBER_BY_ID } from "@/fixtures";
import type { Comment, TaskPatch, TaskState, TaskView } from "@/types/ui";

export interface TasksState {
  tasksById: Record<string, TaskView>;
  commentsByTaskId: Record<string, Comment[]>;
}

export function initTasksState(tasks: TaskView[], comments: Comment[]): TasksState {
  const tasksById: Record<string, TaskView> = {};
  for (const task of tasks) {
    tasksById[task.id] = task;
  }

  const commentsByTaskId: Record<string, Comment[]> = {};
  for (const comment of comments) {
    (commentsByTaskId[comment.taskId] ??= []).push(comment);
  }

  return { tasksById, commentsByTaskId };
}

export type TasksAction =
  | { type: "UPDATE_TASK"; taskId: string; patch: TaskPatch & { state: TaskState; assigneeIds: string[] } }
  | { type: "DELETE_TASK"; taskId: string }
  | { type: "ADD_COMMENT"; taskId: string; authorId: string; body: string };

function descendantIdsOf(tasksById: Record<string, TaskView>, rootId: string): string[] {
  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) continue;
    for (const task of Object.values(tasksById)) {
      if (task.parentTaskId === currentId) {
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
