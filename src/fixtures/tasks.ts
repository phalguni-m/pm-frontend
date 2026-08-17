import type { TaskRef, TaskState, TaskView } from "@/types/ui";
import { MEMBER_BY_ID } from "@/fixtures/members";
import { DELAY_CAUSE_BY_ID } from "@/fixtures/delayCauses";
import { TASK_INTELLIGENCE_BY_ID } from "@/fixtures/taskIntelligence";
import {
  PROJECT_API_GATEWAY_ID,
  PROJECT_ATLAS_CORE_ID,
  PROJECT_HEALTHBRIDGE_ID,
  SECTION_AUTH_LAYER_ID,
  SECTION_BACKEND_ID,
  SECTION_CORE_TRIAGE_ID,
  SECTION_DESIGN_ID,
  SECTION_FRONTEND_ID,
  SECTION_INFRASTRUCTURE_ID,
  SECTION_REPORTS_ANALYTICS_ID,
} from "@/fixtures/projects";

// Due dates are computed relative to module-load time so the fixture set
// always straddles "today" instead of drifting permanently into the past.
//
// startDate is computed the same way (daysFromNow(n - durationDays), n being
// this task's own dueDate offset below) rather than as a fixed calendar
// literal. A fixed startDate paired with a daysFromNow dueDate meant every
// task's (dueDate - startDate) span grew by one day per real-world day —
// CPM durations, slack, and the critical set all drifted over time, making
// the graph page's output different from one day to the next for identical
// code. Each call site's "- N" comment is that task's original literal
// duration, preserved exactly (same for isEstimatedDuration: false either
// way) — this is a representation change, dates now float together instead
// of the gap between them growing, not a data change.
function daysFromNow(n: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function notWaiting(status: Exclude<TaskState["status"], "waiting">): TaskState {
  return { status, delayCause: null, waitingSince: null };
}

function waiting(delayCauseId: string, waitingSince: string): TaskState {
  const delayCause = DELAY_CAUSE_BY_ID[delayCauseId];
  if (!delayCause) throw new Error(`Unknown delay cause: ${delayCauseId}`);
  return { status: "waiting", delayCause, waitingSince };
}

interface TaskSeed {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  sectionId: string | null;
  parentTaskId: string | null;
  priority: TaskView["priority"];
  state: TaskState;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  assigneeIds: string[];
  dependsOnIds: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string | null;
}

// Dependency chain (4 deep): intake-form -> triage-rules -> offline-sync -> field-report-export
// ids used below so it reads top to bottom in dependency order.
const SEEDS: TaskSeed[] = [
  // --- HealthBridge / Core Triage ---
  {
    id: "task-intake-form",
    title: "Build symptom intake form",
    description: "Structured intake form for community health workers.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_CORE_TRIAGE_ID,
    parentTaskId: null,
    priority: "high",
    state: notWaiting("done"),
    startDate: daysFromNow(-75), // 30-day duration, preserved
    dueDate: daysFromNow(-45),
    position: 0,
    assigneeIds: ["member-vismaya"],
    dependsOnIds: [],
    createdById: "member-phalguni",
    createdAt: "2026-05-28T10:00:00.000Z",
    updatedAt: "2026-06-09T15:30:00.000Z",
  },
  {
    id: "task-triage-rules",
    title: "Implement IMCI triage rule engine",
    description: "Encode WHO/IMCI decision rules for danger-sign classification.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_CORE_TRIAGE_ID,
    parentTaskId: null,
    priority: "critical",
    state: notWaiting("in_progress"),
    startDate: daysFromNow(-66), // 36-day duration, preserved
    dueDate: daysFromNow(-30),
    position: 1,
    assigneeIds: ["member-vismaya", "member-namana"],
    dependsOnIds: ["task-intake-form"],
    createdById: "member-phalguni",
    createdAt: "2026-05-28T10:05:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
  },
  {
    id: "task-offline-sync",
    title: "Offline-first sync for triage records",
    description: "Queue and reconcile triage submissions captured without connectivity.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_CORE_TRIAGE_ID,
    parentTaskId: null,
    priority: "high",
    state: waiting("aa72a61a-a0f8-45a8-8e7f-c7bcd2a14280", "2026-08-05T08:00:00.000Z"),
    startDate: daysFromNow(-52), // 56-day duration, preserved
    dueDate: daysFromNow(4),
    position: 2,
    assigneeIds: ["member-namana"],
    dependsOnIds: ["task-triage-rules"],
    createdById: "member-vismaya",
    createdAt: "2026-06-01T11:00:00.000Z",
    updatedAt: "2026-08-05T08:00:00.000Z",
  },
  {
    id: "task-danger-sign-review",
    title: "Clinical review of danger-sign thresholds",
    description: "External clinician sign-off on triage cutoffs before rollout.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_CORE_TRIAGE_ID,
    parentTaskId: null,
    priority: "critical",
    state: waiting("a3a16837-2721-45fa-86ce-7719210b40d1", "2026-08-02T09:00:00.000Z"),
    startDate: daysFromNow(-56), // 65-day duration, preserved
    dueDate: daysFromNow(9),
    position: 3,
    assigneeIds: ["member-phalguni"],
    dependsOnIds: ["task-triage-rules"],
    createdById: "member-phalguni",
    createdAt: "2026-06-15T09:00:00.000Z",
    updatedAt: "2026-08-02T09:00:00.000Z",
  },
  {
    id: "task-triage-offline-tests",
    title: "Write offline sync test matrix",
    description: "Subtask covering device/network permutations for sync QA.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_CORE_TRIAGE_ID,
    parentTaskId: "task-offline-sync",
    priority: "medium",
    state: notWaiting("to_do"),
    startDate: null,
    dueDate: daysFromNow(14),
    position: 0,
    assigneeIds: ["member-namana"],
    dependsOnIds: [],
    createdById: "member-namana",
    createdAt: "2026-06-05T09:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "task-triage-offline-conflict",
    title: "Handle conflicting offline edits",
    description: "Subtask: last-write-wins vs. manual merge for conflicting triage edits.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_CORE_TRIAGE_ID,
    parentTaskId: "task-offline-sync",
    priority: "high",
    state: notWaiting("blocked"),
    startDate: null,
    dueDate: daysFromNow(-2),
    position: 1,
    assigneeIds: ["member-namana"],
    dependsOnIds: [],
    createdById: "member-namana",
    createdAt: "2026-06-05T09:05:00.000Z",
    updatedAt: "2026-07-30T14:00:00.000Z",
  },

  // --- HealthBridge / Reports & Analytics ---
  {
    id: "task-field-report-export",
    title: "Field report CSV/PDF export",
    description: "Exportable outcome reports for district health offices.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_REPORTS_ANALYTICS_ID,
    parentTaskId: null,
    priority: "medium",
    state: notWaiting("to_do"),
    startDate: daysFromNow(-14), // 32-day duration, preserved
    dueDate: daysFromNow(18),
    position: 0,
    assigneeIds: ["member-purva"],
    dependsOnIds: ["task-offline-sync"],
    createdById: "member-vismaya",
    createdAt: "2026-06-10T13:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "task-outcome-dashboard",
    title: "District outcome dashboard",
    description: "Aggregate triage outcomes by district and time window.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_REPORTS_ANALYTICS_ID,
    parentTaskId: null,
    priority: "low",
    state: notWaiting("to_do"),
    startDate: null,
    dueDate: daysFromNow(21),
    position: 1,
    assigneeIds: [],
    dependsOnIds: ["task-field-report-export"],
    createdById: "member-purva",
    createdAt: "2026-06-18T13:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "task-report-overdue-cleanup",
    title: "Clean up stale report drafts",
    description: "Remove abandoned report drafts older than 90 days.",
    projectId: PROJECT_HEALTHBRIDGE_ID,
    sectionId: SECTION_REPORTS_ANALYTICS_ID,
    parentTaskId: null,
    priority: "low",
    state: notWaiting("to_do"),
    startDate: daysFromNow(-45), // 40-day duration, preserved
    dueDate: daysFromNow(-5),
    position: 2,
    assigneeIds: ["member-purva"],
    dependsOnIds: [],
    createdById: "member-purva",
    createdAt: "2026-06-25T10:00:00.000Z",
    updatedAt: null,
  },

  // --- Atlas Core / Design ---
  {
    id: "task-design-tokens",
    title: "Define monochrome token set",
    description: "Palette, spacing, and radius tokens for the design system.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_DESIGN_ID,
    parentTaskId: null,
    priority: "high",
    state: notWaiting("done"),
    startDate: daysFromNow(-105), // 45-day duration, preserved
    dueDate: daysFromNow(-60),
    position: 0,
    assigneeIds: ["member-phalguni"],
    dependsOnIds: [],
    createdById: "member-phalguni",
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-05-09T16:00:00.000Z",
  },
  {
    id: "task-task-table-spec",
    title: "Spec dense task table interactions",
    description: "Keyboard navigation and row states for the Linear-style table.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_DESIGN_ID,
    parentTaskId: null,
    priority: "medium",
    state: notWaiting("in_progress"),
    startDate: daysFromNow(-26), // 33-day duration, preserved
    dueDate: daysFromNow(7),
    position: 1,
    assigneeIds: ["member-phalguni"],
    dependsOnIds: ["task-design-tokens"],
    createdById: "member-phalguni",
    createdAt: "2026-05-12T09:00:00.000Z",
    updatedAt: "2026-07-22T09:00:00.000Z",
  },
  {
    id: "task-empty-states",
    title: "Design empty state copy and layout",
    description: "Notion-style empty states across sidebar, table, and graph views.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_DESIGN_ID,
    parentTaskId: null,
    priority: "low",
    state: waiting("bad8fdf4-ce6c-453f-aca8-8f56e053ad3c", "2026-08-08T12:00:00.000Z"),
    startDate: daysFromNow(-21), // 32-day duration, preserved
    dueDate: daysFromNow(11),
    position: 2,
    assigneeIds: ["member-purva"],
    dependsOnIds: [],
    createdById: "member-purva",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-08-08T12:00:00.000Z",
  },

  // --- Atlas Core / Frontend ---
  {
    id: "task-dependency-graph",
    title: "Build dependency graph view",
    description: "Force-directed graph with critical path highlighting.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_FRONTEND_ID,
    parentTaskId: null,
    priority: "critical",
    state: notWaiting("blocked"),
    startDate: daysFromNow(-45), // 61-day duration, preserved
    dueDate: daysFromNow(16),
    position: 0,
    assigneeIds: ["member-namana"],
    dependsOnIds: ["task-task-table-spec"],
    createdById: "member-phalguni",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-26T10:00:00.000Z",
  },
  {
    id: "task-theme-provider",
    title: "Ship light/dark theme provider",
    description: "System-aware theme with no flash on reload.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_FRONTEND_ID,
    parentTaskId: null,
    priority: "medium",
    state: notWaiting("done"),
    startDate: daysFromNow(-75), // 20-day duration, preserved
    dueDate: daysFromNow(-55),
    position: 1,
    assigneeIds: ["member-vismaya"],
    dependsOnIds: [],
    createdById: "member-vismaya",
    createdAt: "2026-05-30T09:00:00.000Z",
    updatedAt: "2026-06-04T17:00:00.000Z",
  },
  {
    id: "task-component-primitives",
    title: "Build primitive component library",
    description: "Buttons, chips, inputs, and dialogs shared across the app.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_FRONTEND_ID,
    parentTaskId: null,
    priority: "high",
    state: notWaiting("in_progress"),
    startDate: daysFromNow(-71), // 74-day duration, preserved
    dueDate: daysFromNow(3),
    position: 2,
    assigneeIds: ["member-vismaya", "member-purva"],
    dependsOnIds: ["task-design-tokens"],
    createdById: "member-vismaya",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
  },
  {
    id: "task-primitives-chip",
    title: "Build Chip primitive",
    description: "Subtask: inverted-fill chip used for overdue and status labels.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_FRONTEND_ID,
    parentTaskId: "task-component-primitives",
    priority: "medium",
    state: notWaiting("done"),
    startDate: null,
    dueDate: daysFromNow(-40),
    position: 0,
    assigneeIds: ["member-purva"],
    dependsOnIds: [],
    createdById: "member-purva",
    createdAt: "2026-06-06T09:00:00.000Z",
    updatedAt: "2026-06-18T09:00:00.000Z",
  },

  // --- Atlas Core / Backend ---
  {
    id: "task-history-endpoint",
    title: "Task history query endpoint",
    description: "Paginated history feed per task with actor and field diffs.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_BACKEND_ID,
    parentTaskId: null,
    priority: "medium",
    state: notWaiting("to_do"),
    startDate: null,
    dueDate: daysFromNow(19),
    position: 0,
    assigneeIds: ["member-namana"],
    dependsOnIds: [],
    createdById: "member-namana",
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "task-critical-path-service",
    title: "Critical path computation service",
    description: "Backend job computing CriticalPathResult per project.",
    projectId: PROJECT_ATLAS_CORE_ID,
    sectionId: SECTION_BACKEND_ID,
    parentTaskId: null,
    priority: "critical",
    state: waiting("44a6ea27-9abf-4271-a012-003323013524", "2026-08-07T10:00:00.000Z"),
    startDate: daysFromNow(-41), // 47-day duration, preserved
    dueDate: daysFromNow(6),
    position: 1,
    assigneeIds: ["member-namana"],
    dependsOnIds: [],
    createdById: "member-phalguni",
    createdAt: "2026-06-28T09:00:00.000Z",
    updatedAt: "2026-08-07T10:00:00.000Z",
  },

  // --- API Gateway / Auth Layer ---
  {
    id: "task-oauth-provider",
    title: "OAuth2 provider integration",
    description: "Third-party login via OAuth2 authorization code flow.",
    projectId: PROJECT_API_GATEWAY_ID,
    sectionId: SECTION_AUTH_LAYER_ID,
    parentTaskId: null,
    priority: "high",
    state: notWaiting("in_progress"),
    startDate: daysFromNow(-61), // 63-day duration, preserved
    dueDate: daysFromNow(2),
    position: 0,
    assigneeIds: ["member-purva"],
    dependsOnIds: [],
    createdById: "member-phalguni",
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "task-session-rotation",
    title: "Rotating refresh tokens",
    description: "Short-lived access tokens with rotating refresh token storage.",
    projectId: PROJECT_API_GATEWAY_ID,
    sectionId: SECTION_AUTH_LAYER_ID,
    parentTaskId: null,
    priority: "critical",
    state: notWaiting("to_do"),
    startDate: daysFromNow(-36), // 49-day duration, preserved
    dueDate: daysFromNow(13),
    position: 1,
    assigneeIds: ["member-purva"],
    dependsOnIds: ["task-oauth-provider"],
    createdById: "member-phalguni",
    createdAt: "2026-06-12T09:00:00.000Z",
    updatedAt: null,
  },
  {
    id: "task-rbac-audit",
    title: "Role-based access control audit",
    description: "Verify admin/editor/viewer permission boundaries across endpoints.",
    projectId: PROJECT_API_GATEWAY_ID,
    sectionId: SECTION_AUTH_LAYER_ID,
    parentTaskId: null,
    priority: "medium",
    state: notWaiting("done"),
    startDate: daysFromNow(-87), // 37-day duration, preserved
    dueDate: daysFromNow(-50),
    position: 2,
    assigneeIds: ["member-phalguni"],
    dependsOnIds: [],
    createdById: "member-phalguni",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-29T14:00:00.000Z",
  },

  // --- API Gateway / Infrastructure ---
  {
    id: "task-rate-limiting",
    title: "Per-tenant rate limiting",
    description: "Token-bucket rate limiter at the gateway edge.",
    projectId: PROJECT_API_GATEWAY_ID,
    sectionId: SECTION_INFRASTRUCTURE_ID,
    parentTaskId: null,
    priority: "medium",
    state: notWaiting("blocked"),
    startDate: daysFromNow(-45), // 55-day duration, preserved
    dueDate: daysFromNow(10),
    position: 0,
    assigneeIds: ["member-purva"],
    dependsOnIds: ["task-oauth-provider"],
    createdById: "member-purva",
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-07-15T09:00:00.000Z",
  },
  {
    id: "task-observability-dashboards",
    title: "Gateway observability dashboards",
    description: "Latency, error rate, and saturation dashboards for the gateway.",
    projectId: PROJECT_API_GATEWAY_ID,
    sectionId: SECTION_INFRASTRUCTURE_ID,
    parentTaskId: null,
    priority: "low",
    state: notWaiting("to_do"),
    startDate: null,
    dueDate: daysFromNow(20),
    position: 1,
    assigneeIds: [],
    dependsOnIds: [],
    createdById: "member-purva",
    createdAt: "2026-07-05T09:00:00.000Z",
    updatedAt: null,
  },
];

function toRef(seed: TaskSeed): TaskRef {
  return {
    id: seed.id,
    title: seed.title,
    status: seed.state.status,
    priority: seed.priority,
    isDeleted: false,
  };
}

const SEED_BY_ID: Record<string, TaskSeed> = Object.fromEntries(
  SEEDS.map((seed) => [seed.id, seed]),
);

function refFor(id: string): TaskRef {
  const seed = SEED_BY_ID[id];
  if (!seed) throw new Error(`Unknown task id: ${id}`);
  return toRef(seed);
}

const BLOCKS_BY_ID: Record<string, TaskRef[]> = {};
for (const seed of SEEDS) {
  for (const dependsOnId of seed.dependsOnIds) {
    (BLOCKS_BY_ID[dependsOnId] ??= []).push(toRef(seed));
  }
}

const SUBTASKS_BY_PARENT_ID: Record<string, TaskRef[]> = {};
for (const seed of SEEDS) {
  if (seed.parentTaskId) {
    (SUBTASKS_BY_PARENT_ID[seed.parentTaskId] ??= []).push(toRef(seed));
  }
}

export const TASKS: TaskView[] = SEEDS.map((seed) => ({
  id: seed.id,
  title: seed.title,
  description: seed.description,
  projectId: seed.projectId,
  sectionId: seed.sectionId,
  parentTaskId: seed.parentTaskId,
  priority: seed.priority,
  state: seed.state,
  startDate: seed.startDate,
  dueDate: seed.dueDate,
  position: seed.position,
  assignees: seed.assigneeIds.map((id) => MEMBER_BY_ID[id]).filter((m): m is NonNullable<typeof m> => m !== undefined),
  dependsOn: seed.dependsOnIds.map(refFor),
  blocks: BLOCKS_BY_ID[seed.id] ?? [],
  subtasks: SUBTASKS_BY_PARENT_ID[seed.id] ?? [],
  createdBy: MEMBER_BY_ID[seed.createdById] ?? null,
  createdAt: seed.createdAt,
  updatedAt: seed.updatedAt,
  isDeleted: false,
  ...(TASK_INTELLIGENCE_BY_ID[seed.id] ? { intelligence: TASK_INTELLIGENCE_BY_ID[seed.id] } : {}),
}));

export const TASK_BY_ID: Record<string, TaskView> = Object.fromEntries(
  TASKS.map((t) => [t.id, t]),
);
