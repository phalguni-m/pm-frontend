import type { HistoryEntry } from "@/types/ui";
import { MEMBER_BY_ID } from "@/fixtures/members";

interface HistorySeed {
  id: string;
  taskId: string;
  actorId: string | null;
  eventType: string;
  changes: HistoryEntry["changes"];
  createdAt: string;
}

const SEEDS: HistorySeed[] = [
  {
    id: "history-1",
    taskId: "task-intake-form",
    actorId: "member-phalguni",
    eventType: "created",
    changes: [],
    createdAt: "2026-05-28T10:00:00.000Z",
  },
  {
    id: "history-2",
    taskId: "task-intake-form",
    actorId: "member-vismaya",
    eventType: "status_changed",
    changes: [{ field: "status", from: "to_do", to: "in_progress" }],
    createdAt: "2026-05-29T09:00:00.000Z",
  },
  {
    id: "history-3",
    taskId: "task-intake-form",
    actorId: "member-vismaya",
    eventType: "status_changed",
    changes: [{ field: "status", from: "in_progress", to: "done" }],
    createdAt: "2026-06-09T15:30:00.000Z",
  },
  {
    id: "history-4",
    taskId: "task-triage-rules",
    actorId: "member-phalguni",
    eventType: "created",
    changes: [],
    createdAt: "2026-05-28T10:05:00.000Z",
  },
  {
    id: "history-5",
    taskId: "task-triage-rules",
    actorId: "member-phalguni",
    eventType: "dependency_added",
    changes: [{ field: "dependsOn", from: null, to: "task-intake-form" }],
    createdAt: "2026-05-28T10:06:00.000Z",
  },
  {
    id: "history-6",
    taskId: "task-triage-rules",
    actorId: "member-namana",
    eventType: "assignee_added",
    changes: [{ field: "assignee", from: null, to: "member-namana" }],
    createdAt: "2026-06-10T08:00:00.000Z",
  },
  {
    id: "history-7",
    taskId: "task-triage-rules",
    actorId: "member-vismaya",
    eventType: "priority_changed",
    changes: [{ field: "priority", from: "high", to: "critical" }],
    createdAt: "2026-06-12T11:00:00.000Z",
  },
  {
    id: "history-8",
    taskId: "task-offline-sync",
    actorId: "member-vismaya",
    eventType: "created",
    changes: [],
    createdAt: "2026-06-01T11:00:00.000Z",
  },
  {
    id: "history-9",
    taskId: "task-offline-sync",
    actorId: "member-namana",
    eventType: "assignee_added",
    changes: [{ field: "assignee", from: null, to: "member-namana" }],
    createdAt: "2026-06-02T09:00:00.000Z",
  },
  {
    id: "history-10",
    taskId: "task-offline-sync",
    actorId: "member-namana",
    eventType: "status_changed",
    changes: [{ field: "status", from: "to_do", to: "in_progress" }],
    createdAt: "2026-06-24T09:00:00.000Z",
  },
  {
    id: "history-11",
    taskId: "task-offline-sync",
    actorId: "member-namana",
    eventType: "status_changed",
    changes: [
      { field: "status", from: "in_progress", to: "waiting" },
      { field: "delayCause", from: null, to: "Dependency" },
    ],
    createdAt: "2026-08-05T08:00:00.000Z",
  },
  {
    id: "history-12",
    taskId: "task-danger-sign-review",
    actorId: "member-phalguni",
    eventType: "created",
    changes: [],
    createdAt: "2026-06-15T09:00:00.000Z",
  },
  {
    id: "history-13",
    taskId: "task-danger-sign-review",
    actorId: "member-phalguni",
    eventType: "due_date_changed",
    changes: [{ field: "dueDate", from: "2026-07-15", to: "2026-07-28" }],
    createdAt: "2026-07-10T09:00:00.000Z",
  },
  {
    id: "history-14",
    taskId: "task-danger-sign-review",
    actorId: "member-phalguni",
    eventType: "status_changed",
    changes: [
      { field: "status", from: "in_progress", to: "waiting" },
      { field: "delayCause", from: null, to: "External input" },
    ],
    createdAt: "2026-08-02T09:00:00.000Z",
  },
  {
    id: "history-15",
    taskId: "task-dependency-graph",
    actorId: "member-namana",
    eventType: "created",
    changes: [],
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "history-16",
    taskId: "task-dependency-graph",
    actorId: "member-namana",
    eventType: "status_changed",
    changes: [{ field: "status", from: "to_do", to: "blocked" }],
    createdAt: "2026-07-26T10:00:00.000Z",
  },
  {
    id: "history-17",
    taskId: "task-critical-path-service",
    actorId: "member-phalguni",
    eventType: "created",
    changes: [],
    createdAt: "2026-06-28T09:00:00.000Z",
  },
  {
    id: "history-18",
    taskId: "task-critical-path-service",
    actorId: "member-namana",
    eventType: "assignee_removed",
    changes: [{ field: "assignee", from: "member-phalguni", to: null }],
    createdAt: "2026-07-20T09:00:00.000Z",
  },
  {
    id: "history-19",
    taskId: "task-critical-path-service",
    actorId: "member-namana",
    eventType: "status_changed",
    changes: [
      { field: "status", from: "in_progress", to: "waiting" },
      { field: "delayCause", from: null, to: "Approval" },
    ],
    createdAt: "2026-08-07T10:00:00.000Z",
  },
  {
    // Deliberately outside KNOWN_EVENT_TYPES to exercise the generic
    // fallback renderer for unrecognized history events.
    id: "history-20",
    taskId: "task-oauth-provider",
    actorId: "member-purva",
    eventType: "webhook_retried",
    changes: [],
    createdAt: "2026-06-25T14:00:00.000Z",
  },
];

export const HISTORY: HistoryEntry[] = SEEDS.map((seed) => ({
  id: seed.id,
  taskId: seed.taskId,
  actor: seed.actorId ? (MEMBER_BY_ID[seed.actorId] ?? null) : null,
  eventType: seed.eventType,
  changes: seed.changes,
  createdAt: seed.createdAt,
}));
