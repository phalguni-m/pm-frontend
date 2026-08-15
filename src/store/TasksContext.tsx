import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { TASKS, COMMENTS, PROJECTS_WITH_TASKS } from "@/fixtures";
import { initTasksState, tasksReducer, type TasksAction, type TasksState, type SectionRecord } from "@/store/tasksReducer";

interface TasksContextValue {
  state: TasksState;
  dispatch: Dispatch<TasksAction>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

// Flat SectionRecord[] seed — PROJECTS_WITH_TASKS nests sections per
// project, each section already carrying its own projectId/position, so
// this is just a flatMap + tasks-field drop, not a re-derivation.
function sectionSeeds(): SectionRecord[] {
  return PROJECTS_WITH_TASKS.flatMap((project) =>
    project.sections.map(({ id, projectId, name, description, position }) => ({ id, projectId, name, description, position })),
  );
}

function init(): TasksState {
  return initTasksState(TASKS, sectionSeeds(), COMMENTS);
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, undefined, init);
  return <TasksContext.Provider value={{ state, dispatch }}>{children}</TasksContext.Provider>;
}

export function useTasksContext(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasksContext must be used within a TasksProvider");
  }
  return context;
}
