import { PageHeader } from "@/components/primitives/PageHeader";

// Stub route — owned by Purva (insights). Backing endpoints: GET
// /api/insights/{dashboard,risk,handoffs,context-switching,waiting-time}/:projectId
// (all require project viewer access — see docs/API_CONTRACT.md). Mounting
// real content here is the only change needed; the route is already wired.
export function InsightsPage() {
  return <PageHeader title="Insights" />;
}
