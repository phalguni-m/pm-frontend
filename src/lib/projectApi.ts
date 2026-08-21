import { initialsOf } from "@/lib/format";
import type { Section, Task } from "@/types/database";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function getHeaders(): Record<string, string> {
  const token = import.meta.env.VITE_DEV_ACCESS_TOKEN;
  const userId = import.meta.env.VITE_DEV_USER_ID;

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  if (userId) {
    return {
      "X-User-Id": userId,
    };
  }

  return {};
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // Ignore non-JSON errors
    }

    throw new Error(message);
  }

  return response.json();
}

export interface Member {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "admin" | "editor" | "viewer";
}

interface BackendMember {
  id: string;
  user_id: string | null;
  role: "admin" | "editor" | "viewer";
  app_user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Matches the real backend response (raw `project` row, select("*") in
// projectService.listProjects) — previously typed as {id, name} only, which
// was narrower than reality (see docs/API_MISMATCH_AUDIT.md, Step 3/Row 2:
// "frontend type is a strict subset of the real fields... safe" — true for
// HistoryPage.tsx's read-only-id-and-name usage, but too narrow for
// src/lib/projectAdapter.ts, which needs description/created_at/is_deleted).
export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
}

export interface HistoryFeedEntry {
  id: string;
  taskId: string;
  taskTitle: string | null;
  userId: string | null;
  userName: string | null;
  eventType: string;
  status: string | null;
  createdAt: string;
}

export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<Member[]> {
  const rows = await getJson<BackendMember[]>(
    `/api/workspaces/${workspaceId}/members`,
  );

  return rows
    .filter((row) => row.app_user)
    .map((row) => ({
      id: row.app_user!.id,
      name: row.app_user!.name,
      email: row.app_user!.email,
      initials: initialsOf(row.app_user!.name),
      role: row.role,
    }));
}

export async function getWorkspaceProjects(
  workspaceId: string,
): Promise<Project[]> {
  return getJson<Project[]>(
    `/api/projects/workspace/${workspaceId}`,
  );
}

export async function getProjectHistory(
  projectId: string,
): Promise<HistoryFeedEntry[]> {
  return getJson<HistoryFeedEntry[]>(
    `/api/history/projects/${projectId}`,
  );
}

// Raw backend Task rows for one project — GET /api/tasks/project/:projectId
// (backend/src/routes/tasks.ts, taskService.listTasks). Returns database.ts's
// Task shape as-is; callers map through src/lib/taskAdapter.ts to get a
// TaskView.
export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return getJson<Task[]>(`/api/tasks/project/${projectId}`);
}

// Raw backend Section rows for one project — GET /api/projects/:projectId/sections
// (backend/src/routes/sections.ts, sectionService.listSections). Confirmed to
// exist and be mounted (app.ts: app.use("/api/projects/:projectId/sections", sectionRoutes)) —
// not faked.
export async function getProjectSections(projectId: string): Promise<Section[]> {
  return getJson<Section[]>(`/api/projects/${projectId}/sections`);
}
