import type { TaskDep } from "@/types/database";

/**
 * Flat TaskDep[] — the real API's exact shape (see src/types/database.ts),
 * not a camelCase reshaping. This is the contract src/lib/graph.ts builds
 * its adjacency structure from.
 *
 * Seeded against src/fixtures/tasks.ts to exercise every graph shape the
 * layout algorithm needs to handle:
 *   - a linear chain (intake-form -> triage-rules -> offline-sync -> field-report-export)
 *   - a fan-out (triage-rules blocks both danger-sign-review and triage-offline-tests)
 *   - a fan-in (offline-sync and outcome-dashboard both feed report-overdue-cleanup... via a diamond, see below)
 *   - a diamond (design-tokens -> {task-table-spec, primitives-chip} -> ... they don't reconverge in tasks.ts,
 *     so a dedicated diamond is seeded here: design-tokens -> {task-table-spec, empty-states} -> component-primitives)
 *   - task-triage-offline-conflict has zero edges (isolated node)
 *   - two disconnected components: HealthBridge's triage chain, and the
 *     API Gateway auth chain (oauth-provider -> {session-rotation, rate-limiting})
 *     share no path to each other or to Atlas Core's design-system chain
 *
 * No cycle is seeded — the server rejects cycles at write time — but
 * lib/graph.ts must still survive one gracefully (see its kitchen-sink demo
 * fixture, which does seed one, local to that page only).
 */
export const DEPENDENCIES: TaskDep[] = [
  // Linear chain, 4 deep (HealthBridge / Core Triage).
  {
    id: "dep-intake-triage",
    blocking_task_id: "task-intake-form",
    blocked_task_id: "task-triage-rules",
    created_at: "2026-06-02T09:00:00.000Z",
  },
  {
    id: "dep-triage-offlinesync",
    blocking_task_id: "task-triage-rules",
    blocked_task_id: "task-offline-sync",
    created_at: "2026-06-10T09:00:00.000Z",
  },
  {
    id: "dep-offlinesync-export",
    blocking_task_id: "task-offline-sync",
    blocked_task_id: "task-field-report-export",
    created_at: "2026-06-18T09:00:00.000Z",
  },

  // Fan-out: triage-rules also blocks two more tasks besides offline-sync.
  {
    id: "dep-triage-dangersign",
    blocking_task_id: "task-triage-rules",
    blocked_task_id: "task-danger-sign-review",
    created_at: "2026-06-11T09:00:00.000Z",
  },
  {
    id: "dep-triage-offlinetests",
    blocking_task_id: "task-triage-rules",
    blocked_task_id: "task-triage-offline-tests",
    created_at: "2026-06-12T09:00:00.000Z",
  },

  // Fan-in: field-report-export and outcome-dashboard both feed report-overdue-cleanup.
  {
    id: "dep-export-cleanup",
    blocking_task_id: "task-field-report-export",
    blocked_task_id: "task-report-overdue-cleanup",
    created_at: "2026-06-20T09:00:00.000Z",
  },
  {
    id: "dep-outcomedash-cleanup",
    blocking_task_id: "task-outcome-dashboard",
    blocked_task_id: "task-report-overdue-cleanup",
    created_at: "2026-06-21T09:00:00.000Z",
  },

  // Diamond (Atlas Core / Design + Frontend): design-tokens forks into two
  // tasks that both reconverge on component-primitives.
  {
    id: "dep-tokens-tabletspec",
    blocking_task_id: "task-design-tokens",
    blocked_task_id: "task-task-table-spec",
    created_at: "2026-05-05T09:00:00.000Z",
  },
  {
    id: "dep-tokens-emptystates",
    blocking_task_id: "task-design-tokens",
    blocked_task_id: "task-empty-states",
    created_at: "2026-05-06T09:00:00.000Z",
  },
  {
    id: "dep-tabletspec-primitives",
    blocking_task_id: "task-task-table-spec",
    blocked_task_id: "task-component-primitives",
    created_at: "2026-05-12T09:00:00.000Z",
  },
  {
    id: "dep-emptystates-primitives",
    blocking_task_id: "task-empty-states",
    blocked_task_id: "task-component-primitives",
    created_at: "2026-05-13T09:00:00.000Z",
  },

  // Disconnected component: API Gateway auth chain (fan-out from oauth-provider).
  {
    id: "dep-oauth-sessionrotation",
    blocking_task_id: "task-oauth-provider",
    blocked_task_id: "task-session-rotation",
    created_at: "2026-04-10T09:00:00.000Z",
  },
  {
    id: "dep-oauth-ratelimiting",
    blocking_task_id: "task-oauth-provider",
    blocked_task_id: "task-rate-limiting",
    created_at: "2026-04-11T09:00:00.000Z",
  },

  // task-triage-offline-conflict, task-dependency-graph, task-theme-provider,
  // task-primitives-chip, task-history-endpoint, task-critical-path-service,
  // task-rbac-audit, task-observability-dashboards all stay edge-free —
  // isolated nodes by omission.
];
