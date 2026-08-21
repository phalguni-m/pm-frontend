/**
 * Pure mapping from a raw backend Project row (src/types/database.ts) to the
 * ProjectView shape components consume (src/types/ui.ts). Mirrors
 * src/lib/taskAdapter.ts's pattern: no fetching, no store access — sections
 * and statusCounts are assembled by the caller (src/store/selectors.ts),
 * the same place that already derives statusCounts from live tasksById for
 * fixture-seeded projects.
 */

import type { Project } from "@/types/database";
import type { ProjectView, StatusCounts } from "@/types/ui";

function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

export function mapApiProjectToProjectView(row: Project): ProjectView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    // No bulk user-lookup endpoint exists (docs/INTEGRATION_AUDIT.md §6.2) —
    // resolving workspace/project members to Member[] would mean a separate
    // members endpoint this mapper doesn't call. Empty, not fabricated.
    members: [],
    // Assembled by the caller from live sectionsById/tasksById — a bare
    // Project row has no sections at all, nested or otherwise.
    sections: [],
    // Zeroed here; the caller (selectors.ts) recomputes this from whatever
    // tasks actually exist in the store for this project, the same way it
    // already does for fixture-seeded ProjectViews. A Project row carries no
    // status tally of its own.
    statusCounts: emptyCounts(),
    createdAt: row.created_at,
    isDeleted: row.is_deleted,
  };
}
