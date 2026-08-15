/**
 * Prop contracts for UI components. Components receive data shaped by these
 * types as props and emit callbacks — no fetching, no mutations, no business
 * logic lives inside components. Swapping fixtures for a real API is a change
 * confined to src/fixtures/index.ts.
 *
 * Unconfirmed backend assumptions baked into this file:
 *   1. DelayCause — no delay_causes table exists in database.ts yet. Assumed
 *      to be a small lookup table of { id, name } referenced by
 *      Task.delay_cause_id.
 *   2. TaskIntelligence — risk/impact/critical-path scoring is assumed to
 *      come from a separate analysis endpoint (built on top of
 *      CriticalPathResult / TaskImpact / StatusTimeline) whose delivery shape
 *      is not yet confirmed. Modeled as optional on TaskView.
 *   3. Comment — no comments table exists in database.ts yet. Modeled here
 *      as a forward-looking assumption so task detail UI has something to
 *      render against.
 */

import type {
  PriorityLevel,
  StatusType,
  RoleType,
} from "@/types/database";

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface Member {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: RoleType;
}

// ---------------------------------------------------------------------------
// Delay causes — ASSUMPTION 1: not exported by the backend yet.
// ---------------------------------------------------------------------------

export interface DelayCause {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Task state — enforces the invariant that only "waiting" tasks carry a
// delay cause and a waiting-since timestamp.
// ---------------------------------------------------------------------------

export type TaskState =
  | { status: Exclude<StatusType, "waiting">; delayCause: null; waitingSince: null }
  | { status: "waiting"; delayCause: DelayCause; waitingSince: string };

export function isWaiting(
  state: TaskState,
): state is Extract<TaskState, { status: "waiting" }> {
  return state.status === "waiting";
}

// ---------------------------------------------------------------------------
// Task intelligence — ASSUMPTION 2: separate analysis endpoint, shape
// unconfirmed.
// ---------------------------------------------------------------------------

export interface TaskIntelligence {
  riskScore: number;
  impact: number;
  waitingHours: number;
  onCriticalPath: boolean;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskRef {
  id: string;
  // No short identifier exists in the schema (see database.ts Task). Optional
  // and rendered only when present — never fabricated client-side.
  identifier?: string;
  title: string;
  status: StatusType;
  priority: PriorityLevel;
  isDeleted: boolean;
}

export interface TaskView {
  id: string;
  identifier?: string;
  title: string;
  description: string | null;
  projectId: string;
  sectionId: string | null;
  parentTaskId: string | null;
  priority: PriorityLevel;
  state: TaskState;
  startDate: string | null;
  dueDate: string | null;
  position: number | null;
  assignees: Member[];
  dependsOn: TaskRef[];
  blocks: TaskRef[];
  subtasks: TaskRef[];
  createdBy: Member | null;
  createdAt: string;
  updatedAt: string | null;
  isDeleted: boolean;
  intelligence?: TaskIntelligence;
}

// ---------------------------------------------------------------------------
// Sections and projects
// ---------------------------------------------------------------------------

export interface StatusCounts {
  to_do: number;
  in_progress: number;
  waiting: number;
  blocked: number;
  done: number;
}

export interface SectionView {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  position: number;
  tasks: TaskView[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  statusCounts: StatusCounts;
  memberCount: number;
  overdueCount: number;
}

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  members: Member[];
  sections: SectionView[];
  statusCounts: StatusCounts;
  createdAt: string;
  isDeleted: boolean;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface HistoryEntry {
  id: string;
  taskId: string;
  actor: Member | null;
  // Enum unconfirmed on the backend — unknown values fall through to a
  // generic renderer rather than being typed exhaustively here.
  eventType: string;
  changes: FieldChange[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Comments — ASSUMPTION 3: no comments table exists yet.
// ---------------------------------------------------------------------------

export interface Comment {
  id: string;
  taskId: string;
  author: Member;
  body: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Dependency graph — see src/lib/graph.ts (GraphLayout, GraphNodeLayout,
// GraphEdgeLayout) and src/lib/criticalPath.ts (CriticalPathResult) for the
// real graph/CPM types. The pre-backend GraphNode/GraphEdge/DependencyGraph
// interfaces that used to live here duplicated those under colliding names
// (a type named GraphNode alongside a component named GraphNode) and were
// never referenced outside this file — deleted rather than reconciled.
// ---------------------------------------------------------------------------
// Mutation payloads (emitted via callbacks, never executed by components)
// ---------------------------------------------------------------------------

export interface StatusChange {
  taskId: string;
  from: StatusType;
  to: StatusType;
  delayCauseId?: string;
}

export interface TaskDraft {
  title: string;
  description: string | null;
  projectId: string;
  sectionId: string | null;
  parentTaskId: string | null;
  priority: PriorityLevel;
  startDate: string | null;
  dueDate: string | null;
  assigneeIds: string[];
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  sectionId?: string | null;
  priority?: PriorityLevel;
  startDate?: string | null;
  dueDate?: string | null;
}
