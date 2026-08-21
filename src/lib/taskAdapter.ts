/**
 * Pure mapping from a raw backend Task row (src/types/database.ts) to the
 * TaskView shape components consume (src/types/ui.ts). No fetching, no
 * fixtures — see docs/API_MISMATCH_AUDIT.md / docs/INTEGRATION_AUDIT.md §6
 * for the gaps this mapping cannot close yet.
 */

import type { Task } from "@/types/database";
import type { TaskState, TaskView } from "@/types/ui";

function stateFromStatus(row: Task): TaskState {
  if (row.status === "waiting") {
    // TODO: delay_cause_id resolution is unimplemented — no fixture-free
    // path from Task.delay_cause_id to a DelayCause exists yet (no
    // GET /api/delay-causes consumer wired up here), and Task also carries
    // no "entered this status at" timestamp for waitingSince (only
    // created_at/updated_at). Both are left null rather than fabricated.
    return { status: "waiting", delayCause: null, waitingSince: null };
  }

  return { status: row.status, delayCause: null, waitingSince: null };
}

export function mapApiTaskToTaskView(row: Task): TaskView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    // Task.project_id is nullable in the DB row; TaskView.projectId is not.
    // A task with no project_id has no legitimate TaskView representation —
    // falling back to "" would fabricate a value, so this throws instead of
    // silently mapping null to an empty string.
    projectId: requireProjectId(row),
    sectionId: row.section_id,
    parentTaskId: row.parent_task_id,
    priority: row.priority,
    state: stateFromStatus(row),
    startDate: row.start_date,
    dueDate: row.due_date,
    position: row.position,
    // No bulk user-lookup endpoint exists (docs/INTEGRATION_AUDIT.md §6.2) —
    // resolving created_by to a Member would mean a per-task assignees call,
    // which this pure mapper must not make.
    createdBy: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted,
    // assignees/dependsOn/blocks/subtasks each need a separate endpoint
    // (task_assignees join, dependency edges, parent_task_id siblings) —
    // out of scope for a single-row mapper with no fetching.
    assignees: [],
    dependsOn: [],
    blocks: [],
    subtasks: [],
    // identifier: no short identifier exists in the schema — omitted, never
    // fabricated (same rule ui.ts:80-82 states for TaskRef).
    // intelligence: sourced from 4 separate per-task analysis endpoints,
    // not from the Task row — omitted (optional on TaskView).
    // risk_score: present on some live API responses but not modeled in
    // src/types/database.ts's Task interface at all yet, and not the same
    // value as TaskIntelligence.riskScore (a different, fixture-only
    // computation) — dropped rather than guessing which one it corresponds to.
    // version: no optimistic-concurrency field exists anywhere on TaskView;
    // nothing in this codebase reads or compares it yet — dropped.
  };
}

function requireProjectId(row: Task): string {
  if (row.project_id === null) {
    throw new Error(`Task ${row.id} has no project_id — cannot map to TaskView`);
  }
  return row.project_id;
}
