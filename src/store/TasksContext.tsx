import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { TASKS, COMMENTS } from "@/fixtures";
import { initTasksState, tasksReducer, type TasksAction, type TasksState } from "@/store/tasksReducer";

interface TasksContextValue {
  state: TasksState;
  dispatch: Dispatch<TasksAction>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

function init(): TasksState {
  return initTasksState(TASKS, COMMENTS);
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
