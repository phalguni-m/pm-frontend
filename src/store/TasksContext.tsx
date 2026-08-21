import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from "react";
import { TASKS, COMMENTS, PROJECTS_WITH_TASKS } from "@/fixtures";
import { getProjectSections, getProjectTasks, getWorkspaceProjects } from "@/lib/projectApi";
import { mapApiTaskToTaskView } from "@/lib/taskAdapter";
import { mapApiProjectToProjectView } from "@/lib/projectAdapter";
import { initTasksState, tasksReducer, type TasksAction, type TasksState, type SectionRecord, type ProjectRecord } from "@/store/tasksReducer";
import { Skeleton } from "@/components/primitives/Skeleton";
import { EmptyState } from "@/components/primitives/EmptyState";

interface TasksContextValue {
  state: TasksState;
  dispatch: Dispatch<TasksAction>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

// First-pass live scope — see docs/INTEGRATION_AUDIT.md §6 for why only this
// one project gets full section/task data: no bulk/workspace-wide task or
// section listing endpoint exists, only per-project ones, and fetching
// tasks+sections for every project in the workspace is out of scope for
// this pass. Project *identity* (name/description) for every workspace
// project is still fetched below — only section/task data is scoped to
// this one id.
const LIVE_PROJECT_ID = "99999999-9999-9999-9999-999999999999";

const WORKSPACE_ID = import.meta.env.VITE_DEV_WORKSPACE_ID;

// Fixture path stays intact and switchable — VITE_USE_LIVE_TASKS=1 opts into
// the live fetch below; unset or any other value keeps the original
// fixture-seeded behavior so the app can still be demoed with the backend
// down. Same env-flag convention as the VITE_DEV_* vars in .env.example.
const USE_LIVE_TASKS = import.meta.env.VITE_USE_LIVE_TASKS === "1";

// Flat SectionRecord[] seed — PROJECTS_WITH_TASKS nests sections per
// project, each section already carrying its own projectId/position, so
// this is just a flatMap + tasks-field drop, not a re-derivation.
function fixtureSectionSeeds(): SectionRecord[] {
  return PROJECTS_WITH_TASKS.flatMap((project) =>
    project.sections.map(({ id, projectId, name, description, position }) => ({ id, projectId, name, description, position })),
  );
}

function fixtureInit(): TasksState {
  return initTasksState(TASKS, fixtureSectionSeeds(), COMMENTS);
}

function sectionRecordFromApi(row: { id: string; project_id: string | null; name: string; description: string | null; position: number }): SectionRecord | null {
  // SectionRecord.projectId is required (non-null); a section with no
  // project_id has no legitimate SectionRecord representation — dropped
  // rather than fabricating a projectId, same rule taskAdapter.ts applies
  // to Task.project_id.
  if (row.project_id === null) return null;
  return { id: row.id, projectId: row.project_id, name: row.name, description: row.description, position: row.position };
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: TasksState };

// Mounted only once live data has actually resolved — useReducer's lazy
// initializer can't be async, so the reducer itself can't exist until a
// real seed TasksState is in hand. This component IS that seed, held in the
// same context every fixture-seeded consumer already expects.
function LiveTasksProvider({ seed, children }: { seed: TasksState; children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, seed);
  return <TasksContext.Provider value={{ state, dispatch }}>{children}</TasksContext.Provider>;
}

function FixtureTasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, undefined, fixtureInit);
  return <TasksContext.Provider value={{ state, dispatch }}>{children}</TasksContext.Provider>;
}

function LiveTasksLoader({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    Promise.all([
      getProjectTasks(LIVE_PROJECT_ID),
      getProjectSections(LIVE_PROJECT_ID),
      getWorkspaceProjects(WORKSPACE_ID),
    ])
      .then(([taskRows, sectionRows, projectRows]) => {
        if (cancelled) return;
        const tasks = taskRows.map(mapApiTaskToTaskView);
        const sections = sectionRows
          .map(sectionRecordFromApi)
          .filter((section): section is SectionRecord => section !== null);
        // Every workspace project gets identity (name/description/etc.) —
        // only LIVE_PROJECT_ID additionally has real sections/tasks above.
        // The other projects still resolve via useProject/useProjectsIndex
        // (src/store/selectors.ts), just with empty sections, per scope.
        const projects: ProjectRecord[] = projectRows.map(mapApiProjectToProjectView);
        const data = initTasksState(tasks, sections, [], projects);
        setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load live task data";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state.status === "loading") {
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <Skeleton height={64} radius="md" />
        <Skeleton height={64} radius="md" />
        <Skeleton height={64} radius="md" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState
          message={state.message}
          action={{ label: "Retry", onClick: () => setAttempt((n) => n + 1) }}
        />
      </div>
    );
  }

  return <LiveTasksProvider seed={state.data}>{children}</LiveTasksProvider>;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  if (USE_LIVE_TASKS) {
    return <LiveTasksLoader>{children}</LiveTasksLoader>;
  }
  return <FixtureTasksProvider>{children}</FixtureTasksProvider>;
}

export function useTasksContext(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasksContext must be used within a TasksProvider");
  }
  return context;
}
