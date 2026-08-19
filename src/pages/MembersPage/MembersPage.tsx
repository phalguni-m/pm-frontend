import { useEffect, useState } from "react";
import { PageHeader } from "@/components/primitives/PageHeader";
import {
  getWorkspaceMembers,
  type Member,
} from "@/lib/projectApi";

const WORKSPACE_ID = import.meta.env.VITE_DEV_WORKSPACE_ID;

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoading(true);
        setError(null);

        const data = await getWorkspaceMembers(WORKSPACE_ID);
        setMembers(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load members",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, []);

  return (
    <div>
      <PageHeader
        title="Members"
        description="People in this workspace"
      />

      {loading && <p>Loading members...</p>}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && members.length === 0 && (
        <p>No members found.</p>
      )}

      {!loading && !error && members.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {members.map((member) => (
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