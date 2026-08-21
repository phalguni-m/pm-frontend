# Integration Audit — pm-frontend × backend-{vismaya,purva,namana}

Read-only audit. No files were modified in this repo or the three sibling backend repos.

**Path note (methodology):** the sibling repos named in the audit request (`../backend-vismaya`, `../backend-purva`, `../backend-namana`) do not exist under that path. What exists is three nested copies of a folder named `pm-app-main`, with no internal name markers (`package.json` name is `"backend"` in all three). The user identified the mapping directly:

| Label used below | Actual source read |
|---|---|
| **Vismaya** | a local clone of Vismaya's backend repo |
| **Purva** | a local clone of Purva's backend repo |
| **Namana** | a local clone of Namana's backend repo |
| **Frontend** | this repo |

None of the three backend folders contain a `.git` directory, so "diff the three trees" below is a plain filesystem/content diff, not a git diff.

---

## 1. Repo lineage

**File-list superset check** (full `find` listing, paths normalized to each repo's own `src/` root):

- Vismaya's file list ⊂ Purva's file list ⊂ Namana's file list, exactly. Every file in Vismaya exists in Purva and Namana at the same relative path; every file in Purva exists in Namana. No file appears in a smaller repo that is missing from a larger one.
- **Vismaya → Purva additions:** `src/routes/insights.ts`, `src/services/contextSwitchingService.ts`, `src/services/handoffService.ts`, `src/services/insightsDashboardService.ts`, `src/utils/anomalyDetection.ts`. (Purva's Phase-2/3 "AI Workflow Engine" additions.)
- **Purva → Namana additions:** `src/routes/auth.ts`, `src/services/authService.ts`, `src/services/cryptoAuditService.ts`, `src/services/riskScoreService.ts`, `src/services/waitingTimeService.ts`, plus `supabase/migrations/20260810190000_cryptographic_audit.sql`, `20260813190000_verify_audit_chain_function.sql`, `20260813190100_fix_handle_new_user.sql`. Namana is also the only one of the three with a `supabase/migrations/` directory at all (Vismaya has 2 migration files under a *different* root layout — see below; Purva has none).
- **Files unique to Vismaya:** none (Vismaya has no file absent from the other two).
- **Files unique to Purva (present in Purva + Namana, absent from Vismaya):** `src/routes/insights.ts`, `src/services/contextSwitchingService.ts`, `src/services/handoffService.ts`, `src/services/insightsDashboardService.ts`, `src/utils/anomalyDetection.ts`, `.gitignore`.
- **Files unique to Namana (present only in Namana):** `src/routes/auth.ts`, `src/services/authService.ts`, `src/services/cryptoAuditService.ts`, `src/services/riskScoreService.ts`, `src/services/waitingTimeService.ts`, and all 3 of its later migrations.

**Structural oddity:** Vismaya's repo root has an extra `backend/` layer (`pm-app-main/backend/src/...`) not present in Purva/Namana (`pm-app-main/src/...` directly), and its `supabase/` folder sits as a *sibling* of `backend/` at the outer root, containing only the first two migrations (`20260625185442_remote_schema.sql` — empty file — and `20260625185918_remote_schema.sql` — the full base schema). This looks like Vismaya predates a repo-layout flattening that happened before Purva was branched.

**Canonical repo: Namana.** It is a strict superset of both Vismaya and Purva at the file level (confirmed above), it is the only repo with the full migration history including the two most recent schema/function fixes (`verify_task_audit_chain`, `fix_handle_new_user`), and it is the only repo with authentication wired up end-to-end (`routes/auth.ts` + `authService.ts` + the Bearer-token branch in `middleware/auth.ts`). Building against Vismaya or Purva means integrating against routes/services that Namana already deleted-by-superseding (nothing was actually deleted — Purva/Vismaya are simply behind).

**Real conflicts (non-whitespace content differences) between shared files:** Diffed every file common to Purva and Namana with `diff -w`. 11 files differ (`app.ts`, `middleware/auth.ts`, `routes/{dependencies,history,insights,projects,workspaces}.ts`, `services/{historyService,insightsDashboardService,membershipService,workspaceService}.ts`, `types/database.ts`). Every single difference is **purely additive** — Namana adds new routes/functions/fields on top of Purva's code with no line in Purva contradicted or rewritten with different behavior. **No genuine merge conflicts exist between Purva and Namana.** The same additive relationship holds between Vismaya and Purva (verified via the same superset file-list check plus spot-reading `middleware/auth.ts`, which is the one file where behavior visibly changes: Vismaya/Purva's `requireUser` only accepts `X-User-Id`; Namana's adds a Bearer-token branch in front of the same `X-User-Id` fallback, so it is backward-compatible, not conflicting). Conclusion: this is a clean linear history (Vismaya → Purva → Namana), not a diverged fork requiring reconciliation.

---

## 2. Schema truth

### `database.ts` agreement across the three repos

All three repos' `src/types/database.ts` are **byte-identical for every interface they share** (`AppUser`, `Workspace`, `WorkspaceMember`, `Project`, `ProjectMember`, `Section`, `Task`, `TaskDep`, `TaskHistory`, `AssigneeEvent`, `TaskAssignee`, `StatusTimeline`, `AssigneeHandoff`, `CriticalPathResult`, `TaskImpact`). Purva adds the "AI Workflow Engine" block (`SeverityLevel`, `ContextSwitchingFeatures/Result`, `HandoffFeatures/Result`, `DashboardSummary`, `InsightsDashboardResult`) with `hiddenWaiting` hardcoded to `unknown[]` / `hiddenWaitingStatus: "not_implemented"`. Namana redefines `DashboardSummary` and `InsightsDashboardResult` (adding `hiddenWaitingAnomalies`, `highRiskTasks`, `riskScores`) and adds `WaitingTimeFeatures/Result` and `RiskFeatures`/`RiskScoreResult`. **No disagreements** — Namana's version is Purva's version plus new interfaces and two additive fields on existing interfaces. Nothing is renamed or retyped between versions.

### `database.ts` vs SQL migrations (SQL wins on conflict)

The SQL migrations (only present in Namana: `20260625185918_remote_schema.sql` is the base schema; the first migration file, `20260625185442_remote_schema.sql`, is **empty**) are authoritative. Comparing every `database.ts` (identical core across all 3 repos) against the SQL:

| # | Discrepancy | SQL says | `database.ts` says | Resolution |
|---|---|---|---|---|
| 1 | `task.risk_score` | Column exists: `"risk_score" integer not null default 0` | **Absent** from the `Task` interface in all three repos | SQL wins — the column exists in Postgres but no TS code (including `riskScoreService.ts`) ever reads or writes it. It is dead/orphaned; the computed `RiskScoreResult.riskScore` is a wholly separate in-memory value, not sourced from this column. |
| 2 | `delay_cause` table | Table exists: `id uuid`, `name text` (unique), RLS + "allow all for demo" policy | **No `DelayCause` interface anywhere** in any `database.ts` | SQL wins — the table is real and is referenced by `task.delay_cause_id` (FK), but no backend TS interface models it and no route/service ever queries the `delay_cause` table. `delay_cause_id` is treated as an opaque `string \| null` FK on `Task` and passed through blind on `PATCH /api/tasks/:taskId`. |
| 3 | `task_comments` table | Table exists: `id, task_id, user_id, comment, created_at, updated_at`, full RLS grants | **No TS interface, no route, no service** references it in any of the 3 repos | SQL wins — table is provisioned but entirely unused by the API layer. Dead table from the frontend's perspective. |
| 4 | `project_insights` table | Table exists: `id, project_id, insight_type, entity_type, entity_id, score, metrics jsonb, narrative, computed_at` | No dedicated TS interface (it's used only as an untyped `.from("project_insights")` write target inside `riskScoreService.ts`, `waitingTimeService.ts`, `handoffService.ts`, `contextSwitchingService.ts`, `insightsDashboardService.ts`) | SQL wins for shape; it is a write-only persistence sink for insight results and is never read back via any route — insights are always recomputed live on each GET. |
| 5 | `workflow_event` vs `assignee_event` | Table is named `workflow_event` in SQL | `database.ts`'s exported interface for this table is named `AssigneeEvent` (a naming choice, not a schema conflict — the interface fields match `workflow_event`'s columns exactly: `task_id, project_id, user_id, event_type, from_value, to_value, created_at`) | Not a real conflict — cosmetic interface-name mismatch. **However**, see Section 8: `historyService.ts`'s `getProjectAssigneeEvents()` queries `.from("assignee_event")` (a table that does not exist in the SQL at all — the real table is `workflow_event`). This is a genuine bug, present in **all three repos**, inherited from Vismaya. `handoffService.ts` and `contextSwitchingService.ts` correctly query `.from("workflow_event")`. |
| 6 | `cryptographic_audit_log` table | Exists (Namana only, via `20260810190000_cryptographic_audit.sql`): `id, task_history_id, prev_hash, curr_hash, created_at` | No TS interface in any `database.ts`; `cryptoAuditService.ts` calls the `verify_task_audit_chain` RPC and types its return shape locally (`AuditVerificationResult`), never touching this table's row shape directly | Not a disagreement — the table is accessed only via an RPC that returns a purpose-built JSON shape, so no interface gap exists in practice. |
| 7 | `state_type` enum | SQL defines `create type "public"."state_type" as enum ('active', 'waiting', 'done')` | **No `database.ts` in any repo references a `state_type`/`StateType` at all** — no table in the schema uses this enum as a column type | SQL wins for existence, but this enum is orphaned: defined, never attached to any column, never modeled in TS. UNKNOWN whether it was meant for a future column — no other file references it. |

### Authoritative table list (from SQL, cross-checked against TS field names)

| Table | Columns (name : type, nullable, default) |
|---|---|
| `app_user` | `id uuid NOT NULL default gen_random_uuid()` · `name text NOT NULL` · `email text NOT NULL` (unique) · `job_role_id text NULL` |
| `workspace` | `id uuid NOT NULL default gen_random_uuid()` · `name text NOT NULL` · `owner_user_id uuid NOT NULL` (unique — one workspace per owner) · `created_at timestamptz NOT NULL default now()` |
| `workspace_members` | `id uuid NOT NULL default gen_random_uuid()` · `workspace_id uuid NULL` · `user_id uuid NULL` · `role role_type NOT NULL default 'viewer'` · `created_at timestamptz NOT NULL default now()` |
| `project` | `id uuid NOT NULL default gen_random_uuid()` · `name text NOT NULL` · `workspace_id uuid NULL` · `created_by uuid NULL` · `created_at timestamptz NOT NULL default now()` · `deleted_at timestamptz NULL` · `description text NULL` · `is_deleted boolean NOT NULL default false` |
| `project_members` | `id uuid NOT NULL default gen_random_uuid()` · `project_id uuid NULL` · `user_id uuid NULL` · `role role_type NOT NULL default 'viewer'` |
| `section` | `id uuid NOT NULL default gen_random_uuid()` · `project_id uuid NULL` · `name text NOT NULL` · `position integer NOT NULL` · `created_at timestamptz NULL default now()` · `description text NULL` · `deleted_at timestamptz NULL` · `is_deleted boolean NOT NULL default false` |
| `task` | `id uuid NOT NULL default gen_random_uuid()` · `title text NOT NULL` · `description text NULL` · `project_id uuid NULL` · `section_id uuid NULL` · `delay_cause_id uuid NULL` · `parent_task_id uuid NULL` · `priority priority_level NOT NULL` (no default) · **`risk_score integer NOT NULL default 0`** (not in any `database.ts`) · `start_date timestamptz NULL` · `due_date timestamptz NULL` · `position integer NULL` · `created_by uuid NULL` · `created_at timestamptz NOT NULL default now()` · `updated_at timestamptz NULL` · `deleted_at timestamptz NULL` · `is_deleted boolean NULL default false` · `status status_type NOT NULL default 'to_do'` |
| `task_assignees` | `id uuid NOT NULL default gen_random_uuid()` · `task_id uuid NULL` · `user_id uuid NULL` |
| `task_comments` | `id uuid NOT NULL default gen_random_uuid()` · `task_id uuid NULL` · `user_id uuid NULL` · `comment text NOT NULL` · `created_at timestamptz NULL default now()` · `updated_at timestamptz NULL` — **no TS interface anywhere** |
| `task_dependencies` | `id uuid NOT NULL default gen_random_uuid()` · `blocking_task_id uuid NULL` · `blocked_task_id uuid NULL` · `created_at timestamptz NULL default now()` · CHECK: `blocking_task_id <> blocked_task_id`, both NOT NULL (enforced at row level even though columns are nullable) |
| `task_history` | `id uuid NOT NULL default gen_random_uuid()` · `task_id uuid NULL` · `task_snapshot jsonb NULL` · `user_id uuid NULL` · `event_type text NOT NULL` · `created_at timestamptz NOT NULL default now()` |
| `workflow_event` | `id uuid NOT NULL default gen_random_uuid()` · `task_id uuid NULL` · `project_id uuid NULL` · `user_id uuid NULL` · `event_type text NOT NULL` · `from_value text NULL` · `to_value text NULL` · `created_at timestamptz NULL default now()` — modeled in TS as `AssigneeEvent` |
| `delay_cause` | `id uuid NOT NULL default gen_random_uuid()` · `name text NULL` (unique) — **no TS interface anywhere** |
| `project_insights` | `id uuid NOT NULL default gen_random_uuid()` · `project_id uuid NULL` · `insight_type text NOT NULL` · `entity_type text NULL` · `entity_id uuid NULL` · `score numeric NULL` · `metrics jsonb NULL` · `narrative text NULL` · `computed_at timestamptz NULL default now()` — write-only sink, no TS interface, never read back via API |
| `cryptographic_audit_log` (Namana only) | `id uuid NOT NULL default gen_random_uuid()` · `task_history_id uuid NULL` · `prev_hash text NOT NULL` · `curr_hash text NOT NULL` · `created_at timestamptz NOT NULL default now()` |

### Enums — exact string values

| Enum | SQL definition | `database.ts` TS type | Agreement |
|---|---|---|---|
| **Task status** | `status_type`: `'to_do', 'in_progress', 'waiting', 'blocked', 'done'` | `StatusType = "to_do" \| "in_progress" \| "waiting" \| "blocked" \| "done"` | Exact match, all 3 repos |
| **Priority** | `priority_level`: `'low', 'medium', 'high', 'critical'` | `PriorityLevel = "low" \| "medium" \| "high" \| "critical"` | Exact match, all 3 repos |
| **Member role** | `role_type`: `'admin', 'editor', 'viewer'` | `RoleType = "admin" \| "editor" \| "viewer"` | Exact match, all 3 repos |
| **Waiting/delay cause** | **Not an enum.** `delay_cause` is a lookup *table* (`id`, freetext `name`, unique constraint on `name`) with no seed data in any migration | No `DelayCause` type in `database.ts` at all | UNKNOWN what specific cause values (if any) are seeded — no seed/data migration exists in any of the 3 repos. The set of causes is whatever rows happen to exist in the `delay_cause` table at runtime; there is no fixed string union anywhere server-side. |
| **`state_type`** (orphaned) | `'active', 'waiting', 'done'` | Not referenced by any interface | Defined in SQL, unused everywhere — likely dead/leftover from an earlier design. |
| **`SeverityLevel`** (Purva+) | Not a DB enum — purely a Node-side computed type | `SeverityLevel = "low" \| "medium" \| "high" \| "critical"` | Backend-only insight-scoring severity, not persisted as a DB enum (stored as free `numeric`/`jsonb` in `project_insights.score`/`metrics`). |

---

## 3. Diff against pm-frontend's types

`src/types/database.ts` in this repo is **byte-identical** to the shared core of all three backend `database.ts` files (confirmed by diff — 0 differences on every interface that exists on both sides). So the "my field name | their field name" comparison is really between `src/types/ui.ts` + `src/fixtures/` (the UI-shaped, denormalized view this repo has built) and what the canonical (Namana) backend actually returns.

### (a) Fields I have that don't exist server-side at all

| My field/type | Where | Server-side source |
|---|---|---|
| `DelayCause.id` / `.name` | `types/ui.ts` | Table exists (`delay_cause`) but **no route or service exposes it** — no `GET /api/delay-causes` or equivalent anywhere in Namana's `routes/`. UI's own header comment already flags this as "Assumption 1." |
| `TaskIntelligence.riskScore` | `types/ui.ts` | Partially exists — `riskScoreService.ts` computes an equivalent `RiskScoreResult.riskScore`, but via `GET /api/dependencies/task/:taskId/risk`, a separate endpoint, not bundled with the task object. |
| `TaskIntelligence.impact` | `types/ui.ts` | Exists as `TaskImpact.totalDependents`/`.directDependents`/`.blockedDependents` (three separate numbers, not one `impact` scalar) via `GET /api/tasks/:taskId/impact`. |
| `TaskIntelligence.waitingHours` | `types/ui.ts` | Exists as `WaitingTimeResult.features.idleHours` via `GET /api/history/tasks/:taskId/waiting-time` — different field name, different endpoint. |
| `TaskIntelligence.onCriticalPath` | `types/ui.ts` | Not directly returned as a boolean anywhere. `GET /api/tasks/:taskId/critical-path` returns a `CriticalPathResult` with a `chain: Task[]` — the frontend would have to check `chain.some(t => t.id === taskId)` itself. |
| `Comment.id/taskId/author/body/createdAt` | `types/ui.ts`, `fixtures/comments.ts` | Table (`task_comments`) exists in SQL but **zero routes/services touch it** in any of the 3 repos. Fully absent from the API surface. UI's own comment already flags this as "Assumption 3." |
| `TaskRef.identifier` | `types/ui.ts` | Explicitly commented as absent in the schema ("No short identifier exists"); correctly modeled as optional and never fabricated. |
| `HistoryEntry.eventType` values `priority_changed`, `dependency_added`, `dependency_removed`, `due_date_changed` | `lib/constants.ts` `KNOWN_EVENT_TYPES` | The DB trigger `log_task_history()` only ever writes `event_type` as `'created'`, `'updated'`, or `'deleted'` (see the trigger body in the base migration). `workflow_event`/`AssigneeEvent`'s `event_type` is separately only ever `'assignee_added'`/`'assignee_removed'` (from `log_task_assignee_change()`). **None of the 4 listed values are ever produced by the backend.** If the frontend wants field-level diffs (priority changed, due date changed, etc.), it must derive them client-side by diffing consecutive `task_snapshot` JSONB blobs in `task_history` rows — the backend does not compute or label field-level changes. |
| `Member.initials` | `types/ui.ts` | Purely a client-side derived/display value (`initialsOf(name)`); no server field, and shouldn't be one. |
| `ProjectSummary.overdueCount`, `.statusCounts`, `.memberCount` | `types/ui.ts` | Not returned by any endpoint as aggregates — `GET /api/projects/workspace/:workspaceId` returns bare `Project[]` rows; these are counts the frontend currently computes itself from the flat `TASKS`/`members` fixture arrays and will have to keep computing client-side after multiple round trips (tasks list + members list per project), since no summary/rollup endpoint exists. |

### (b) Fields the server has that I don't currently consume

| Server field | Source | Notes |
|---|---|---|
| `task.risk_score` (DB column) | SQL `task` table | Unused even server-side (see §2); not worth consuming since the Node code never populates it — `riskScoreService.ts`'s computed score is the real signal. |
| `Project.created_by`, `.deleted_at`, `.is_deleted` | `Project` interface | Present in `src/types/database.ts` here too (byte-identical), but `ProjectView`/`ProjectSummary` in `ui.ts` drop `created_by` and `deleted_at` entirely (only `isDeleted` survives, on `ProjectView` not `ProjectSummary`). |
| `Section.created_at`, `.deleted_at`, `.is_deleted` | `Section` interface | `SectionView` in `ui.ts` drops all three — soft-delete state and timestamps aren't modeled in the UI-facing section shape at all. |
| `AssigneeHandoff` (whole interface) | `database.ts` (all 3 repos) | This exact interface is never constructed or returned by any route in Namana — it appears to be superseded by `HandoffResult` (Purva+) which is richer. Not consumed by the frontend, and arguably dead on the backend too. |
| `job_role_id` on `AppUser` | `AppUser` interface | Present in the type, never surfaced in `Member` (`ui.ts`) and no route resolves it to a human-readable job role (no `job_role` table exists in the SQL at all — `job_role_id` is a bare `text` column with no FK, no lookup table). |
| Full `RiskScoreResult`/`WaitingTimeResult`/`ContextSwitchingResult`/`HandoffResult` payloads (explanations, recommendations, reasons, feature breakdowns) | Insight services | Frontend's `TaskIntelligence` shape collapses all of this AI-explainability data (the `explanation`/`recommendation`/`reasons` strings, `method: "iqr"\|"isolation_forest"`, per-feature breakdowns) down to 4 bare numbers. If the product wants to show *why* a task is risky, all of that text is available server-side and currently unused/unmodeled. |
| `InsightsDashboardResult.summary` (`overallRisk`, `healthScore`, `totalAnomalies`, etc.) | `insightsDashboardService.ts` | No frontend type or fixture models a project-level health/risk dashboard at all today. |
| `TaskHistory.task_snapshot` (full JSONB snapshot) | `TaskHistory` interface | `HistoryEntry.changes: FieldChange[]` in `ui.ts` implies the frontend wants pre-computed field diffs; the backend gives raw full-object snapshots per event instead (see (a) above — this is really one mismatch, listed from both directions). |

### (c) Same concept, different name or type

| My name (ui.ts) | My type | Their name (server) | Their type | Breaking? |
|---|---|---|---|---|
| `TaskView.projectId` | `string` | `task.project_id` | `string \| null` | **Yes** — server allows a task with no project (nullable FK); UI type asserts non-null. In practice every task is created via `POST /api/tasks/project/:projectId` so `project_id` is always set by the API, but the type is stricter than the schema guarantees. |
| `TaskView.sectionId` | `string \| null` | `task.section_id` | `string \| null` | No — matches. |
| `SectionView.projectId` | `string` | `section.project_id` | `string \| null` | Same non-null tightening as above; low risk since sections are always created scoped to a project. |
| `TaskDraft`/`TaskPatch.sectionId` | `string \| null` | Server `createTask` requires `sectionId: string` (not optional, not nullable) in `CreateTaskInput`; `updateTask`'s `UpdateTaskInput.sectionId` is `string` (optional but not nullable) | Mismatch: `TaskDraft.sectionId: string \| null` — the create endpoint has **no way to create a task with no section** (`sectionId` is required in the route body destructure, though not runtime-validated as present). Passing `null` would likely fail Postgres insert or produce an unintended `section_id: null` depending on whether the service coerces it. |
| `StatusChange.delayCauseId` | `string` (optional) | `task.delayCauseId` on `PATCH /api/tasks/:taskId` | `string \| null` (optional) | No real break — server accepts `null` to clear, frontend's optional-string-only shape just can't currently express "clear the delay cause," only "set/omit." |
| `DependencyGraph.cycles: string[][]` | client type | Server never returns detected cycles — `possibleCycle()` in `utils/graph.ts` only runs synchronously inside `createDep()` to **reject** a dependency that would form a cycle; there is no endpoint that returns existing cycles for a project. | — | **Yes, if consumed as-is** — this field has no server source at all today (see §7). |
| `Task.priority` default | Client `DEFAULT_PRIORITY = "medium"` | Server `createTask` defaults `priority = "medium"` when omitted | — | No — matches. |

### (d) Enum value mismatches

**None.** `PriorityLevel`, `StatusType`, and `RoleType` string unions are byte-identical between `src/types/database.ts` (this repo) and all three backend repos.

### `TaskState` discriminated union vs. server `status`/`delay_cause_id`/waiting mechanic

This repo's `TaskState` (`types/ui.ts:52-54`) enforces: only `status: "waiting"` may carry a non-null `delayCause` and `waitingSince`; every other status is forced to `{ delayCause: null, waitingSince: null }`.

- **Status mapping is lossless.** The server's 5-value `status_type` enum maps 1:1 onto `TaskState["status"]` with no gaps or extras — every server status has a UI representation and vice versa.
- **The waiting-cause invariant is *not* enforced server-side.** The `task` table's `delay_cause_id` column is a plain nullable FK with no CHECK constraint tying it to `status = 'waiting'`. Nothing in `taskService.ts`'s `updateTask`/`updateTaskStatus` prevents setting `delay_cause_id` on a task whose status is `'blocked'`, `'to_do'`, etc., or clearing it back to `null` while status remains `'waiting'`. **The frontend's `TaskState` type is stricter than the backend actually guarantees** — mapping an arbitrary server `Task` row onto `TaskState` will require the frontend to defensively decide what to do if it receives `status: "waiting", delay_cause_id: null` (currently impossible to construct in `TaskState`) or `status: "blocked", delay_cause_id: <uuid>` (would have to be silently dropped to satisfy the type).
- **`waitingSince` has no server source.** There is no `waiting_since` timestamp column anywhere in the schema. The closest server equivalent is `StatusTimeline.enteredAt` for the timeline segment where `status === "waiting"` — but that comes from a derived computation (`historyService.buildStatusTimeline()`) over `task_history` snapshots, not a stored field, and is fetched via a wholly separate endpoint (`GET /api/history/tasks/:taskId/segments`) from the task object itself. Constructing `TaskState.waitingSince` therefore requires a second round trip per task, not a field available on the `Task` payload.
- **`DelayCause` resolution requires a join the API doesn't do.** `task.delay_cause_id` is a bare UUID; no endpoint returns the joined `delay_cause.name`. The frontend would need to fetch all `delay_cause` rows itself — except no endpoint exposes that table either (see (a)). This is currently a dead end: **there is no way to populate a real `DelayCause` for a waiting task via the current API surface**, confirming the frontend's own "Assumption 1" flag.

---

## 4. API surface (canonical repo: Namana)

Base: `app.ts` mounts `cors()` (no origin restriction — reflects/allows any origin) and `express.json()` globally. `/api/auth/*` is mounted **before** `requireUser` (public); everything else is mounted **after** (`requireUser` applies to all of `/api/workspaces`, `/api/projects`, `/api/tasks`, `/api/dependencies`, `/api/history`, `/api/insights`).

**Envelope:** Every success response is the **bare** JSON value returned by the service function — no `{data: ...}` or `{success, data}` wrapper anywhere in any route file. `POST` returns `201` with the created row; `DELETE` returns `204` with an empty body; everything else returns `200` with the bare payload. **Error envelope** (from `middleware/errorHandler.ts`): known errors (`AppError` instances, thrown with an explicit `statusCode`) → `res.status(err.statusCode).json({ error: err.message })`; any other thrown value → `500` with `{ error: "Internal server error" }` (logged server-side via `console.error`, message not leaked to client). There is exactly one error shape: `{ error: string }`. No error codes, no field-level validation detail, no request-id.

| Method | Full path | Auth? | Path/query params | Request body | Response body |
|---|---|---|---|---|---|
| GET | `/health` | No | — | — | `{ ok: true }` |
| POST | `/api/auth/signup` | No | — | `{ name, email, password }` | `201` `AuthSession` = `{ userId, accessToken, refreshToken, expiresAt }` |
| POST | `/api/auth/login` | No | — | `{ email, password }` | `200` `AuthSession` (same shape) |
| POST | `/api/auth/logout` | No (reads `Authorization` header if present) | — | — | `204` empty |
| GET | `/api/workspaces` | Yes | — | — | `Workspace[]` (owned ∪ member-of, sorted by `created_at`) |
| POST | `/api/workspaces` | Yes | — | `{ name }` | `201` `Workspace` |
| GET | `/api/workspaces/:workspaceId` | Yes | `workspaceId` | — | `Workspace` |
| PATCH | `/api/workspaces/:workspaceId` | Yes (owner only) | `workspaceId` | `{ name }` | `Workspace` |
| DELETE | `/api/workspaces/:workspaceId` | Yes (owner only; blocked if active projects exist) | `workspaceId` | — | `204` empty |
| GET | `/api/workspaces/:workspaceId/members` | Yes | `workspaceId` | — | `{ id, user_id, role, created_at, app_user: {id,name,email} }[]` (embedded join) |
| POST | `/api/workspaces/:workspaceId/members` | Yes (owner only) | `workspaceId` | `{ memberUserId, role? }` (role defaults `"viewer"`) | `201` `WorkspaceMember` row |
| DELETE | `/api/workspaces/:workspaceId/members/:memberUserId` | Yes (owner only; cannot remove owner) | `workspaceId, memberUserId` | — | `204` empty |
| POST | `/api/projects` | Yes (workspace access) | — | `{ name, workspaceId, description? }` | `201` `Project`; also inserts creator as `project_members` `"editor"` as a side effect |
| GET | `/api/projects/:projectId/members` | Yes (viewer) | `projectId` | — | `{ id, user_id, role, app_user: {id,name,email} }[]` |
| GET | `/api/projects/workspace/:workspaceId` | Yes (workspace access) | `workspaceId` | — | `Project[]` (non-deleted, newest first) |
| GET | `/api/projects/:projectId` | Yes (viewer) | `projectId` | — | `Project` |
| PATCH | `/api/projects/:projectId` | Yes (editor) | `projectId` | `{ name?, description? }` | `Project` |
| DELETE | `/api/projects/:projectId` | Yes (admin) | `projectId` | — | `204` empty (soft delete; DB trigger cascades soft-delete to sections + tasks) |
| POST | `/api/projects/:projectId/members` | Yes (admin) | `projectId` | `{ memberUserId, role? }` | `201` `ProjectMember` row |
| DELETE | `/api/projects/:projectId/members/:memberUserId` | Yes (admin) | `projectId, memberUserId` | — | `204` empty |
| GET | `/api/projects/:projectId/sections` | Yes (viewer) | `projectId` | — | `Section[]` (non-deleted, ordered by `position`) |
| POST | `/api/projects/:projectId/sections` | Yes (editor) | `projectId` | `{ name }` | `201` `Section` |
| PATCH | `/api/projects/:projectId/sections/:sectionId` | Yes (editor) | `projectId, sectionId` | `{ name?, description?, position? }` | `Section` |
| DELETE | `/api/projects/:projectId/sections/:sectionId` | Yes (editor) | `projectId, sectionId` | — | `204` empty (soft delete; DB trigger detaches tasks' `section_id` and compacts sibling positions) |
| GET | `/api/tasks/project/:projectId` | Yes (viewer) | `projectId` | — | `Task[]` (flat, non-deleted, ordered by `position`) |
| POST | `/api/tasks/project/:projectId` | Yes (editor) | `projectId` | `{ title, sectionId, description?, priority?, startDate?, dueDate? }` | `201` `Task` |
| GET | `/api/tasks/:taskId` | Yes (viewer) | `taskId` | — | `Task` |
| PATCH | `/api/tasks/:taskId` | Yes (editor) | `taskId` | `{ title?, description?, priority?, startDate?, dueDate?, sectionId?, delayCauseId? }` | `Task` |
| DELETE | `/api/tasks/:taskId` | Yes (editor) | `taskId` | — | `204` empty (soft delete) |
| PATCH | `/api/tasks/:taskId/status` | Yes (editor) | `taskId` | `{ status }` | `Task` |
| GET | `/api/tasks/:taskId/delay-days` | Yes (viewer) | `taskId` | — | `{ taskId, delayDays: number, status }` |
| GET | `/api/tasks/:taskId/impact` | Yes (viewer) | `taskId` | — | `TaskImpact` = `{ taskId, directDependents, totalDependents, blockedDependents }` |
| GET | `/api/tasks/:taskId/critical-path` | Yes (viewer) | `taskId` | — | `CriticalPathResult` = `{ targetTaskId, chain: Task[], totalDurationDays, estimatedCompletionDate }` |
| GET | `/api/tasks/:taskId/assignees` | Yes (viewer) | `taskId` | — | `{ id, user_id, app_user: {id,name,email,job_role_id} }[]` |
| POST | `/api/tasks/:taskId/assignees` | Yes (editor) | `taskId` | `{ assigneeId }` | `201` `TaskAssignee` row |
| DELETE | `/api/tasks/:taskId/assignees/:assigneeId` | Yes (editor) | `taskId, assigneeId` | — | `204` empty |
| GET | `/api/dependencies/task/:taskId` | Yes (viewer) | `taskId` | — | `TaskDep[]` (both directions — blocking OR blocked) |
| POST | `/api/dependencies` | Yes (editor on blocked task's project) | — | `{ blockingTaskId, blockedTaskId }` | `201` `TaskDep` (rejects self-dep and cycles) |
| DELETE | `/api/dependencies/:depId` | Yes (editor) | `depId` | — | `204` empty |
| GET | `/api/dependencies/task/:taskId/impact` | Yes (viewer, via `validateTaskAccess`) | `taskId` | — | `TaskImpact` (duplicate of `/api/tasks/:taskId/impact`) |
| GET | `/api/dependencies/task/:taskId/risk` | Yes (viewer) | `taskId` | — | `RiskScoreResult` (single task) |
| GET | `/api/history/tasks/:taskId` | Yes (viewer) | `taskId` | — | `TaskHistory[]` (raw rows, oldest first) |
| GET | `/api/history/tasks/:taskId/segments` | Yes (viewer) | `taskId` | — | `StatusTimeline[]` |
| GET | `/api/history/projects/:projectId` | Yes (viewer) | `projectId` | — | `TaskHistory[]` (all tasks in project) |
| GET | `/api/history/projects/:projectId/feed` | Yes (viewer) | `projectId` | — | `HistoryFeedEntry[]` = `{ id, taskId, taskTitle, userId, userName, eventType, status, createdAt }`, newest first |
| GET | `/api/history/tasks/:taskId/crypto/verify` | Yes (viewer) | `taskId` | — | `AuditVerificationResult` = `{ valid, checkedRecords, brokenAt, reason? }` |
| GET | `/api/history/tasks/:taskId/waiting-time` | Yes (viewer) | `taskId` | — | `WaitingTimeResult` (single task) |
| GET | `/api/insights/context-switching/:projectId` | Yes (viewer) | `projectId` | — | `ContextSwitchingResult[]` |
| GET | `/api/insights/handoffs/:projectId` | Yes (viewer) | `projectId` | — | `HandoffResult[]` |
| GET | `/api/insights/waiting-time/:projectId` | Yes (viewer) | `projectId` | — | `WaitingTimeResult[]` |
| GET | `/api/insights/risk/:projectId` | Yes (viewer) | `projectId` | — | `RiskScoreResult[]` |
| GET | `/api/insights/dashboard/:projectId` | Yes (viewer) | `projectId` | — | `InsightsDashboardResult` |

Total: 39 routes (3 public auth + 1 health + 35 authenticated).

---

## 5. Nesting and round trips

**Everything is flat. No endpoint returns nested children.** To render Workspace → Projects → Sections → Tasks → Subtasks, the required call sequence is:

1. `GET /api/workspaces` — pick/identify the target workspace (or `GET /api/workspaces/:workspaceId` if the id is already known).
2. `GET /api/projects/workspace/:workspaceId` — flat `Project[]` for that workspace.
3. For **each** project you want to render: `GET /api/projects/:projectId/sections` — flat `Section[]`.
4. For **each** project: `GET /api/tasks/project/:projectId` — flat `Task[]` for the *whole project* (not per-section; the frontend groups by `task.section_id` client-side after the fact — same pattern this repo's own `fixtures/index.ts` already uses for `TASKS.filter(t => t.sectionId === section.id)`).
5. Subtasks are **not** a separate table or endpoint. They are ordinary rows in the same `task` table, self-referencing via `parent_task_id`. Step 4's single `GET /api/tasks/project/:projectId` call already returns subtasks intermixed with top-level tasks — the frontend must filter/group by `parent_task_id` client-side (exactly as `tasksReducer.ts`'s `descendantIdsOf()` already does against the fixture data). There is no `GET /api/tasks/:taskId/subtasks` endpoint and no depth limit enforced server-side (a task could in principle be its own ancestor several levels removed — nothing prevents deep or even cyclic `parent_task_id` chains beyond the single FK `ON DELETE SET NULL`).
6. Per-task extras (assignees, history, intelligence) are additional round trips **per task**, not bulk-fetchable: `GET /api/tasks/:taskId/assignees`, `GET /api/history/tasks/:taskId`, `GET /api/tasks/:taskId/impact`, `GET /api/tasks/:taskId/critical-path`, `GET /api/dependencies/task/:taskId/risk`, `GET /api/history/tasks/:taskId/waiting-time` — none of these accept a batch of task IDs; each is single-task only. Rendering a section with N tasks and wanting full intelligence for all of them is N× (or more) separate requests; there is no bulk/`?ids=` variant anywhere in the API.

**Dependencies**: also a flat, separate table (`task_dependencies` / `TaskDep`), fetched via `GET /api/dependencies/task/:taskId` per task (returns both directions — where the task is blocking, and where it's blocked). There is no project-wide "give me all dependency edges" endpoint exposed over HTTP — `dependencyService.getProjectDeps()` exists server-side and is used internally by `riskScoreService`/`dependencyAnalysisService`, but it is never wired to a route. To build a full project dependency graph client-side today, the frontend would have to call `GET /api/dependencies/task/:taskId` once per task and de-duplicate edges — there is no single-call way to get the whole graph.

---

## 6. Auth contract

**The browser is meant to talk to this backend, not Supabase directly**, for login/signup — `POST /api/auth/signup` and `POST /api/auth/login` proxy to Supabase Admin/Auth server-side (`authService.ts` calls `supabase.auth.admin.createUser` and `supabase.auth.signInWithPassword` using the **service-role key**, which must never be exposed to a browser). The frontend should never hold or use a Supabase key directly.

**What the client must send on each authenticated request:**
- Header: `Authorization: Bearer <accessToken>`, where `<accessToken>` is the `accessToken` field returned by `POST /api/auth/login` or `/signup` (this is a real Supabase session JWT — `middleware/auth.ts` validates it via `supabase.auth.getUser(token)`).
- **Legacy fallback still live:** if no `Authorization` header is present, the server accepts `X-User-Id: <uuid>` instead, trusting it after only checking the id exists in `app_user` — **no password/session check at all** on this path. This is explicitly commented `"legacy path, still works exactly as before"` in `middleware/auth.ts`. For a real integration, the frontend should use the Bearer flow only; the `X-User-Id` path is a trust-the-client backdoor that happens to still be wired in Namana (present in Vismaya/Purva too, as the *only* mechanism there — they predate the Bearer branch entirely).
- Login/signup responses also return `refreshToken` and `expiresAt` (Unix seconds) — there is no `/api/auth/refresh` route in any of the three repos, so the frontend has no server-provided way to exchange a refresh token for a new access token; token refresh, if needed, would have to go directly to Supabase's own auth endpoints (outside this backend), or the user simply re-logs-in.

**How the server identifies the current user:** `requireUser` middleware sets `req.userId` (via `AuthRequest`) from either the validated Supabase JWT's `user.id` or the trusted `X-User-Id` header; every route handler calls `getUserId(req)` to read it. Workspace/project membership is then resolved per-request by `accessService.ts` (`requireWorkspaceAccess`, `requireProjectAccess`, `getProjectRole`) — there is no session-level cached membership list; every protected route re-derives access from `workspace_members`/`project_members`/ownership on each call.

**No "get current user + memberships" boot endpoint exists.** There is no `GET /api/auth/me`, no `GET /api/users/me`, nothing that returns `{ user, workspaces, memberships }` in one call. The closest available primitive is `GET /api/workspaces` (returns the current user's owned + member-of workspaces, but not the `AppUser` profile row itself — no name/email for "me"). To bootstrap the app on load, the frontend would need: (1) decode/hold the `userId` returned at login (or from the Supabase JWT `sub` claim) since there's no endpoint that echoes back the caller's own `app_user` row, and (2) call `GET /api/workspaces` separately to get workspace memberships. **Gap:** there is no direct way to fetch the current user's own `name`/`email`/`job_role_id` from `app_user` — no route ever does `SELECT ... WHERE id = :currentUserId` for the caller's own profile (only for *other* users, embedded via joins in members/assignees endpoints).

---

## 7. Insights and graph

All insight endpoints require project `viewer` access and recompute live on every GET (each also does a side-effect delete+insert into `project_insights`, so repeated calls are not idempotent-free of DB writes, but idempotent in *returned* result given unchanged input data).

- **`getContextSwitchingInsights` → `ContextSwitchingResult[]`**: one entry per user with `in_progress` history in the project. Full shape: `{ userId, userName, userEmail, contextSwitchingScore (0-100), anomalyScore (0-100), isAnomaly, severity: SeverityLevel, method: "iqr"|"isolation_forest", features: { activeTaskCount, peakConcurrentActiveTasks, avgConcurrentActiveTasks, contextSwitchCount, contextSwitchesPerDay, avgTaskActiveDurationHours, windowDays }, explanation, recommendation }`. Sorted by `anomalyScore` desc.
- **`getHandoffBreakdownInsights` → `HandoffResult[]`**: one entry per completed (paired removed→added) assignee handoff. `{ taskId, taskTitle, previousOwnerId, previousOwnerName, nextOwnerId, nextOwnerName, removedAt, addedAt, handoffBreakdownScore (0-100), anomalyScore, isAnomaly, severity, method, features: { handoffDelayHours, postHandoffIdleHours }, explanation, recommendation }`. Sorted by `anomalyScore` desc.
- **`getWaitingTimeInsights` → `WaitingTimeResult[]`**: one entry per task that has ever entered `waiting`/`blocked`. `{ taskId, taskTitle, waitingTimeScore (0-100), anomalyScore, isAnomaly, isHighWaitingTime, severity, method, features: { idleHours, waitingFrequency, currentIdleHours }, explanation, recommendation }`. Sorted by `anomalyScore` desc.
- **`getProjectRiskInsights` → `RiskScoreResult[]`**: one entry per task in the project (all tasks, not just idle ones). `{ taskId, taskTitle, riskScore (0-100, rule score blended 75/25 with waiting-time anomaly signal), riskLevel: SeverityLevel, ruleScore, waitingTimeAnomalyScore, isWaitingTimeAnomaly, features: { priority, totalDependents, blockedDependents, daysUntilDue }, reasons: string[], explanation }`. Sorted by `riskScore` desc.
- **`getInsightsDashboard` → `InsightsDashboardResult`**: `{ summary: { overallRisk: SeverityLevel, healthScore (0-100), totalAnomalies, contextSwitchingAnomalies, handoffBreakdownAnomalies, hiddenWaitingAnomalies, highRiskTasks }, contextSwitching: ContextSwitchingResult[], handoffBreakdowns: HandoffResult[], hiddenWaiting: WaitingTimeResult[], riskScores: RiskScoreResult[], recommendations: string[] (top 5, deduped, high/critical severity only), computedAt }`. This is a single call that internally re-runs all four detectors above in parallel — useful as the one bulk fetch that avoids 4 separate requests, at the cost of getting everything even if you only need one panel.
- **`utils/anomalyDetection.ts` (`detectAnomalies`)**: hybrid IQR (< 30 samples) / Isolation Forest (≥ 30 samples) scorer, pure TS, no ML library dependency. Returns `{ index, anomalyScore (0-100), isAnomaly, method }[]` for an arbitrary `number[][]` feature matrix. This is shared plumbing, not itself exposed via any route.

### Graph / DAG — server-side computation

`utils/graph.ts` provides exactly three primitives, all operating on the flat `TaskDep[]` list already in memory (no formal graph library, no adjacency-list class):
- `getBlockingTasks(taskId, deps)` — direct prerequisites.
- `getBlockedTasks(taskId, deps)` — direct dependents.
- `possibleCycle(blockingId, blockedId, deps)` — DFS/stack-based check used **only** at dependency-creation time (`dependencyService.validateDep`) to reject a would-be cycle before insert. **It is never exposed via any endpoint** — there is no way to ask the API "does this project currently have a cycle?" after the fact; cycle prevention is write-time only, not a queryable graph property.
- `getTransitiveDependents(taskId, deps)` — BFS over `getBlockedTasks`, returns a `Set<string>` of all downstream task ids.

**No topological layering, no formal DAG-level/rank computation, no critical-path algorithm beyond a simplified longest-chain DFS.** `dependencyAnalysisService.getCriticalPathToTask(targetTaskId)` computes `CriticalPathResult` via `buildLongestChain()`: a memoized DFS that, for the *single target task requested*, walks backward through `getBlockingTasks` recursively and keeps the longest chain by task-count (with per-task duration approximated as `ceil((due_date - start_date) / 1 day)`, defaulting to `1` day if either date is missing). This is target-task-specific, not a whole-project critical path — there is no endpoint that returns "the critical path of this project" as a single answer; you get a chain ending at whichever task you ask about. `getTaskImpact(taskId)` returns `TaskImpact = { taskId, directDependents, totalDependents, blockedDependents }` using `getBlockedTasks` + `getTransitiveDependents` + a live status check (`status === "blocked" || "waiting"`) — a per-task fan-out summary, not a graph object.

**Ownership recommendation, since the audit asks:** the server does *not* compute cycle detection as a queryable fact, does not do topological/DAG layering for visual layout, and its "critical path" is a single-target longest-chain, not the graph-theoretic critical path over the whole project (no early-start/late-start/slack computation at all). If this repo's own `lib/graph.ts`/`lib/criticalPath.ts` are meant to do full-project layout, cycle surfacing across the whole dependency set, or proper CPM slack — **those responsibilities are not duplicated server-side and would need to stay client-side**, fed by the flat `TaskDep[]` from `GET /api/dependencies/task/:taskId` (called per task, see §5) since there's no bulk edge-list endpoint. The one thing worth *not* re-doing client-side is `possibleCycle`'s write-time rejection (§7 above) — that must stay server-authoritative since it gates `POST /api/dependencies`, but nothing stops the frontend from also running its own cycle check for immediate UI feedback before the request round-trips.

**Correction to the audit's premise:** this repo currently has **no `src/lib/graph.ts` and no `src/lib/criticalPath.ts`** — verified by directory listing (`src/lib/` contains only `constants.ts`, `format.ts`, `layout.ts`) and by `src/components/graph/` being an empty directory with `GraphPage.tsx` currently a bare stub (renders only a page header, no graph library, no data fetching). If graph/critical-path logic exists elsewhere (not yet committed, or in a different location), it wasn't found under `src/`.

---

## 8. Does it run

**`tsc --noEmit` was actually run** (not inferred) against all three repos after `npm install`, using each repo's own `tsconfig.json`:

| Repo | `npm install` | `tsc --noEmit` |
|---|---|---|
| Vismaya | ✅ 98 packages, clean | ✅ **passes, zero errors** |
| Purva | ✅ 98 packages, clean | ✅ **passes, zero errors** |
| Namana | ✅ 98 packages, clean | ✅ **passes, zero errors** |

**The "Purva's services predate Namana's schema change" premise does not produce a compile break.** Specifically checked: no service anywhere references `task.risk_score` by name (`grep -rn "risk_score"` across all three `src/` trees only matches the string literal `"risk_score"` used as an `insight_type` tag in Namana's `riskScoreService.ts` — never a `.risk_score` property access), so the orphaned DB column from §2 causes no type errors. All three repos also compile despite the `assignee_event` vs `workflow_event` table-name bug from §2/§8, because Supabase's `.from(string)` call is not statically typed against the schema in this codebase (no generated `Database` type is passed to `createClient<Database>()` — `supabaseClient.ts` uses the untyped `createClient()`), so a wrong table name is a **silent runtime failure** (empty/error result at request time), not a compile-time one.

**Runtime bug found (present in all 3 repos, not Namana-specific):** `historyService.ts`'s `getProjectAssigneeEvents(projectId)` queries `.from("assignee_event")` — this table does not exist under that name in any migration (the real table is `workflow_event`). Grep confirms `getProjectAssigneeEvents` itself is **never called** from any route in any of the three repos (dead code) — so this bug is currently latent, not actively breaking anything, but would 500 (or return a Postgrest "table not found" error surfaced as a 500 via `errorHandler`) the moment something calls it.

**Required env vars** (`.env.example`, byte-identical across all three repos):
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3001
```
`bootstrap.ts`/`index.ts` load these via `dotenv`; `supabaseClient.ts` throws synchronously at import time if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. `PORT` is optional (`process.env.PORT ?? 3001`).

**CORS / port:** `app.ts` calls bare `cors()` with no options — this allows **any origin**, not scoped to a specific frontend dev-server URL. No hardcoded origin string exists anywhere in `app.ts` in any of the three repos. Port: no hardcoded value in code — defaults to `3001` only via the `.env.example` value / the `?? 3001` fallback in `index.ts`.

---

## 9. Adapter plan — keeping `src/fixtures/index.ts` as the only boundary

Given everything above, here is what `src/fixtures/index.ts` (or its eventual real-API-backed replacement, kept at the same import surface) would need to expose, and what's missing.

**Functions to expose (mirroring current exports, becoming async):**

| Current export | Becomes (shape unchanged, now Promise-returning) | Maps from |
|---|---|---|
| `PROJECTS_WITH_TASKS` / `PROJECT_SUMMARIES` | `getProjectSummaries(workspaceId)`, `getProjectWithTasks(projectId)` | `GET /api/projects/workspace/:workspaceId` + per-project `GET .../sections` + `GET /api/tasks/project/:projectId`, assembled client-side (§5) |
| `PROJECT_BY_ID` | `getProject(projectId)` | `GET /api/projects/:projectId` |
| `SECTION_BY_ID` | derived from the sections call above, keyed client-side (no single-section GET endpoint exists) | `GET /api/projects/:projectId/sections` |
| `TASKS` / `TASK_BY_ID` | `getTasksForProject(projectId)`, `getTask(taskId)` | `GET /api/tasks/project/:projectId` / `GET /api/tasks/:taskId` — subtasks come intermixed, filter by `parent_task_id` client-side |
| `MEMBERS` / `MEMBER_BY_ID` | `getWorkspaceMembers(workspaceId)` or `getProjectMembers(projectId)` | `GET /api/workspaces/:id/members` / `GET /api/projects/:id/members` — **no global "all users" endpoint exists**; members are always scoped to a workspace or project |
| `DELAY_CAUSES` / `DELAY_CAUSE_BY_ID` | **No server function possible today.** Must remain `AbsentValue` / a hardcoded local list, OR block on a new `GET /api/delay-causes` endpoint being added server-side. | No route exists (§3a) |
| `TASK_INTELLIGENCE_BY_ID` | Must be **assembled from 4 separate calls** per task: `GET /api/dependencies/task/:taskId/risk` → `riskScore`; `GET /api/tasks/:taskId/impact` → derive `impact` (pick one of `totalDependents`/`directDependents`, no single "impact" scalar exists); `GET /api/history/tasks/:taskId/waiting-time` → `waitingHours` (from `.features.idleHours`); `GET /api/tasks/:taskId/critical-path` → derive `onCriticalPath` by checking `chain.some(t => t.id === taskId)`. **This is 4 round trips per task**, not one — expensive if rendered for every row in a table. | §3a, §7 |
| `HISTORY` | `getTaskHistory(taskId)` / `getProjectHistoryFeed(projectId)` | `GET /api/history/tasks/:taskId` (raw snapshots) or `GET /api/history/projects/:projectId/feed` (nicer, pre-joined with task title + user name) — **`FieldChange[]` (`changes`) must be computed client-side** by diffing consecutive `task_snapshot` JSON blobs; server never returns field-level diffs (§3a) |
| `COMMENTS` | **No server function possible today.** Table exists, no route. Must remain `AbsentValue` or block on new `GET/POST /api/tasks/:taskId/comments` routes being added. | §3a |

**Fields to synthesize or leave as `AbsentValue` (no server source, confirmed above):**
- `DelayCause` (whole concept) — no route.
- `Comment` (whole concept) — no route, despite the table existing.
- `TaskState.waitingSince` — no stored column; would require a per-task `GET /api/history/tasks/:taskId/segments` call and picking the open `"waiting"` segment's `enteredAt`, adding a round trip the fixture data currently gets for free.
- `TaskIntelligence.impact` as a single scalar — server gives 3 separate dependent counts, not 1 impact number; the frontend must pick/compute its own formula.
- `TaskRef.identifier` — already correctly modeled as optional/absent; no change needed.
- `ProjectSummary.overdueCount`/`statusCounts`/`memberCount` — no rollup endpoint; must be computed client-side from the flat task/member lists after fetching them (same as fixtures do today, just against real data instead of static arrays).
- Current-user profile (`name`/`email` for "me") — no `/me` endpoint; only obtainable indirectly (decode JWT claims, or find your own id inside a workspace-members list you already fetched).
- `HistoryEntry.eventType` values `priority_changed`/`dependency_added`/`dependency_removed`/`due_date_changed` — server never emits these; either drop them from `KNOWN_EVENT_TYPES` or compute them client-side from snapshot diffs.
- `DependencyGraph.cycles` — no endpoint returns existing cycles, only rejects new ones at write time (§7); must be computed client-side from the fetched edge list if this feature ships.

**Things currently rendered that have no server-side source at all:** `DelayCause`, `Comment`, and the single-scalar `TaskIntelligence.impact`/`onCriticalPath` fields (as opposed to their multi-field server equivalents) are the three genuine dead ends — everything else is reachable, just via more round trips or client-side derivation than the fixtures currently need.

---

## 10. Coverage gaps

### API surface with no frontend consumer today

The entire frontend is currently 100% fixture-driven — **zero `fetch`/`axios`/`import.meta.env` usage exists anywhere in `src/`** (confirmed by repo-wide grep). So, strictly, *no* endpoint has a live consumer yet. Listed here for completeness, grouped by what's clearly unused even conceptually vs. what's planned-but-not-wired:

- **Unused even conceptually** (no fixture/type models this data at all): `POST /api/auth/signup`, `/login`, `/logout` (no auth flow modeled in the frontend — `CURRENT_USER_ID` is a hardcoded constant); all workspace/project *member management* mutation routes (`POST`/`DELETE` on `.../members`) — `Member[]` is read-only in `ui.ts`, no add/remove-member UI type exists; `GET /api/tasks/:taskId/delay-days`; `GET /api/history/tasks/:taskId/crypto/verify` (cryptographic audit chain — no UI concept for this at all); `PATCH /api/workspaces/:workspaceId`, `DELETE /api/workspaces/:workspaceId` (no workspace-settings UI at all — the unowned `SettingsPage` stub and its `/settings` route were removed outright, not just left unread); `GET /api/dependencies/task/:taskId/impact` (duplicate of the tasks-route version, so at most one of the two ever needs a consumer).
- **Planned but not wired** (a `ui.ts` type exists, implying intent, but no fetch call exists yet since there's no fetch anywhere): everything — `TaskIntelligence`, `HistoryEntry`, `DependencyGraph`, `Comment`, `StatusChange`, `TaskDraft`, `TaskPatch` all have corresponding types but zero network code.

### Frontend needs the API does not provide

1. **No project/workspace rollup endpoint** — `ProjectSummary.statusCounts`/`memberCount`/`overdueCount` must be client-computed from multiple flat fetches; no `GET /api/projects/:id/summary`.
2. **No bulk/batch task-detail endpoints** — impact, critical-path, risk, and waiting-time are all single-task-id only; rendering intelligence for a list of tasks means N× round trips per metric, 4N total for a section with N tasks.
3. **No `DelayCause` listing endpoint** — table exists, unreachable via HTTP.
4. **No comments endpoints** (`GET`/`POST /api/tasks/:taskId/comments`) — table exists, unreachable via HTTP.
5. **No current-user profile endpoint** (`GET /api/auth/me` or similar) — no way to fetch your own `name`/`email`/`job_role_id` in one call.
6. **No token refresh endpoint** — login/signup return a `refreshToken` with nowhere to redeem it against this backend.
7. **No project-wide dependency-edge-list endpoint** — only per-task, forcing N calls + client-side de-dup to render a full graph.
8. **No cycle-detection query endpoint** — cycle checking only happens at write time inside `POST /api/dependencies`; can't ask "does this project have a cycle right now."
9. **No field-level history/audit trail** — `task_history` stores full snapshots; no endpoint diffs them into `{field, from, to}` entries, which `HistoryEntry.changes` (`ui.ts`) already assumes exists.
10. **No global/workspace-wide user directory** — members are always scoped to a workspace or project; no `GET /api/users` to resolve an arbitrary `user_id` (e.g., a `created_by` on a task from a project you're not a member of) to a name.
11. **No `job_role` lookup** — `AppUser.job_role_id` is a bare unlinked text field; no table or endpoint resolves it to a label.

No implementation was attempted for any of the above — this section is reporting gaps only, per the audit's instructions.

---

## 6. Frontend workarounds for missing/incomplete endpoints

Unlike the rest of this document, the two items below are not read-only findings — they are
frontend-side patches, implemented entirely under `src/lib/`, that let the app degrade
gracefully around the two gaps until the real backend work lands. Both stay behind existing
data seams (`src/lib/projectApi.ts`'s `getProjectHistory`, and `MembersPage.tsx`'s consumption
of `Member[]`) and change no fetch path, request shape, or type definition beyond what's listed.

### 6.1 — History feed `taskTitle` hydration

**Substitutes for:** `GET /api/history/projects/:projectId` not joining task titles into its
response (`docs/API_MISMATCH_AUDIT.md`, Step 3, Row 3 — the route returns raw `task_history`
rows with `task_id`/`event_type`/`user_id`/`created_at` only; `taskTitle` has no source field
at all).

**What it does:** `src/lib/historyHydration.ts`'s `hydrateProjectHistory(projectId)` calls the
existing `getProjectHistory(projectId)` plus one new call to `GET /api/tasks/project/:projectId`
(a real, working, already-mounted route — `taskService.listTasks`) per project, builds a
`Map<taskId, title>`, and fills in `taskTitle` on every row that's missing it. One fetch per
project for tasks, one fetch per project for history — never per row.

**What it does NOT fix:** `userName` and `status` stay unresolved. The only backend route that
ever resolves a `user_id` to a name/email is `GET /api/tasks/:taskId/assignees`
(`assigneeService.listAssignees`), which is scoped to a single task — using it to hydrate
`userName` across a project's full history feed would mean one HTTP request per task
represented in that feed (a real N+1), which this workaround deliberately does not do. Every
row's `userName` still falls back to `HistoryPage.tsx`'s existing "Unknown user" string. This
was a deliberate scope cut, not an oversight — see item 10 in "Frontend needs the API does not
provide" above, which already flagged the missing user-directory endpoint before this
workaround existed.

**Files touched:**
- `src/lib/historyHydration.ts` — new file, both exported items marked `WORKAROUND`.
- `src/pages/HistoryPage/HistoryPage.tsx` — swapped its `getProjectHistory` import/call for
  `hydrateProjectHistory`; no other change. `HistoryFeedEntry`'s type is unchanged.

**Delete or revert when the real endpoint ships:**
1. Delete `src/lib/historyHydration.ts` entirely.
2. In `src/pages/HistoryPage/HistoryPage.tsx`: revert the import back to
   `getProjectHistory` from `@/lib/projectApi`, and change `hydrateProjectHistory(project.id)`
   back to `getProjectHistory(project.id)`. No other line in that file needs to change.
3. Confirm `docs/API_MISMATCH_AUDIT.md` Step 3/Row 3 no longer applies (i.e. the real response
   already contains `taskTitle`) before deleting — if it now contains `taskTitle` but still not
   `userName`/`status`, keep a slimmed version of this file rather than deleting it outright.

### 6.2 — Workspace members list

**Not built.** `GET /api/workspaces/:workspaceId/members` does not exist
(`docs/API_MISMATCH_AUDIT.md`, Step 2, row 1), and the only client-derivable substitute — a
union of task assignees and history actors, per the original workaround plan — cannot produce
the `Member` shape `MembersPage.tsx` requires (`name`, `email`, `initials` are all non-optional
fields it reads directly). The only backend route that ever resolves a `user_id` to a name/email
is the same per-task `GET /api/tasks/:taskId/assignees` from 6.1, and building a workspace-wide
member list from it means fetching assignees for every task in every project in the workspace —
an N+1 pattern, not "one fetch per collection." Rather than ship a members list that displays
raw UUIDs instead of names, this was intentionally left unbuilt. `MembersPage.tsx` keeps
rendering its existing error state (see Fix 2, prior session) until either
`GET /api/workspaces/:workspaceId/members` ships, or some other bulk user-lookup endpoint does.
