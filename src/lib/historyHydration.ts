/**
 * Hydrates task titles onto `getProjectHistory`'s response.
 *
 * `getProjectHistory` (src/lib/projectApi.ts) returns `HistoryFeedEntry[]`
 * with `taskTitle`/`userName`/`status` typed as present, but the real
 * backend route (`GET /api/history/projects/:projectId`) returns raw
 * `task_history` rows with none of those fields — see
 * docs/API_MISMATCH_AUDIT.md, Step 3, Row 3. `taskTitle` is fixable from the
 * frontend because `GET /api/tasks/project/:projectId` (listTasks) returns
 * every task's title in one call. `userName` is NOT fixed here: the only
 * backend route that ever resolves a userId to a name is
 * `GET /api/tasks/:taskId/assignees`, which is scoped to one task at a time
 * — hydrating every history row's `userName` that way means one request per
 * task, which this module deliberately does not do. `userName` keeps
 * degrading to HistoryPage's existing "Unknown user" fallback until a real
 * bulk user-lookup endpoint exists.
 */

import { getProjectHistory, type HistoryFeedEntry } from "@/lib/projectApi";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function getHeaders(): Record<string, string> {
  const token = import.meta.env.VITE_DEV_ACCESS_TOKEN;
  const userId = import.meta.env.VITE_DEV_USER_ID;

  if (token) return { Authorization: `Bearer ${token}` };
  if (userId) return { "X-User-Id": userId };
  return {};
}

interface BackendTask {
  id: string;
  title: string;
}

// WORKAROUND: substitutes for the missing taskTitle field on
// GET /api/history/projects/:projectId — delete when that route joins task
// titles itself, or when a dedicated title-lookup endpoint ships.
async function getProjectTaskTitles(projectId: string): Promise<Map<string, string>> {
  const response = await fetch(`${API_BASE}/api/tasks/project/${projectId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    // A project's tasks failing to load shouldn't take down its history
    // feed — every row just falls back to "Unknown task" (see
    // hydrateProjectHistory below), same as today's un-hydrated behavior.
    return new Map();
  }

  const tasks = (await response.json()) as BackendTask[];
  return new Map(tasks.map((task) => [task.id, task.title]));
}

// WORKAROUND: substitutes for taskTitle/userName being absent from
// GET /api/history/projects/:projectId's real response — delete this
// wrapper (and switch HistoryPage.tsx back to calling getProjectHistory
// directly) once that endpoint returns already-hydrated rows, or once
// docs/API_MISMATCH_AUDIT.md's Step 3/Row 3 shape break is fixed
// backend-side.
export async function hydrateProjectHistory(projectId: string): Promise<HistoryFeedEntry[]> {
  const [rows, titleById] = await Promise.all([
    getProjectHistory(projectId),
    getProjectTaskTitles(projectId),
  ]);

  return rows.map((row) => ({
    ...row,
    taskTitle: row.taskTitle ?? (row.taskId ? titleById.get(row.taskId) ?? null : null),
  }));
}
