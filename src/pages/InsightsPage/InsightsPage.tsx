import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "@/pages/InsightsPage/InsightsPage.module.css";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Card } from "@/components/primitives/Card";
import { CardGrid } from "@/components/primitives/CardGrid";
import { EmptyState } from "@/components/primitives/EmptyState";
import { TallyMeter } from "@/components/primitives/TallyMeter";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import { Table, type TableColumn, type TableRowData } from "@/components/primitives/Table";
import { PROJECT_BY_ID } from "@/fixtures";
import { getInsightsDashboard, InsightsApiError } from "@/lib/insightsApi";
import type {
  ContextSwitchingResult,
  HandoffResult,
  InsightsDashboardResult,
  RiskScoreResult,
  SeverityLevel,
  WaitingTimeResult,
} from "@/types/database";

// SeverityLevel ("low"|"medium"|"high"|"critical") is structurally
// identical to PriorityLevel — PriorityChip is reused as-is to render it
// (no existing component renders SeverityLevel directly; RiskBadge's
// 1-5 numeric tier doesn't fit, and building a new primitive for a type
// that's already exactly PriorityChip's shape isn't warranted).
function SeverityChip({ severity }: { severity: SeverityLevel }) {
  return <PriorityChip priority={severity} />;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; httpStatus: number }
  | { status: "success"; data: InsightsDashboardResult };

const noop = () => {};
const noExpanded: ReadonlySet<string> = new Set();

function EmptyPanel({ message }: { message: string }) {
  return (
    <Card flush>
      <EmptyState message={message} />
    </Card>
  );
}

function riskColumns(): TableColumn<RiskScoreResult>[] {
  return [
    { id: "task", header: "Task", cardSlot: "title", render: (r) => r.taskTitle ?? "Untitled task" },
    { id: "severity", header: "Risk", width: "content", cardSlot: "meta", render: (r) => <SeverityChip severity={r.riskLevel} /> },
    { id: "score", header: "Score", align: "end", width: "content", cardSlot: "footerEnd", render: (r) => <span className="tabular">{r.riskScore}</span> },
    { id: "explanation", header: "Why", cardSlot: "meta", render: (r) => <span className={styles.explanation}>{r.explanation}</span> },
  ];
}

function handoffColumns(): TableColumn<HandoffResult>[] {
  return [
    { id: "task", header: "Task", cardSlot: "title", render: (r) => r.taskTitle ?? "Untitled task" },
    { id: "from", header: "From", width: "content", cardSlot: "meta", render: (r) => r.previousOwnerName ?? "Unassigned" },
    { id: "to", header: "To", width: "content", cardSlot: "meta", render: (r) => r.nextOwnerName ?? "Unassigned" },
    { id: "delay", header: "Delay", align: "end", width: "content", cardSlot: "footerStart", render: (r) => <span className="tabular">{r.features.handoffDelayHours}h</span> },
    { id: "severity", header: "Severity", width: "content", cardSlot: "footerEnd", render: (r) => <SeverityChip severity={r.severity} /> },
    { id: "explanation", header: "Why", render: (r) => <span className={styles.explanation}>{r.explanation}</span> },
  ];
}

function contextSwitchingColumns(): TableColumn<ContextSwitchingResult>[] {
  return [
    { id: "user", header: "User", cardSlot: "title", render: (r) => r.userName ?? "Unknown user" },
    { id: "peak", header: "Peak concurrent", align: "end", width: "content", cardSlot: "meta", render: (r) => <span className="tabular">{r.features.peakConcurrentActiveTasks}</span> },
    { id: "perDay", header: "Switches/day", align: "end", width: "content", cardSlot: "footerStart", render: (r) => <span className="tabular">{r.features.contextSwitchesPerDay}</span> },
    { id: "severity", header: "Severity", width: "content", cardSlot: "footerEnd", render: (r) => <SeverityChip severity={r.severity} /> },
    { id: "explanation", header: "Why", render: (r) => <span className={styles.explanation}>{r.explanation}</span> },
  ];
}

function waitingTimeColumns(): TableColumn<WaitingTimeResult>[] {
  return [
    { id: "task", header: "Task", cardSlot: "title", render: (r) => r.taskTitle ?? "Untitled task" },
    { id: "idle", header: "Idle hours", align: "end", width: "content", cardSlot: "meta", render: (r) => <span className="tabular">{r.features.idleHours}</span> },
    { id: "current", header: "Currently idle", align: "end", width: "content", cardSlot: "footerStart", render: (r) => <span className="tabular">{r.features.currentIdleHours}h</span> },
    { id: "severity", header: "Severity", width: "content", cardSlot: "footerEnd", render: (r) => <SeverityChip severity={r.severity} /> },
    { id: "explanation", header: "Why", render: (r) => <span className={styles.explanation}>{r.explanation}</span> },
  ];
}

function riskRows(items: RiskScoreResult[]): TableRowData<RiskScoreResult>[] {
  return items.map((item) => ({ id: item.taskId, data: item }));
}

function handoffRows(items: HandoffResult[]): TableRowData<HandoffResult>[] {
  // taskId alone isn't unique — a task can have more than one completed
  // handoff — so the row id also carries when the handoff happened.
  return items.map((item) => ({ id: `${item.taskId}-${item.removedAt}-${item.addedAt}`, data: item }));
}

function contextSwitchingRows(items: ContextSwitchingResult[]): TableRowData<ContextSwitchingResult>[] {
  return items.map((item) => ({ id: item.userId, data: item }));
}

function waitingTimeRows(items: WaitingTimeResult[]): TableRowData<WaitingTimeResult>[] {
  return items.map((item) => ({ id: item.taskId, data: item }));
}

export function InsightsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = projectId ? PROJECT_BY_ID[projectId] : undefined;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    setState({ status: "loading" });

    getInsightsDashboard(
  projectId === "project-healthbridge"
    ? "99999999-9999-9999-9999-999999999999"
    : projectId,
)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof InsightsApiError ? err.message : "Something went wrong loading insights.";
        const httpStatus = err instanceof InsightsApiError ? err.status : 0;
        setState({ status: "error", message, httpStatus });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, attempt]);

  if (!projectId || !project) {
    return <NotFoundPage message="This project doesn't exist." />;
  }

  return (
    <div className={styles.root}>
      <PageHeader
        title={`${project.name} — Insights`}
        description="AI-detected workflow risk, handoffs, context switching, and waiting time."
      />

      {state.status === "loading" && (
        <Card flush>
          <Table
            columns={riskColumns()}
            rows={[]}
            expandedIds={noExpanded}
            onToggleExpand={noop}
            onRowActivate={noop}
            isLoading
          />
        </Card>
      )}

      {state.status === "error" && (
        <Card>
          <EmptyState
            message={
              state.httpStatus === 401 || state.httpStatus === 403
                ? `${state.message} — real authenticated API testing is blocked until login is wired. For local development, set VITE_DEV_USER_ID in .env.local to a real app_user id from your Supabase instance.`
                : state.message
            }
            action={{ label: "Retry", onClick: () => setAttempt((n) => n + 1) }}
          />
        </Card>
      )}

      {state.status === "success" && (
        <>
          <CardGrid>
            <Card title="Project health" subtitle={`Updated ${new Date(state.data.computedAt).toLocaleString()}`}>
              <TallyMeter label="Health score" percent={state.data.summary.healthScore} />
              <div className={styles.summaryRow}>
                <span>Overall risk</span>
                <SeverityChip severity={state.data.summary.overallRisk} />
              </div>
            </Card>
            <Card title="Anomalies detected">
              <ul className={styles.statList}>
                <li>
                  <span>Total</span>
                  <span className="tabular">{state.data.summary.totalAnomalies}</span>
                </li>
                <li>
                  <span>Context switching</span>
                  <span className="tabular">{state.data.summary.contextSwitchingAnomalies}</span>
                </li>
                <li>
                  <span>Handoff breakdowns</span>
                  <span className="tabular">{state.data.summary.handoffBreakdownAnomalies}</span>
                </li>
                <li>
                  <span>Hidden waiting</span>
                  <span className="tabular">{state.data.summary.hiddenWaitingAnomalies}</span>
                </li>
                <li>
                  <span>High risk tasks</span>
                  <span className="tabular">{state.data.summary.highRiskTasks}</span>
                </li>
              </ul>
            </Card>
            <Card title="Recommendations">
              {state.data.recommendations.length === 0 ? (
                <EmptyState message="No high-priority recommendations right now." />
              ) : (
                <ul className={styles.recommendationList}>
                  {state.data.recommendations.map((rec) => (
                    <li key={rec}>{rec}</li>
                  ))}
                </ul>
              )}
            </Card>
          </CardGrid>

          <Card title="Task risk" subtitle="All tasks, sorted by risk score" flush>
            {state.data.riskScores.length === 0 ? (
              <EmptyState message="No tasks to score yet." />
            ) : (
              <Table
                columns={riskColumns()}
                rows={riskRows(state.data.riskScores)}
                expandedIds={noExpanded}
                onToggleExpand={noop}
                onRowActivate={noop}
              />
            )}
          </Card>

          {state.data.handoffBreakdowns.length === 0 ? (
            <EmptyPanel message="No completed ownership handoffs detected yet." />
          ) : (
            <Card title="Handoff breakdowns" subtitle="Completed ownership transfers" flush>
              <Table
                columns={handoffColumns()}
                rows={handoffRows(state.data.handoffBreakdowns)}
                expandedIds={noExpanded}
                onToggleExpand={noop}
                onRowActivate={noop}
              />
            </Card>
          )}

          {state.data.contextSwitching.length === 0 ? (
            <EmptyPanel message="No context-switching activity detected yet." />
          ) : (
            <Card title="Context switching" subtitle="By user" flush>
              <Table
                columns={contextSwitchingColumns()}
                rows={contextSwitchingRows(state.data.contextSwitching)}
                expandedIds={noExpanded}
                onToggleExpand={noop}
                onRowActivate={noop}
              />
            </Card>
          )}

          {state.data.hiddenWaiting.length === 0 ? (
            <EmptyPanel message="No tasks with unusual waiting time detected yet." />
          ) : (
            <Card title="Waiting time" subtitle="Tasks that have sat idle" flush>
              <Table
                columns={waitingTimeColumns()}
                rows={waitingTimeRows(state.data.hiddenWaiting)}
                expandedIds={noExpanded}
                onToggleExpand={noop}
                onRowActivate={noop}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
