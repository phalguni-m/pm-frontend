/**
 * Minimal fetch layer for the Insights page only.
 *
 * Everything else in this app is still 100% fixture-driven — see
 * docs/API_CONTRACT.md, which explicitly scopes Insights "out of
 * fixtures/index.ts's boundary — routed separately." Nothing here touches
 * src/fixtures/, and this module is not a template for the rest of the
 * fixtures→API migration described in that doc.
 *
 * ── Base URL ────────────────────────────────────────────────────────────
 * Reads VITE_API_BASE_URL (Vite env convention — see .env.local), falling
 * back to http://localhost:3001, the backend's own documented dev default
 * (INTEGRATION_AUDIT.md §8: PORT defaults to 3001).
 *
 * ── Auth ────────────────────────────────────────────────────────────────
 * No login/session flow is wired anywhere in this frontend yet — there is
 * no token storage, and CURRENT_USER_ID (src/lib/constants.ts) is fixture
 * data, not a real backend user id, so it must never be sent to a real API.
 *
 * getAuthHeaders() below is the single, isolated place that decides what
 * auth header (if any) a request sends, so wiring real login later is a
 * one-function change here, not a rewrite of every call site. For local
 * development only, it reads an optional VITE_DEV_USER_ID env var and
 * sends it as the backend's legacy `X-User-Id` header — the backend's own
 * middleware/auth.ts explicitly supports this as a fallback to Bearer auth,
 * it is not a workaround unique to this file.
 *
 * No user id, token, password, or secret is hardcoded anywhere in this
 * file. If VITE_DEV_USER_ID isn't set, requests go out unauthenticated and
 * the backend correctly responds 401 — getInsightsDashboard surfaces that
 * as a thrown InsightsApiError rather than silently returning nothing, and
 * InsightsPage renders it as an explicit, readable error state.
 */

import type { InsightsDashboardResult } from "@/types/database";

const DEFAULT_BASE_URL = "http://localhost:3001";

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  return typeof raw === "string" && raw.length > 0 ? raw : DEFAULT_BASE_URL;
}

function getAuthHeaders(): Record<string, string> {
  const devUserId = import.meta.env.VITE_DEV_USER_ID;
  if (typeof devUserId === "string" && devUserId.length > 0) {
    return { "X-User-Id": devUserId };
  }
  return {};
}

export class InsightsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InsightsApiError";
    this.status = status;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${resolveBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { ...getAuthHeaders() } });
  } catch {
    throw new InsightsApiError(`Could not reach the backend at ${url}. Is it running?`, 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as Record<string, unknown> | null;
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // Response wasn't JSON — keep the generic message above.
    }
    throw new InsightsApiError(message, response.status);
  }

  return (await response.json()) as T;
}

/**
 * The one call InsightsPage makes. Returns every AI Workflow Engine
 * detector's results in a single round trip (per API_CONTRACT.md, this
 * endpoint internally re-runs context-switching, handoffs, waiting-time,
 * and risk in parallel) — deliberately used instead of the four individual
 * /api/insights/{context-switching,handoffs,waiting-time,risk}/:projectId
 * endpoints, which also exist on the backend but have no consumer here.
 */
export function getInsightsDashboard(projectId: string): Promise<InsightsDashboardResult> {
  return getJson<InsightsDashboardResult>(`/api/insights/dashboard/${projectId}`);
}
