# Frontend ↔ Backend API Mismatch Audit

Scope: every `fetch()` call in `src/lib/projectApi.ts`, `src/lib/insightsApi.ts`,
`src/lib/api.ts`, plus the two inline `fetch()` calls in `LoginPage.tsx`/`SignupPage.tsx`
(they do not go through `src/lib/api.ts` despite that file existing), reconciled against
every route actually mounted in `../pm-backend/backend/src/app.ts` and defined under
`../pm-backend/backend/src/routes/*.ts`.

No file under `src/` or `../pm-backend/` was modified in producing this report.

---

## Step 1A — Every path the frontend requests

| # | File:Line | Template string | Method | Expected return type |
|---|---|---|---|---|
| 1 | [src/lib/projectApi.ts:86-88](src/lib/projectApi.ts#L86) | `` `/api/workspaces/${workspaceId}/members` `` | GET | `Member[]` (via `BackendMember[]` intermediate, [projectApi.ts:48-65](src/lib/projectApi.ts#L48)) |
| 2 | [src/lib/projectApi.ts:104-106](src/lib/projectApi.ts#L104) | `` `/api/projects/workspace/${workspaceId}` `` | GET | `Project[]` ([projectApi.ts:67-70](src/lib/projectApi.ts#L67)) |
| 3 | [src/lib/projectApi.ts:112-114](src/lib/projectApi.ts#L112) | `` `/api/history/projects/${projectId}` `` | GET | `HistoryFeedEntry[]` ([projectApi.ts:72-81](src/lib/projectApi.ts#L72)) |
| 4 | [src/lib/insightsApi.ts:97](src/lib/insightsApi.ts#L97) | `` `/api/insights/dashboard/${projectId}` `` | GET | `InsightsDashboardResult` (`src/types/database.ts`) |
| 5 | [src/pages/LoginPage/LoginPage.tsx:35](src/pages/LoginPage/LoginPage.tsx#L35) | `` `${API_BASE}/api/auth/login` `` | POST | `AuthSession` ([LoginPage.tsx:13-18](src/pages/LoginPage/LoginPage.tsx#L13)) |
| 6 | [src/pages/SignupPage/SignupPage.tsx:46](src/pages/SignupPage/SignupPage.tsx#L46) | `` `${API_BASE}/api/auth/signup` `` | POST | `AuthSession` ([SignupPage.tsx:13-18](src/pages/SignupPage/SignupPage.tsx#L13)) |

`src/lib/api.ts` defines only `export const API_BASE` — it exports no request functions and has **zero consumers** anywhere in `src/` (verified by grep; `LoginPage.tsx`/`SignupPage.tsx` each declare their own local, separately-defined `API_BASE` constant instead of importing this one). It does not appear in the table above because it makes no requests itself.

---

## Step 1B — Every path the backend serves

Mount prefixes, from [app.ts:26-32](../pm-backend/backend/src/app.ts#L26):

```
/api/workspaces    → workspaceRoutes
/api/projects      → projectRoutes
/api/projects/:projectId/sections → sectionRoutes
/api/tasks         → taskRoutes
/api/dependencies  → dependencyRoutes
/api/history       → historyRoutes
/api/delay-causes  → delayCauseRoutes
```

All routes below run behind `app.use(requireUser)` ([app.ts:24](../pm-backend/backend/src/app.ts#L24)), which requires an `X-User-Id` header resolving to a real `app_user` row ([middleware/auth.ts:10-35](../pm-backend/backend/src/middleware/auth.ts#L10)) — there is no Bearer-token support server-side despite `src/lib/api.ts:6-19`'s client-side branch for it.

| Full path | Method | Service fn | Access level |
|---|---|---|---|
| `/api/workspaces` | GET | `listWorkspaces` | `requireUser` only |
| `/api/workspaces` | POST | `createWorkspace` | `requireUser` only |
| `/api/workspaces/:workspaceId` | GET | `getWorkspaceById` | `requireWorkspaceAccess` |
| `/api/workspaces/:workspaceId` | PATCH | `updateWorkspace` | workspace owner |
| `/api/workspaces/:workspaceId` | DELETE | `deleteWorkspace` | workspace owner |
| `/api/projects` | POST | `createProject` | `requireWorkspaceAccess` |
| `/api/projects/workspace/:workspaceId` | GET | `listProjects` | `requireWorkspaceAccess` |
| `/api/projects/:projectId` | GET | `getProjectById` | `requireProjectAccess("viewer")` |
| `/api/projects/:projectId` | PATCH | `updateProject` | `requireProjectAccess("editor")` |
| `/api/projects/:projectId` | DELETE | `deleteProject` | `requireProjectAccess("admin")` |
| `/api/projects/:projectId/members` | POST | `addProjectMember` | `requireProjectAccess("admin")` |
| `/api/projects/:projectId/members/:memberUserId` | DELETE | `removeUserFromProject` | `requireProjectAccess("admin")` |
| `/api/projects/:projectId/sections` | GET | `listSections` | `requireUser` (no explicit project-access check in route) |
| `/api/projects/:projectId/sections` | POST | `createSection` | same |
| `/api/projects/:projectId/sections/:sectionId` | PATCH | `updateSection` | same |
| `/api/projects/:projectId/sections/:sectionId` | DELETE | `deleteSection` | same |
| `/api/tasks/project/:projectId` | GET | `listTasks` | `requireUser` |
| `/api/tasks/project/:projectId` | POST | `createTask` | `requireUser` |
| `/api/tasks/:taskId` | GET/PATCH/DELETE | `getTaskById`/`updateTask`/`deleteTask` | `requireUser` |
| `/api/tasks/:taskId/status` | PATCH | `updateTaskStatus` | `requireUser` |
| `/api/tasks/:taskId/delay-days` | GET | `getDelayDays` | `requireUser` |
| `/api/tasks/:taskId/impact` | GET | `getTaskImpact` | `requireUser` |
| `/api/tasks/:taskId/critical-path` | GET | `getCriticalPathToTask` | `requireUser` |
| `/api/tasks/:taskId/assignees` | GET/POST | `listAssignees`/`addAssignee` | `requireUser` |
| `/api/tasks/:taskId/assignees/:assigneeId` | DELETE | `removeAssignee` | `requireUser` |
| `/api/dependencies/project/:projectId` | GET | `listProjectDeps` | `requireUser` |
| `/api/dependencies/task/:taskId` | GET | `listDeps` | `requireUser` |
| `/api/dependencies` | POST | `createDep` | `requireUser` |
| `/api/dependencies/:depId` | DELETE | `deleteDep` | `requireUser` |
| `/api/history/tasks/:taskId` | GET | `getTaskHistory` | `validateTaskAccess` |
| `/api/history/tasks/:taskId/segments` | GET | `getTaskStatusDuration` | `validateTaskAccess` |
| `/api/history/projects/:projectId` | GET | `getProjectHistory` | `requireProjectAccess("viewer")` |
| `/api/delay-causes` | GET/POST | `listDelayCauses`/`createDelayCause` | `requireUser` |
| `/api/delay-causes/:causeId` | PATCH | `updateDelayCause` | `requireUser` |

There is **no** `/api/auth/*` mount and **no** `/api/insights/*` mount in `app.ts`. `find ../pm-backend -iname "*insight*"` and `find ../pm-backend/backend/src -iname "*auth*"` (beyond `middleware/auth.ts` and `utils/auth.ts`, neither of which define routes) both confirm there is no route file for either.

---

## Step 2 — Reconciliation

| # | Frontend path | Backend path | Verdict |
|---|---|---|---|
| 1 | `GET /api/workspaces/:workspaceId/members` | *(none)* | **MISSING** |
| 2 | `GET /api/projects/workspace/:workspaceId` | `GET /api/projects/workspace/:workspaceId` | **MATCH** |
| 3 | `GET /api/history/projects/:projectId` | `GET /api/history/projects/:projectId` | **MATCH** (path/method align; see Step 3 for shape break) |
| 4 | `GET /api/insights/dashboard/:projectId` | *(none — no insights mount at all)* | **MISSING** |
| 5 | `POST /api/auth/login` | *(none — no auth route mount at all)* | **MISSING** |
| 6 | `POST /api/auth/signup` | *(none — no auth route mount at all)* | **MISSING** |

No MISMATCH cases were found — every frontend call either lands exactly on an existing route (rows 2, 3) or has no plausible near-match anywhere in the backend's route tree (rows 1, 4, 5, 6). Row 1 is not a trailing-segment typo: `workspaceRoutes` ([workspaces.ts](../pm-backend/backend/src/routes/workspaces.ts)) has no `/:workspaceId/members` sub-route, and `workspaceService.ts` has no members-listing function of any kind to call — `workspace_members` is only ever written to ([workspaceService.ts:31](../pm-backend/backend/src/services/workspaceService.ts#L31), [:78](../pm-backend/backend/src/services/workspaceService.ts#L78)), never read back as a list. There is nothing to redirect the frontend call to.

**Whose work each MISSING endpoint is:**

| # | Missing endpoint | Backend route owner | Frontend caller owner (per `git log`) |
|---|---|---|---|
| 1 | `/api/workspaces/:workspaceId/members` | Vismaya (`workspaces.ts`/`workspaceService.ts` — commit `5b40489`, author `Vis`) | Namana (`projectApi.ts`, `MembersPage.tsx` — commit `1f3d320`, "Fix workspace members and project API") |
| 4 | `/api/insights/dashboard/:projectId` | Purva (owns the insights subsystem; no route file exists yet) | Purva (`insightsApi.ts`, `InsightsPage.tsx` — commit `82cb3f3`) |
| 5, 6 | `/api/auth/login`, `/api/auth/signup` | Namana (auth is her subsystem; no `authRoutes.ts`/route mount exists in `app.ts` yet, only `middleware/auth.ts`'s `requireUser`, which checks headers, not credentials) | Namana (`LoginPage.tsx`/`SignupPage.tsx` — commits `3c13286`, `3f901bd`) |

Row 5/6 is notable: the same person (Namana) wrote both the caller and is responsible for the missing route — this is an in-progress feature on her side, not a cross-team contract break. Row 1 is a genuine cross-team gap: Namana's frontend code calls an endpoint that only Vismaya can add. Row 4 is Purva's own endpoint, not yet built on her own backend side.

---

## Step 3 — Response shape check

Only rows 2 and 3 reach a real backend handler, so only they can be shape-checked against an actual service return value.

### Row 2 — `getWorkspaceProjects` vs `listProjects`

Frontend `Project` ([projectApi.ts:67-70](src/lib/projectApi.ts#L67)):
```ts
interface Project { id: string; name: string; }
```

Backend `Project` ([../pm-backend/backend/src/types/database.ts:27-36](../pm-backend/backend/src/types/database.ts#L27)), returned as-is (raw Supabase row, `select("*")`) by `listProjects` ([projectService.ts:42-54](../pm-backend/backend/src/services/projectService.ts#L42)):
```ts
interface Project {
  id: string; name: string; description: string | null;
  workspace_id: string | null; created_by: string | null;
  created_at: string; deleted_at: string | null; is_deleted: boolean;
}
```
**No break.** The frontend type is a strict subset of the real fields; extra backend fields are simply not read. Safe.

### Row 3 — `getProjectHistory` vs backend `getProjectHistory` — **shape break**

Frontend expects `HistoryFeedEntry[]` ([projectApi.ts:72-81](src/lib/projectApi.ts#L72)):
```ts
interface HistoryFeedEntry {
  id: string; taskId: string; taskTitle: string | null;
  userId: string | null; userName: string | null;
  eventType: string; status: string | null; createdAt: string;
}
```

Backend actually returns raw `TaskHistory[]` rows ([../pm-backend/backend/src/types/database.ts:83-90](../pm-backend/backend/src/types/database.ts#L83)), unmodified (`select("*")`, no join) by `getProjectHistory` ([historyService.ts:26-46](../pm-backend/backend/src/services/historyService.ts#L26)):
```ts
interface TaskHistory {
  id: string; task_id: string; task_snapshot: Partial<Task> | null;
  user_id: string; event_type: string; created_at: string;
}
```

This is not a naming-convention gap fixable by a camelCase adapter alone. Concretely, at runtime:
- `entry.taskId` → `undefined` (real field is `task_id`)
- `entry.taskTitle` → `undefined` — **no field on the backend row supplies this at all.** It would have to be read out of `task_snapshot` (a `Partial<Task>` JSONB blob that may or may not contain `title` depending on what changed) or fetched via a second join the service does not perform.
- `entry.userId` → `undefined` (real field is `user_id`)
- `entry.userName` → `undefined` — **no field supplies this either.** `task_history` stores only `user_id`; resolving a name requires joining `app_user`, which `getProjectHistory` never does.
- `entry.eventType` → `undefined` (real field is `event_type`)
- `entry.status` → `undefined` — **no top-level `status` field exists.** The closest available data is buried inside `task_snapshot.status` (see `extractStatus()`, [historyService.ts:48-50](../pm-backend/backend/src/services/historyService.ts#L48)), which the route response never surfaces directly.
- `entry.createdAt` → `undefined` (real field is `created_at`)

`HistoryPage.tsx` ([HistoryPage.tsx:92-113](src/pages/HistoryPage/HistoryPage.tsx#L92)) renders `entry.userName ?? "Unknown user"`, `entry.taskTitle ?? "Unknown task"`, and calls `formatEvent(entry.eventType)` / `formatDate(entry.createdAt)` directly on these `undefined` values today. `userName`/`taskTitle` degrade silently to their fallback strings (harmless-looking, but wrong for every row); `formatEvent(undefined)` throws (`eventType.replaceAll` on `undefined`) and `formatDate(undefined)` renders `"Invalid Date"` — so in practice this page throws inside its `.map()` the first time it receives a real row, past the point where a path fix alone would make it "work."

Fixing this requires new work on the backend (a join in `getProjectHistory`, or the frontend doing a second round of lookups against `/api/tasks/:taskId` and `/api/workspaces/:workspaceId/members` per row) — not a one-line edit. Flagging it now per your Step 3 ask, not proposing the fix.

---

## Step 4 — Fixes, cheapest first

1. **`VITE_API_URL` vs `VITE_API_BASE_URL` env mismatch — cheapest, do first.**
   `src/lib/api.ts:1` and both `LoginPage.tsx:9-11` / `SignupPage.tsx:9-11` read `import.meta.env.VITE_API_URL`. Your actual `.env` ([`.env:1`](.env#L1)) defines `VITE_API_BASE_URL=http://localhost:3001`, not `VITE_API_URL` — `.env.example:1` repeats the same `VITE_API_URL` name, so the example itself is wrong too. `src/lib/projectApi.ts:4` and `src/lib/insightsApi.ts:40` correctly read `VITE_API_BASE_URL`. Net effect: login/signup currently fall through to the hardcoded `"http://localhost:3001"` default every time, which happens to match your local `.env` value today — so this is silently working by coincidence, not by correct wiring, and will break the moment `VITE_API_BASE_URL` is ever pointed somewhere else. This isn't a backend-route problem at all, but it's the cheapest possible fix and worth doing before anything else: either rename the two `LoginPage.tsx`/`SignupPage.tsx` reads (and `api.ts:1`) to `VITE_API_URL` → `VITE_API_BASE_URL`, or add `VITE_API_URL` alongside it in `.env`/`.env.example`. No backend change needed.

2. **`/api/workspaces/:workspaceId/members` — MISSING, needs Vismaya.**
   Not fixable from the frontend. Needs a new route + service function on the backend (list `workspace_members` joined to `app_user`, matching the `BackendMember` shape `projectApi.ts:56-65` already expects — that shape looks like it was written *against* an intended response, so the contract may already be agreed; just not built). Until it exists, `MembersPage.tsx` will always show its error state.

3. **`/api/auth/login`, `/api/auth/signup` — MISSING, in progress, same owner as the caller.**
   Not fixable from the frontend either. Namana owns both sides; this is presumably mid-build rather than a cross-team miscommunication. Lower urgency than #2 for a status report since no other team member is blocked on it.

4. **`/api/insights/dashboard/:projectId` — MISSING, Purva's own endpoint.**
   Same situation as #3: caller and missing route are both Purva's. Not actionable from this side.

5. **History shape break — most expensive, do last, and not a path fix.**
   `getProjectHistory`'s response needs `task_id`→`taskId` /`event_type`→`eventType`/`user_id`→`userId`/`created_at`→`createdAt` renaming *at minimum*, plus two genuinely new pieces of data (`taskTitle`, `userName`) that require a join neither `historyService.ts` nor any other current endpoint provides in one call, plus a `status` field that only exists buried in `task_snapshot`. This likely needs a conversation with Vismaya about whether the join belongs in `getProjectHistory` itself or whether `HistoryPage.tsx` should instead do client-side lookups against already-existing endpoints (`/api/tasks/:taskId`, and endpoint #2 above once it exists) to assemble the same fields. Either way it's a multi-file, cross-repo change, not a one-line correction — listed last because it's the only item that isn't a quick edit even in principle.

No MISMATCH-category findings (row-for-row exact edits) exist in this audit — every broken path is either an exact match with a shape problem (item 5) or has no backend counterpart to point at at all (items 2–4).
