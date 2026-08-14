import type { DelayCause } from "@/types/ui";

// No delay_causes table exists in database.ts yet — assumed lookup, see
// src/types/ui.ts header comment. The picker consumes this list; nothing
// hardcodes a delay cause name outside of it.
export const DELAY_CAUSES: DelayCause[] = [
  { id: "delay-dependency", name: "Dependency" },
  { id: "delay-review", name: "Review" },
  { id: "delay-approval", name: "Approval" },
  { id: "delay-clarification", name: "Clarification" },
  { id: "delay-external-input", name: "External input" },
];

export const DELAY_CAUSE_BY_ID: Record<string, DelayCause> = Object.fromEntries(
  DELAY_CAUSES.map((cause) => [cause.id, cause]),
);
