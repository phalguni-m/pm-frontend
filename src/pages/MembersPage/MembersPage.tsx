import { useEffect, useState } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Skeleton } from "@/components/primitives/Skeleton";
import {
  getWorkspaceMembers,
  type Member,
} from "@/lib/projectApi";

const WORKSPACE_ID = import.meta.env.VITE_DEV_WORKSPACE_ID;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: Member[] };

export function MembersPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    getWorkspaceMembers(WORKSPACE_ID)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load members";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div>
      <PageHeader
        title="Members"
        description="People in this workspace"
      />

      {state.status === "loading" && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton height={56} radius="md" />
          <Skeleton height={56} radius="md" />
          <Skeleton height={56} radius="md" />
        </div>
      )}

      {state.status === "error" && (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            message={state.message}
            action={{ label: "Retry", onClick: () => setAttempt((n) => n + 1) }}
          />
        </div>
      )}

      {state.status === "success" && state.data.length === 0 && (
        <div style={{ marginTop: 24 }}>
          <EmptyState message="No members found." />
        </div>
      )}

      {state.status === "success" && state.data.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {state.data.map((member) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 0",
                borderBottom: "1px solid #333",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#333",
                }}
              >
                {member.initials}
              </div>

              <div>
                <div>{member.name}</div>
                <div style={{ opacity: 0.6 }}>
                  {member.email}
                </div>
              </div>

              <div style={{ marginLeft: "auto" }}>
                {member.role}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}