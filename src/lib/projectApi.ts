import { initialsOf } from "@/lib/format";

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

export interface Project {
  id: string;
  name: string;
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
    `/api/history/projects/${projectId}/feed`,
  );
}