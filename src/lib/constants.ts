import type { PriorityLevel, RoleType, StatusType } from "@/types/database";

export const STATUS_ORDER: StatusType[] = [
  "to_do",
  "in_progress",
  "waiting",
  "blocked",
  "done",
];

export const STATUS_LABEL: Record<StatusType, string> = {
  to_do: "To do",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

// The DB enum has no "none" and no "urgent" — only these four levels exist.
export const PRIORITY_ORDER: PriorityLevel[] = ["critical", "high", "medium", "low"];

export const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Filled bar counts are treated as data, driving the three-bar priority glyph.
export const PRIORITY_BARS: Record<PriorityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 3,
};

export const DEFAULT_PRIORITY: PriorityLevel = "medium";

// The signed-in user for this build — no auth exists yet, so this is fixed.
// Shared between App.tsx (sidebar footer) and the tasks store (comment
// authorship) so there's one literal, not two that could drift apart.
export const CURRENT_USER_ID = "member-phalguni";

export function statusRank(status: StatusType): number {
  return STATUS_ORDER.indexOf(status);
}

export function priorityRank(priority: PriorityLevel): number {
  return PRIORITY_ORDER.indexOf(priority);
}

export const ROLE_LABEL: Record<RoleType, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function canEdit(role: RoleType): boolean {
  return role === "admin" || role === "editor";
}

export function canManageMembers(role: RoleType): boolean {
  return role === "admin";
}

// Event types confirmed to exist in fixture/history data. TaskHistory.event_type
// is a bare string on the backend (enum unconfirmed) — anything outside this
// set falls through to a generic "did something" renderer rather than being
// dropped or throwing.
export const KNOWN_EVENT_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "assignee_added",
  "assignee_removed",
  "dependency_added",
  "dependency_removed",
  "due_date_changed",
] as const;

export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];

export function isKnownEventType(eventType: string): eventType is KnownEventType {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(eventType);
}
