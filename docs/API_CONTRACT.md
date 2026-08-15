# API Contract — fixtures → backend handoff

Written for whoever wires this frontend to the real backend, without needing to read the
component tree to figure out what data shape is expected or where it comes from. Everything
here is sourced from `INTEGRATION_AUDIT.md` (an independent, read-only audit of the three
backend repos plus this frontend) — nothing below was re-derived or guessed; where the audit
didn't have an answer, this document says so explicitly rather than filling the gap.

## The boundary

**`src/fixtures/index.ts` is the only place any page or component imports data from.** No
component, no page, ever imports a `.ts` fixture file directly, and no component ever fetches
anything itself — confirmed by the file's own header comment and by how every page in this
codebase is built (`src/pages/*/*.tsx` all import from `@/fixtures` or `@/store`, never from
`@/fixtures/tasks` or similar). `src/store/` (a `useReducer` + Context layer) sits on top of
`fixtures/index.ts` for the handful of fields that support in-session mutation (tasks, comments)
but is itself seeded from these same fixture exports at startup (`TasksContext.tsx`'s
`init()` calls `initTasksState(TASKS, COMMENTS)`).

**Swapping this file's contents for real network calls should require zero changes to any
component.** The constraint is the *exported shape*, not how it's produced — `MEMBERS` can go
from a static array to the resolved value of an awaited `fetch()` and nothing downstream needs
to change, provided the exported names still resolve to values matching the types below. The
concrete mechanism for making these async in practice (return `Promise<T>` and thread
`useEffect`/suspense/a data-fetching library into pages, vs. some other loading pattern) is left
to whoever does that work — this document specifies the *shape* contract, not the loading
strategy.

`src/types/database.ts` needs **no changes** going into a real integration — it is byte-identical
to the canonical backend's own `database.ts` (verified in `INTEGRATION_AUDIT.md` §3). Everything
UI-shaped lives in `src/types/ui.ts`, built on top of `database.ts`, and that's the layer this
document is about.

---

## Auth (out of `fixtures/index.ts`'s scope — routed separately)

`/login` and `/signup` are route stubs (Block 19) — `AuthLayout` +
`LoginPage`/`SignupPage`, wired in `router.tsx` outside `AppShell` (no
sidebar/topbar/breadcrumbs). No form, no validation, no session state, no
token storage exists yet; mounting a real form is the only change needed in
`LoginPage.tsx`/`SignupPage.tsx` — the route and layout are already wired.

Backing endpoints (per `INTEGRATION_AUDIT.md` §4/§6, both public — no
`Authorization` header required):

| Method | Path | Request body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | `200` `AuthSession = { userId, accessToken, refreshToken, expiresAt }` |
| POST | `/api/auth/signup` | `{ name, email, password }` | `201` `AuthSession` (same shape) |

`accessToken` is a real Supabase session JWT — every authenticated request
after login sends it as `Authorization: Bearer <accessToken>`
(`INTEGRATION_AUDIT.md` §6). There is no `/api/auth/refresh` endpoint; no
`/api/auth/me` either (see "Blocked on backend" #3 below) — the caller's own
profile isn't fetchable in one call. None of this is wired anywhere in the
frontend yet; this section exists so whoever builds the real forms doesn't
have to re-read the full audit to find these two rows.

---

## Insights (out of `fixtures/index.ts`'s scope — routed separately)

`/projects/:projectId/insights` is a route stub (Block 19) —
`InsightsPage`, wired in `router.tsx` as a sibling of the existing
`/projects/:projectId/graph` route, inside `AppShell` (sidebar/topbar as
normal). No data fetching, no charts, no panels exist yet; mounting real
content is the only change needed in `InsightsPage.tsx` — the route is
already wired. No sidebar/nav link exists yet either — adding one is a
one-line addition once the page is real (see `Sidebar.tsx`'s existing
`NavItem`/project-nav-group pattern).

Backing endpoints (per `INTEGRATION_AUDIT.md` §4/§7, all five require
project `viewer` access and recompute live on every GET — not cached,
not idempotent-free of DB writes, but idempotent in *returned* result
given unchanged input data):

| Method | Path | Response |
|---|---|---|
| GET | `/api/insights/dashboard/:projectId` | `InsightsDashboardResult = { summary: { overallRisk: SeverityLevel, healthScore (0-100), totalAnomalies, contextSwitchingAnomalies, handoffBreakdownAnomalies, hiddenWaitingAnomalies, highRiskTasks }, contextSwitching: ContextSwitchingResult[], handoffBreakdowns: HandoffResult[], hiddenWaiting: WaitingTimeResult[], riskScores: RiskScoreResult[], recommendations: string[] (top 5, deduped, high/critical severity only), computedAt }` — a single call that internally re-runs all four detectors below in parallel; the one bulk fetch that avoids 4 separate requests, at the cost of getting everything even if only one panel is needed. |
| GET | `/api/insights/risk/:projectId` | `RiskScoreResult[]` — one entry per task in the project (all tasks, not just idle ones): `{ taskId, taskTitle, riskScore (0-100, rule score blended 75/25 with waiting-time anomaly signal), riskLevel: SeverityLevel, ruleScore, waitingTimeAnomalyScore, isWaitingTimeAnomaly, features: { priority, totalDependents, blockedDependents, daysUntilDue }, reasons: string[], explanation }`. Sorted by `riskScore` desc. |
| GET | `/api/insights/handoffs/:projectId` | `HandoffResult[]` — one entry per completed (paired removed→added) assignee handoff: `{ taskId, taskTitle, previousOwnerId, previousOwnerName, nextOwnerId, nextOwnerName, removedAt, addedAt, handoffBreakdownScore (0-100), anomalyScore, isAnomaly, severity, method, features: { handoffDelayHours, postHandoffIdleHours }, explanation, recommendation }`. Sorted by `anomalyScore` desc. |
| GET | `/api/insights/context-switching/:projectId` | `ContextSwitchingResult[]` — one entry per user with `in_progress` history in the project: `{ userId, userName, userEmail, contextSwitchingScore (0-100), anomalyScore (0-100), isAnomaly, severity: SeverityLevel, method: "iqr"\|"isolation_forest", features: { activeTaskCount, peakConcurrentActiveTasks, avgConcurrentActiveTasks, contextSwitchCount, contextSwitchesPerDay, avgTaskActiveDurationHours, windowDays }, explanation, recommendation }`. Sorted by `anomalyScore` desc. |
| GET | `/api/insights/waiting-time/:projectId` | `WaitingTimeResult[]` — one entry per task that has ever entered `waiting`/`blocked`: `{ taskId, taskTitle, waitingTimeScore (0-100), anomalyScore, isAnomaly, isHighWaitingTime, severity, method, features: { idleHours, waitingFrequency, currentIdleHours }, explanation, recommendation }`. Sorted by `anomalyScore` desc. |

`severity`/`riskLevel`/`overallRisk` are all `SeverityLevel` (`"low" |
"medium" | "high" | "critical"`) — a backend-computed value, not this
app's own `PriorityLevel`. None of these five endpoints are consumed
anywhere in the frontend yet; this section exists so whoever builds the
real Insights page doesn't have to re-read the full audit to find these
five rows.

---

## Per-export contract

Each row: the current `fixtures/index.ts` export, its exact TypeScript shape, which backend
endpoint(s) (per `INTEGRATION_AUDIT.md` §4) would supply the underlying data, what client-side
assembly is required, and a **suggested** (non-binding — rename/reshape freely, the only real
constraint is the import surface) async replacement signature.

### `MEMBERS: Member[]`, `MEMBER_BY_ID: Record<string, Member>`

```ts
interface Member { id: string; name: string; email: string; initials: string; role: RoleType }
```

**Endpoint:** `GET /api/workspaces/:workspaceId/members` or `GET /api/projects/:projectId/members`
(both return an embedded `app_user` join: `{ id, user_id, role, app_user: {id, name, email} }`).
**No global "all users" endpoint exists** — members are always scoped to a workspace or a
project, never fetched as a flat list independent of one.

**Assembly required:** flatten the `app_user` join into `Member`'s flat shape; compute
`initials` client-side (`initialsOf(name)` in `src/lib/format.ts` already does this — pure
string logic, will never be a server field, see 15B below).

**Suggested replacement:** `getWorkspaceMembers(workspaceId): Promise<Member[]>` or
`getProjectMembers(projectId): Promise<Member[]>` — pick whichever scope the calling page
actually has in context; today's fixtures conflate both into one flat `MEMBERS` array, which
the real API cannot do in one call.

### `TASKS: TaskView[]`, `TASK_BY_ID: Record<string, TaskView>`

```ts
interface TaskView {
  id: string; identifier?: string; title: string; description: string | null;
  projectId: string; sectionId: string | null; parentTaskId: string | null;
  priority: PriorityLevel; state: TaskState; startDate: string | null; dueDate: string | null;
  position: number | null; assignees: Member[]; dependsOn: TaskRef[]; blocks: TaskRef[];
  subtasks: TaskRef[]; createdBy: Member | null; createdAt: string; updatedAt: string | null;
  isDeleted: boolean; intelligence?: TaskIntelligence;
}
```

**Endpoint:** `GET /api/tasks/project/:projectId` — flat `Task[]`, **subtasks intermixed with
top-level tasks in the same response**, distinguished only by `parent_task_id`. There is no
`GET /api/tasks/:taskId/subtasks` and no depth limit enforced server-side.

**Assembly required (substantial):**
- Filter by `parent_task_id === null` for top-level task lists; group the rest by
  `parent_task_id` for subtask lists — exactly the pattern `tasksReducer.ts`'s
  `descendantIdsOf()` and `fixtures/index.ts`'s own `TASKS.filter(...)` already use against
  static data.
- `assignees`: separate call, `GET /api/tasks/:taskId/assignees`, per task — not bundled.
- `dependsOn`/`blocks`: derived from `GET /api/dependencies/task/:taskId` (per task; see
  `DEPENDENCIES` below).
- `state` (the `TaskState` discriminated union): **the waiting-cause invariant this type
  enforces is not guaranteed by the server.** `delay_cause_id` is a bare nullable FK with no
  CHECK constraint tying it to `status = 'waiting'`. Mapping an arbitrary `Task` row onto
  `TaskState` needs a defensive decision for `status: "waiting", delay_cause_id: null` (currently
  inexpressible in this type) and `status: "blocked", delay_cause_id: <uuid>` (would have to be
  dropped to satisfy the type). This is not a corner case to skip — it's a real shape mismatch
  the integrator must resolve one way or the other before this type can hold real data safely.
- `intelligence`: see `TASK_INTELLIGENCE_BY_ID` below — **4 separate round trips per task.**

**Suggested replacement:** `getTasksForProject(projectId): Promise<TaskView[]>`,
`getTask(taskId): Promise<TaskView>`.

### `DELAY_CAUSES: DelayCause[]`, `DELAY_CAUSE_BY_ID: Record<string, DelayCause>`

```ts
interface DelayCause { id: string; name: string }
```

**No server function possible today.** A `delay_cause` table exists in the SQL schema
(`id uuid`, `name text` unique) but **no route or service in any of the three backend repos
exposes it** — no `GET /api/delay-causes` or equivalent. `task.delay_cause_id` is a bare FK the
API passes through blind on `PATCH /api/tasks/:taskId`, never resolved to a name server-side.

**Must stay `AbsentValue` / a hardcoded local list until a `GET /api/delay-causes` endpoint is
added.** This is one of the four "blocked on backend" asks below — there is currently no way to
show a real delay-cause name for a waiting task via the live API at all.

### `TASK_INTELLIGENCE_BY_ID: Record<string, TaskIntelligence>`

```ts
interface TaskIntelligence { riskScore: number; impact: number; waitingHours: number; onCriticalPath: boolean }
```

**No single endpoint returns this shape.** It must be assembled from **4 separate per-task
calls**:

| Field | Endpoint | Notes |
|---|---|---|
| `riskScore` | `GET /api/dependencies/task/:taskId/risk` | Returns a full `RiskScoreResult` (score + `riskLevel` + `features` + `reasons[]` + `explanation`) — this repo's `riskScore` is one field of that. |
| `impact` | `GET /api/tasks/:taskId/impact` | Server returns `TaskImpact = { directDependents, totalDependents, blockedDependents }` — **three numbers, not one scalar.** The integrator must pick a formula (e.g. `totalDependents`) or redesign `TaskIntelligence.impact` to carry all three. |
| `waitingHours` | `GET /api/history/tasks/:taskId/waiting-time` | Field is `WaitingTimeResult.features.idleHours`, different name, different endpoint. |
| `onCriticalPath` | `GET /api/tasks/:taskId/critical-path` | Returns `CriticalPathResult { chain: Task[], ... }` for that one target task — `onCriticalPath` must be derived as `chain.some(t => t.id === taskId)`, not read directly. |

**This is 4 round trips per task, not 1** — rendering intelligence for every row in a table of
N tasks is up to 4N requests. No bulk/batch variant of any of these four endpoints exists.

**Suggested replacement:** no single function — likely
`getTaskIntelligence(taskId): Promise<TaskIntelligence>` internally issuing all 4 calls with
`Promise.all`, called lazily (e.g. on row expand, not for every row eagerly) given the request
cost.

### `HISTORY: HistoryEntry[]`

```ts
interface HistoryEntry { id: string; taskId: string; actor: Member | null; eventType: string; changes: FieldChange[]; createdAt: string }
interface FieldChange { field: string; from: string | null; to: string | null }
```

**Endpoint:** `GET /api/history/tasks/:taskId` (raw `TaskHistory[]`, oldest first) or
`GET /api/history/projects/:projectId/feed` (pre-joined with task title + user name, nicer for a
project-wide feed) — pick per which page is rendering.

**Assembly required (the hard part):** `changes: FieldChange[]` **has no server source.** The
backend's `task_history` table stores full `task_snapshot` JSONB blobs per event, not
pre-computed field diffs. To populate `changes`, the integrator must diff consecutive snapshots
for the same `task_id` client-side. Additionally, `eventType` values this repo's
`KNOWN_EVENT_TYPES` (`src/lib/constants.ts`) lists — `priority_changed`, `dependency_added`,
`dependency_removed`, `due_date_changed` — **are never produced by the backend.** The DB trigger
only ever writes `'created'`, `'updated'`, or `'deleted'` for `task_history`, and
`'assignee_added'`/`'assignee_removed'` for the separate `workflow_event` table. Either drop
those four values from `KNOWN_EVENT_TYPES` or compute them client-side by inspecting which field
changed between two consecutive snapshots.

**Suggested replacement:** `getTaskHistory(taskId): Promise<HistoryEntry[]>`,
`getProjectHistoryFeed(projectId): Promise<HistoryEntry[]>` — both would need to run the
snapshot-diffing step described above before returning.

### `COMMENTS: Comment[]`

```ts
interface Comment { id: string; taskId: string; author: Member; body: string; createdAt: string }
```

**No server function possible today.** A `task_comments` table exists in the SQL schema
(`id, task_id, user_id, comment, created_at, updated_at`) but **zero routes or services touch it
in any of the three backend repos.** Fully absent from the live API surface despite the table
being provisioned.

**Must remain `AbsentValue`, or the whole Comments feature stays fixture-only, until
`GET`/`POST /api/tasks/:taskId/comments` are added server-side.** Second of the four "blocked on
backend" asks below.

### `DEPENDENCIES: TaskDep[]`

```ts
interface TaskDep { id: string; blocking_task_id: string | null; blocked_task_id: string | null; created_at: string | null }
```

**Endpoint:** `GET /api/dependencies/task/:taskId` — but this is **per-task, not project-wide**,
and returns both directions (edges where the task is blocking, and where it's blocked). **There
is no project-wide "give me every dependency edge" endpoint.** `dependencyService.getProjectDeps()`
exists server-side and is used internally by risk/dependency-analysis services, but it is never
wired to an HTTP route.

**Assembly required:** to build the full project dependency graph this repo's `src/lib/graph.ts`
(`computeGraphLayout`) and `src/lib/criticalPath.ts` (`computeCriticalPath`) both need, the
integrator must call `GET /api/dependencies/task/:taskId` once per task in the project and
de-duplicate edges client-side (an edge will appear in both endpoints' results if both its
blocking and blocked task are in the same project). This is the **first** of the four "blocked
on backend" asks below — a bulk endpoint would remove N calls down to 1.

**Also note:** `GraphLayout.cycles` (added in this repo's own Block 13) has no server
equivalent — the backend's `possibleCycle()` check only runs at dependency-*creation* time to
reject a would-be cycle before insert; there is no endpoint that reports cycles already present
in a project's graph. `lib/graph.ts`'s `detectCycles` must keep running client-side regardless
of backend changes, since the server will never expose this as a queryable fact (see
`INTEGRATION_AUDIT.md` §7's explicit ownership recommendation: full-project layout, cycle
surfacing, and CPM slack computation are not duplicated server-side and are correctly a
client-side responsibility, fed by the flat per-task edge list).

**Suggested replacement:** `getProjectDependencies(projectId): Promise<TaskDep[]>` — internally
either the wished-for bulk endpoint (once it exists) or the current N-calls-plus-dedup fallback.

### `PROJECTS_WITH_TASKS: ProjectView[]`

```ts
interface ProjectView {
  id: string; name: string; description: string | null; members: Member[];
  sections: SectionView[]; statusCounts: StatusCounts; createdAt: string; isDeleted: boolean;
}
interface SectionView { id: string; projectId: string; name: string; description: string | null; position: number; tasks: TaskView[] }
```

**Endpoints (multiple, assembled client-side):**
1. `GET /api/projects/workspace/:workspaceId` → flat `Project[]`.
2. Per project: `GET /api/projects/:projectId/sections` → flat `Section[]`.
3. Per project: `GET /api/tasks/project/:projectId` → flat `Task[]`, grouped by `section_id`
   client-side (same pattern this repo's own `fixtures/index.ts` already does against static
   arrays — `TASKS.filter(t => t.sectionId === section.id)`).
4. Per project: `GET /api/projects/:projectId/members` → `Member[]`.

**Assembly required:** `statusCounts` (a `StatusCounts` tally across the project's tasks) has no
server equivalent — computed client-side by iterating the fetched task list, same as today.
**Everything here is flat on the wire; there is no nested "workspace → projects → sections →
tasks" response anywhere in the API** (`INTEGRATION_AUDIT.md` §5).

**Suggested replacement:** `getProjectWithTasks(projectId): Promise<ProjectView>` (per-project,
called once per project actually being rendered — not eagerly for every project in the
workspace, given the round-trip cost above).

### `PROJECT_SUMMARIES: ProjectSummary[]`

```ts
interface ProjectSummary { id: string; name: string; description: string | null; statusCounts: StatusCounts; memberCount: number; overdueCount: number }
```

**No rollup endpoint exists** (`GET /api/projects/:id/summary` does not exist). `statusCounts`,
`memberCount`, and `overdueCount` must all be computed client-side from the same flat
task/member fetches `PROJECTS_WITH_TASKS` above needs — this is not a cheaper/separate call, it's
the same data, differently shaped.

**Suggested replacement:** `getProjectSummaries(workspaceId): Promise<ProjectSummary[]>`,
internally reusing whatever `getProjectWithTasks` fetches (or a lighter parallel fetch if the
per-project task list isn't otherwise needed on the page calling this).

### `PROJECT_BY_ID: Record<string, ProjectView>`

Same shape and assembly as `PROJECTS_WITH_TASKS` above, keyed by id. **Suggested replacement:**
`getProject(projectId): Promise<ProjectView>` — this is `GET /api/projects/:projectId` for the
bare `Project` row, plus the same sections/tasks/members assembly as above.

### `SECTION_BY_ID: Record<string, SectionView>`

Derived client-side from the sections call in `PROJECTS_WITH_TASKS`'s assembly above — **there
is no single-section `GET` endpoint** (`GET /api/projects/:projectId/sections/:sectionId` does
not exist; only the list endpoint and `PATCH`/`DELETE` by id). To resolve one section by id, the
integrator must fetch the full section list for its project and pick the matching id client-side,
same as this fixture file does today by building `SECTION_BY_ID` from `PROJECTS_WITH_TASKS`
rather than fetching directly.

---

## What the UI renders that the API cannot currently supply

Pulled directly from `INTEGRATION_AUDIT.md` §9 ("fields to synthesize or leave `AbsentValue`")
and §10 ("frontend needs the API does not provide") — not re-derived here.

| Field / concept | Why it has no server source |
|---|---|
| `DelayCause` (whole concept — id/name) | Table exists, zero routes expose it. |
| `Comment` (whole concept) | Table exists, zero routes touch it. |
| `TaskState.waitingSince` | No stored column anywhere. Closest equivalent is `StatusTimeline.enteredAt` for the open `"waiting"` segment, itself a derived value from a separate endpoint (`GET /api/history/tasks/:taskId/segments`), not a field on the task object. |
| `TaskIntelligence.impact` as one scalar | Server gives 3 separate dependent counts (`directDependents`/`totalDependents`/`blockedDependents`), not 1 number — the frontend must pick or compute its own formula. |
| `ProjectSummary.overdueCount` / `.statusCounts` / `.memberCount` | No rollup endpoint; must be computed client-side from flat task/member fetches. |
| Current-user profile (`name`/`email` for "me") | No `/me` endpoint at all — only obtainable indirectly (decode the login JWT's claims, or find your own id inside a workspace-members list you already fetched). |
| `HistoryEntry.eventType` values `priority_changed`, `dependency_added`, `dependency_removed`, `due_date_changed` | Server never emits these — only `created`/`updated`/`deleted` (`task_history`) and `assignee_added`/`assignee_removed` (`workflow_event`). Must be dropped from `KNOWN_EVENT_TYPES` or computed client-side from snapshot diffs. |
| `GraphLayout.cycles` (project-wide dependency graph edges + detected cycles) | No project-wide edge-list endpoint; no cycle-query endpoint (write-time rejection only). Both are and will remain client-side computations fed by N per-task calls. |

---

## Blocked on backend — explicit asks

Four concrete endpoint asks, each backed by an audit citation:

1. **Project-wide dependency-edge-list endpoint** (`GET /api/projects/:projectId/dependencies` or
   similar). Today: `GET /api/dependencies/task/:taskId` is per-task only; building a full
   project graph costs N calls + client-side dedup. `dependencyService.getProjectDeps()` already
   exists server-side and does exactly this — it's just never wired to a route.
   (`INTEGRATION_AUDIT.md` §5, §10 item 7.)
2. **Delay-cause list endpoint + seed data** (`GET /api/delay-causes`). Today: the `delay_cause`
   table exists in Postgres but has no route and, per the audit, **no seed data in any
   migration** — even once a route exists, someone needs to decide what causes actually get
   seeded (this repo's fixture list — Dependency/Review/Approval/Clarification/External input —
   is a frontend invention, not a confirmed server-side set). (`INTEGRATION_AUDIT.md` §2 enum
   table, §10 item 3.)
3. **`GET /api/auth/me`** (or equivalent "get current user + memberships" boot endpoint). Today:
   there is no way to fetch the logged-in user's own `name`/`email`/`job_role_id` from `app_user`
   in one call — only other users' profiles are ever returned, embedded in members/assignees
   joins. (`INTEGRATION_AUDIT.md` §6, §10 item 5.)
4. **A decision on comments**: either build `GET`/`POST /api/tasks/:taskId/comments` against the
   already-provisioned `task_comments` table, or make an explicit product call to drop the
   Comments tab/feature rather than leave it permanently fixture-only. Currently the table exists
   and is fully unreachable via HTTP. (`INTEGRATION_AUDIT.md` §3a, §10 item 4.)

No implementation is proposed for any of these four — same "report gaps, don't build" stance the
audit itself took.
