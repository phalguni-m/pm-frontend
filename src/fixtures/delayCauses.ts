import type { DelayCause } from "@/types/ui";

// Real seeded rows from the backend delay_cause table — exact ids and exact
// (lowercase, as stored) name strings. The picker consumes this list;
// nothing hardcodes a delay cause name outside of it.
export const DELAY_CAUSES: DelayCause[] = [
  { id: "44a6ea27-9abf-4271-a012-003323013524", name: "api delay" },
  { id: "a3a16837-2721-45fa-86ce-7719210b40d1", name: "design not ready" },
  { id: "aa72a61a-a0f8-45a8-8e7f-c7bcd2a14280", name: "dependency blocked" },
  { id: "bad8fdf4-ce6c-453f-aca8-8f56e053ad3c", name: "scope change" },
];

export const DELAY_CAUSE_BY_ID: Record<string, DelayCause> = Object.fromEntries(
  DELAY_CAUSES.map((cause) => [cause.id, cause]),
);
