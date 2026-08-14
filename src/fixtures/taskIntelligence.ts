import type { TaskIntelligence } from "@/types/ui";

// Risk/impact/critical-path scoring is assumed to arrive from a separate
// analysis endpoint — see src/types/ui.ts header comment. Deliberately covers
// only some tasks so the Skeleton path is exercised wherever intelligence is
// rendered; absence must never be papered over with a 0.
export const TASK_INTELLIGENCE_BY_ID: Record<string, TaskIntelligence> = {
  "task-intake-form": { riskScore: 12, impact: 3, waitingHours: 0, onCriticalPath: true },
  "task-triage-rules": { riskScore: 68, impact: 9, waitingHours: 0, onCriticalPath: true },
  "task-offline-sync": { riskScore: 74, impact: 7, waitingHours: 120, onCriticalPath: true },
  "task-triage-offline-conflict": { riskScore: 41, impact: 2, waitingHours: 0, onCriticalPath: false },
  "task-field-report-export": { riskScore: 35, impact: 4, waitingHours: 0, onCriticalPath: true },
  "task-design-tokens": { riskScore: 8, impact: 6, waitingHours: 0, onCriticalPath: false },
  "task-empty-states": { riskScore: 20, impact: 1, waitingHours: 48, onCriticalPath: false },
  "task-dependency-graph": { riskScore: 55, impact: 5, waitingHours: 0, onCriticalPath: false },
  "task-component-primitives": { riskScore: 30, impact: 8, waitingHours: 0, onCriticalPath: false },
  "task-critical-path-service": { riskScore: 62, impact: 9, waitingHours: 72, onCriticalPath: false },
  "task-oauth-provider": { riskScore: 44, impact: 6, waitingHours: 0, onCriticalPath: false },
  "task-session-rotation": { riskScore: 58, impact: 7, waitingHours: 0, onCriticalPath: false },
  "task-rate-limiting": { riskScore: 37, impact: 3, waitingHours: 0, onCriticalPath: false },
};
