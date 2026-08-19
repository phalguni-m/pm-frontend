import { useEffect, useState } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import {
  getWorkspaceProjects,
  getProjectHistory,
  type HistoryFeedEntry,
} from "@/lib/projectApi";

const WORKSPACE_ID = import.meta.env.VITE_DEV_WORKSPACE_ID;

interface HistoryWithProject extends HistoryFeedEntry {
  projectName: string;
}

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);

        const projects =
          await getWorkspaceProjects(WORKSPACE_ID);

        const results = await Promise.all(
          projects.map(async (project) => {
            const feed = await getProjectHistory(project.id);

            return feed.map((entry) => ({
              ...entry,
              projectName: project.name,
            }));
          }),
        );

        const combined = results
          .flat()
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );

        setHistory(combined);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load history",
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  return (
    <div>
      <PageHeader
        title="History"
        description="Recent activity across your projects"
      />

      {loading && <p>Loading history...</p>}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && history.length === 0 && (
        <p>No history found.</p>
      )}

      {!loading && !error && history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {history.map((entry) => (
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
                  {entry.taskTitle ?? "Unknown task"}
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

function formatEvent(eventType: string): string {
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
      return eventType.replaceAll("_", " ");
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}