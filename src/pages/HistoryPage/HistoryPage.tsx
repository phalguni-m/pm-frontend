import { useEffect, useState } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Skeleton } from "@/components/primitives/Skeleton";
import {
  getWorkspaceProjects,
  getProjectHistory,
  getProjectTasks,
  getWorkspaceMembers,
  type HistoryFeedEntry,
} from "@/lib/projectApi";

const WORKSPACE_ID = import.meta.env.VITE_DEV_WORKSPACE_ID;

interface HistoryWithProject extends HistoryFeedEntry {
  projectName: string;
  taskTitle: string | null;
  userName: string | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: HistoryWithProject[] };

export function HistoryPage() {
  const [state, setState] = useState<LoadState>({
    status: "loading",
  });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setState({ status: "loading" });

      try {
        // Get all projects in the workspace
        const projects = await getWorkspaceProjects(WORKSPACE_ID);

        // Get workspace members once
        const members = await getWorkspaceMembers(WORKSPACE_ID);

        const results = await Promise.all(
          projects.map(async (project) => {
            // Get history + tasks for this project
            const [history, tasks] = await Promise.all([
              getProjectHistory(project.id),
              getProjectTasks(project.id),
            ]);

            return history.map((entry) => {
              const task = tasks.find(
                (task) => task.id === entry.taskId,
              );

              const member = members.find(
                (member) => member.id === entry.userId,
              );

              return {
                ...entry,
                projectName: project.name,
                taskTitle:
                  task?.title ??
                  entry.taskTitle ??
                  null,
                userName:
                  member?.name ??
                  entry.userName ??
                  null,
              };
            });
          }),
        );

        const combined = results
          .flat()
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            return dateB - dateA;
          });

        if (!cancelled) {
          setState({
            status: "success",
            data: combined,
          });
        }
      } catch (err) {
        if (cancelled) return;

        setState({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Failed to load history",
        });
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div>
      <PageHeader
        title="History"
        description="Recent activity across your projects"
      />

      {state.status === "loading" && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
          <Skeleton height={64} radius="md" />
        </div>
      )}

      {state.status === "error" && (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            message={state.message}
            action={{
              label: "Retry",
              onClick: () => setAttempt((n) => n + 1),
            }}
          />
        </div>
      )}

      {state.status === "success" &&
        state.data.length === 0 && (
          <div style={{ marginTop: 24 }}>
            <EmptyState message="No history found." />
          </div>
        )}

      {state.status === "success" &&
        state.data.length > 0 && (
          <div style={{ marginTop: 24 }}>
            {state.data.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #333",
                }}
              >
                <div>
                  <strong>
                    {entry.userName ?? "Unknown user"}
                  </strong>{" "}
                  {formatEvent(entry.eventType)}
                </div>

                <div style={{ marginTop: 6 }}>
                  <strong>
                    {entry.taskTitle ??
                      `Task ${entry.taskId}`}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    opacity: 0.6,
                    fontSize: 13,
                  }}
                >
                  {entry.projectName} ·{" "}
                  {formatDate(entry.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function formatEvent(
  eventType: string | null | undefined,
): string {
  if (!eventType) {
    return "performed an action";
  }

  switch (eventType) {
    case "created":
      return "created a task";

    case "updated":
      return "updated a task";

    case "deleted":
      return "deleted a task";

    case "assignee_added":
      return "assigned a task";

    case "assignee_removed":
      return "removed an assignee from a task";

    default:
      return String(eventType).replaceAll("_", " ");
  }
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString();
}