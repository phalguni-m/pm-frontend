# HANDOFF — PM frontend

Status snapshot for whoever (human or agent) picks this up next. This file
plus `docs/SPEC.md` are the contract; where they disagree, **SPEC.md wins**
(it's the measured design contract). This file is state, not spec — update it
as blocks land, don't treat it as authoritative over the code.

## What this is

A React + TypeScript rebuild of a project-management app (`Workspace →
Projects → Sections → Tasks → Subtasks`), styled per `docs/SPEC.md` — a
"soft dashboard" language (floating cards, generous radius, diffuse shadow,
icon tiles) with a strict greyscale palette. Signal colour (two hues total,
critical red + high orange) is restricted to seven specific cases; everything
else is tone, weight, or position. No component library, no CSS framework, no
state management library — CSS Modules + design tokens only.

Built in ordered blocks (0 through 11 so far), each gated on `npx tsc --noEmit`
and `npm run build` passing clean before moving on. No git repo exists in this
directory — nothing is committed anywhere; disk state is the only state.

## Where things stand

**Done and real** (not placeholders):
- Full design token system (`src/styles/tokens.css`) — light/dark, all spacing/
  radius/type/shadow/motion tokens, the five-step `--meter-*` tone ramp.
- ~35 primitives in `src/components/primitives/` — Card, Table (generic tree
  table with sort/drag/nesting/responsive card-collapse), Dialog, Popover,
  Menu, DropdownPill, Tabs, Button, Input/Textarea/Field/Checkbox,
  StripedBar/TallyMeter/DonutGlyph (data-viz glyphs), StatusPill/PriorityChip/
  RiskBadge/OverdueChip/WaitingIndicator (task-state glyphs), Avatar/
  AvatarGroup/ProjectMark, CardGrid/BottomSheet (responsive helpers), and more.
  Every one has `Component.tsx` + `Component.module.css` + `index.ts`.
- App chrome: `Sidebar`, `TopBar`, `AppShell`, `Breadcrumbs`, full responsive
  behaviour (drawer ≤900, stacked cards ≤640, tap-target growth, safe-area
  insets).
- `src/router.tsx` — every route wired, all reachable, sidebar reflects active
  route.
- **`SectionPage`** — header card, sortable task table (all 8 spec columns),
  URL-owned expand state (`?expanded=`), empty state.
- **`ProjectsPage`** — now a thin wrapper around `ProjectsTable` (see below).
- **`HomePage`** — Block 11 + Block 14. Row 1: `CardGrid` (Overall Tasks /
  Attention / Progress, per SPEC's three-up-collapsing-to-two-up layout).
  Row 2: **`TimelineCard`** (`src/components/project/TimelineCard`, Block
  14B, readability pass in Block 20) — closes the gap the Block 12
  JSX-comment placeholder left. Builds SPEC's full "GRAPH... HOME Row 2"
  Gantt spec: a static (non-scrolling/zooming) day/week axis with dashed
  verticals, one bar per scheduled task (start+due both set) with a 3px
  priority-accent left edge reusing `--signal-critical`/`--signal-high`
  (the same two tokens `PriorityChip` already uses — no new hue), a
  `ProjectMark` 16 + title + `AvatarGroup` 20, keyboard-focusable bars that
  open the task panel via the same `?task=` deep link every other page
  uses. Footer strip counts tasks with no start date rather than silently
  excluding them. Header controls (date range DropdownPill, Filter,
  +Schedule) were removed in Block 16 (dead affordances — see that entry
  below). Then `ProjectsTable` with `compact` search. See "The
  ProjectsTable extraction" and "TimelineCard readability (Block 20)"
  below.
- **`ProjectPage`** — header card, 4-up stat cards, the Sections table, and
  the Waiting/Handoffs/Context switching/Warnings intelligence cards. See
  "ProjectPage layout" below — this page's body layout deliberately deviates
  from SPEC's literal `1fr 360px` row.
- **`TaskPanel`** — the floating right-docked task detail panel, wired into
  SectionPage via `?task={id}` (deep-linkable, survives reload). Implements
  the waiting-state invariant end-to-end: delay-cause field appears the
  instant status becomes `waiting`, its menu auto-opens, Save is disabled
  until a cause is chosen — all driven by the `TaskState` discriminated union
  in `src/types/ui.ts`, not a manual runtime check. Edit/delete/comment
  actually persist now — see "The store" below. Its Subtasks section has a
  real "+ Add subtask" (Block 10) — SPEC names it but doesn't specify a
  wiring; the existing subtask row list was read-only until now.
- **`NewTaskDialog`** (`src/components/task/NewTaskDialog`) — Block 10.
  Reuses the `Dialog` primitive (SPEC doesn't specify the create interaction,
  and Dialog is already the pattern for Members' "+ Invite"). One component,
  parameterized by `projectId`/`sectionId`/`parentTaskId`, used both by
  SectionPage's "New task" button (parent null) and TaskPanel's "+ Add
  subtask" (parent = the open task). Title/Description/Priority/Start/Due/
  Assignees fields; Title required, everything else optional with defaults
  (`DEFAULT_PRIORITY`, empty dates, no assignees). No status field — see the
  store's `CREATE_TASK` entry above for why.
- `/kitchen-sink` — a temporary two-theme-pane QA route exercising every
  primitive in every state (rest/hover/disabled/error/loading/empty). Still
  routed; **not** meant to ship. Remove once every primitive has a real page
  consumer, or once you're confident it's no longer needed for review.
- **`GraphPage`** — Block 12. Dependency graph layer + visualization,
  project-scoped (`/projects/:projectId/graph`). `src/lib/graph.ts` is the
  pure layer: `buildGraph` → `detectCycles` (iterative Tarjan SCC) →
  `layerNodes` (Kahn topological layering; cycle members go into one
  synthetic trailing layer, alphabetical order — see the function's own
  doc comment) → `orderWithinLayers` (barycenter heuristic, 4 fixed
  iterations) → `computeGraphLayout`, the single composed export the page
  calls. Total and deterministic by construction: dangling task-id
  references and self-edges are dropped/contained rather than thrown on.
  `src/fixtures/dependencies.ts` is a flat `TaskDep[]` (verbatim backend
  shape, not a camelCase reshaping) seeded for a linear chain, fan-out,
  fan-in, a diamond, an isolated node, and two disconnected components —
  deliberately no cycle (the server rejects those at write time), but a
  cycle is exercised in the kitchen sink instead. `src/components/graph/`
  (`DependencyGraph`, `GraphNode`, `GraphEdge`) owns pan/zoom + SVG
  rendering and knows nothing about routing, same rule as `Table`/
  `ProjectsTable`. Back-edges render as a dashed, reverse-curving stroke on
  the existing neutral `--border-strong` token rather than a new signal
  color — SPEC restricts red/orange to seven named cases and a cycle isn't
  one of them. Below `--bp-tablet` (900px) the canvas is replaced by a
  grouped blocking/blocked-by list, CSS-toggled the same dual-render way
  Table switches to its card view.
- **Critical Path (CPM) + Critical Path Mode** — Block 13. `src/lib/
  criticalPath.ts`'s `computeCriticalPath(layout, tasks)` runs real CPM
  (forward pass then backward pass) over the *whole* project graph, not a
  single-target longest chain — reuses `GraphLayout.nodes[].layer` for
  processing order rather than re-running a topo sort. Duration per task is
  `dueDate - startDate` in days, floored at 1; tasks missing either date
  fall back to `DEFAULT_DURATION_DAYS = 1` with `isEstimatedDuration: true`
  set so the UI can mark it "(est.)" rather than silently blending a
  fabricated duration in with real ones. Cycles make CPM undefined:
  `GraphLayout` now also carries `cycles: string[][]` (computed in Block 12
  but previously discarded), and when non-empty `computeCriticalPath`
  returns a `degraded: true` result instead of computing wrong numbers.
  Disconnected components and tied parallel critical chains are both
  handled — see the function's own doc comment for how. **Critical Path
  Mode** is a toggle on `GraphPage`, state owned in the URL (`?cpm=1`,
  consistent with `?task=`/`?expanded=` elsewhere) rather than local state,
  so it survives reload and is shareable. Per SPEC's own "GRAPH — dependency
  DAG" section, on-path nodes/edges get `--signal-critical` (2px border /
  2.5px stroke) and everything else drops to `opacity: 0.35` — this is the
  existing critical-signal token's documented seventh use case, not a new
  hue. Per-node slack renders in `--font-mono`. The <900px list fallback
  from Block 12 also honours the mode (slack + critical marker per row,
  same URL state). When degraded, the toggle shows an inline explanation
  instead of dimming/emphasizing anything. `types/ui.ts`'s pre-backend
  `GraphNode`/`GraphEdge`/`DependencyGraph` interfaces (colliding names with
  Block 12's real component/lib types, never referenced outside that file)
  were deleted rather than reconciled.
- **Section creation is real (Block 16C).** `TasksState` gained a
  `sectionsById: Record<string, SectionRecord>` slice (`SectionRecord` =
  `SectionView` minus `tasks`, which stays live-derived exactly like a
  task's `subtasks`) — sections used to be read straight off the static
  `PROJECTS` fixture with no reducer state at all. New `CREATE_SECTION`
  action, appended at `max(sibling positions) + 1` (same convention
  `CREATE_TASK` already used for tasks). `useSection`/`useProject`/
  `useProjectsIndex` (`selectors.ts`) all now read section identity from
  live `sectionsById` via a new `liveSectionsOf` helper instead of the
  static `SECTION_BY_ID`/`project.sections` — a section created this
  session appears immediately in `ProjectPage`'s table, the sidebar's
  project nav group, and everywhere else sections render, the same way a
  task created via `CREATE_TASK` already did. `ProjectPage`'s "Section"
  header button and "Add section" footer link both open
  `NewSectionDialog` (`src/components/project/NewSectionDialog`, a
  title-only variant of `NewTaskDialog`'s exact pattern — `Dialog` + `Field`
  + `Input`, no new dialog pattern introduced).
- **Fake affordances removed (Block 16A/16B).** Per an explicit rule for
  that block — remove non-functional controls rather than disable them,
  since a disabled control still occupies space and a removed one doesn't:
  the Sidebar workspace-switcher button (its `aria-label` asserted a
  switching action that didn't exist — replaced with a non-interactive
  `<div>` showing the same avatar + workspace name, not focusable, not
  announced as a control), the Sidebar's decorative `SearchField` (no
  `value`/`onChange`, never filtered anything), `TopBar`'s mobile Search
  and New-task icon buttons (`onSearch`/`onCompose` were never passed by
  `AppShell`, the only mount point — both props deleted from `TopBarProps`
  entirely, confirmed by grep that nothing else referenced them), the
  Filter button on `SectionPage`, the Filter button in `ProjectsTable`
  (affects `ProjectsPage` and `HomePage`), `ProjectPage`'s "Members" header
  button (`MembersPage` is explicitly out of scope per `docs/archive/
  SCOPE.md`), and `TimelineCard`'s date-range pill/Filter/Schedule header
  controls. **Not removed, still worth a look:** the Sidebar's
  account-options button at the bottom (same `aria-label`-promises-an-
  action pattern as the workspace switcher, but it wasn't in the Block 15C
  inventory this block's scope was pinned to) and `ProjectPage`/
  `TimelineCard`'s remaining inert footer/"View all" links (also out of
  the 15C list).

- **`MyTasksPage` is real (Block 17)** — the only cross-project view in the
  app: every task assigned to `CURRENT_USER_ID`, flat, across every
  project. New selector `useMyTasks(userId): MyTaskRow[]`
  (`src/store/selectors.ts`) reads `state.tasksById` directly rather than
  through `useProjectsIndex()`, specifically because a **subtask** carries
  its own independent `assignees` too and both top-level tasks and
  subtasks live flat in the same `tasksById` map — filtering there in one
  pass catches both without a second per-task subtask fetch.
  `MyTaskRow = { task: TaskView; projectId; projectName; sectionId:
  string | null; sectionName: string | null }`, sorted by `dueDate`
  ascending with undated tasks last (ties broken by id). `Table` needed
  **no fork and no additive change** — it's already fully generic
  (`TableColumn<T>.render(row: T)`), so a `MyTaskRow` is just another row
  shape, the same way `SectionPage` already passes it `TaskView` rows.
  Confirmed by grep that `Table`/`TableRow`/`TableCardView` import nothing
  from `react-router-dom` — `MyTasksPage` owns navigation itself
  (`handleRowActivate` → `?task=` deep link to the task's section page,
  same pattern `GraphPage`/`HomePage` already use), falling back to the
  bare project page if a row's `sectionId` doesn't resolve (defensive —
  shouldn't happen with live `sectionsById`, but doesn't crash if it did).
  Due-date overdue treatment (`--signal-critical-text` + `OverdueChip`) is
  copied verbatim from `SectionPage`'s Due column, not reinvented. No new
  signal color, no new primitive, no filter/sort controls — read-only, per
  the block's explicit scope.
- **`StripedBar` redesigned + a real bug fixed (Block 18).** The "In
  progress" legend swatch used to render as nothing. Root cause: every
  status's hatch pattern is defined once and referenced everywhere via
  `url(#patternId)`; `in_progress` was the *only* status whose pattern
  painted color through a single `<rect fill="var(--meter-1)">` with
  nothing layered on top — a bare `var(...)` string interpolated into a
  JSX-authored SVG presentation attribute, inside a `<pattern>` only
  reachable through an indirect `url()` fill reference. That's the one
  place in this codebase where custom-property resolution isn't reliable
  (every other working SVG color — `DonutGlyph`, `StatusPill` — sets its
  `var()` directly on a rendered shape, not inside an indirectly-referenced
  pattern def). The other four statuses have the same exposure on their own
  `<rect>`, but each also draws a `<line>` hatch stroke on top, which still
  painted — masking the bug as "waiting looks faint" instead of "in_progress
  is invisible." **Fix:** every tone/stroke color moved out of inline SVG
  attributes into real CSS classes in `StripedBar.module.css`
  (`.toneInProgress`, `.strokeOnDark`, etc.), resolved through the normal
  cascade — removes the failure mode structurally for all five statuses,
  not just a patch for the one that happened to go fully invisible.
  **Separation:** the first pass used four hatch angles (0°/45°/−45°/90°)
  as the primary differentiator, but angle alone is fragile at a 14px bar
  height — a segment may render only 1–3 tile repeats, not enough signal to
  reliably perceive "angle" as a feature, and the two diagonals (45°/−45°)
  are mirror images, the single easiest pair to misread as "the same
  slanted texture" despite being 90° apart mathematically. Revised to
  differentiate by pattern **kind**, not angle: `in_progress` solid fill
  (no pattern) · `waiting` dashed horizontal line (broken vs. continuous is
  a shape distinction, legible at 1 repeat) · `blocked` solid diagonal, 45°
  (the only diagonal left in the set, no mirror partner) · `to_do` dot grid
  (dots vs. lines is the strongest possible structural distinction) ·
  `done` solid vertical, widest pitch (quietest, correctly recedes for
  completed work). `HatchDef` takes a `PatternSpec` discriminated union
  (`"dash" | "diagonal" | "dot" | "vertical"`) instead of a single
  angle/size pair. Also added a uniform 1px `--border` stroke on every bar
  segment and every legend swatch, so adjacent same-brightness greys get a
  hard edge even where the pattern alone would read as ambiguous — bar
  segment and legend swatch for a given status share the identical
  `HatchDef`, so the legend actually teaches the bar. **Minimum segment
  width:** a segment below `MIN_SEGMENT_WIDTH` (4px) is raised to that
  floor (percentage points borrowed from the largest segment, so the bar
  still exactly fills its container) — a 1-task-of-200 segment no longer
  rounds to invisible. One consistent `MIN_HATCHED_WIDTH` (8px) cutoff
  still governs hatch-vs-flat-fallback for *all* statuses uniformly, even
  ones whose specific pitch would technically still tile below that width —
  simpler to reason about than a per-status threshold. **Motion:** segments
  render at `width: 0` for one frame on mount then flip to their real
  percentage, and `.segment` carries a plain CSS `transition: width`
  (`--dur-slow`/`--ease`) — smooths both the mount-in and any live count
  change (the store is live, so a count change is just a re-render at a new
  width) via the same mechanism, no separate code path. No JS animation
  loop; `prefers-reduced-motion` is already handled by `global.css`'s
  blanket rule collapsing all `transition-duration`s to ~0, so no
  additional media query was needed. `StripedBarProps` is unchanged
  (`segments`, `showLegend`) — all three real consumers (`HomePage`,
  `ProjectPage`, `KitchenSinkPage`) needed zero changes.

## Auth + Insights route seams (Block 19) — unowned, mount points only

`/login`, `/signup`, and `/projects/:projectId/insights` exist and are
routed, but **own no logic** — no form fields, no validation, no session
state, no token storage, no route guarding, no redirect-if-unauthenticated,
no data fetching, no charts. This block built the seams, not the features;
auth is Namana's to build, insights is Purva's.

- **`AuthLayout`** (`src/components/layout/AuthLayout`) — the only layout
  branch in the app besides `AppShell`. Centers its `<Outlet />` on the
  plain `--bg-canvas` background, full viewport height. No sidebar, no
  topbar, no breadcrumbs, no skip-link (nothing to skip to), no props (no
  workspace/user data to thread through, unlike `AppShell`).
- **`router.tsx`** — `<Route element={<AuthLayout />}>` is a sibling to the
  existing `<Route element={<AppShell ...>}>` branch, wrapping `/login` and
  `/signup`. `AppShell`'s branch (including its `*` catch-all) is untouched;
  React Router resolves `/login`/`/signup` against the more specific
  `AuthLayout` branch before the shell's wildcard is ever reached.
  `/projects/:projectId/insights` is a plain sibling route *inside* the
  existing `AppShell` branch, right next to `/projects/:projectId/graph` —
  no new layout branch needed there, since Insights is meant to render with
  the normal sidebar/topbar chrome.
- **`LoginPage`/`SignupPage`/`InsightsPage`** — all three are stubs matching
  `MembersPage`/`HistoryPage`'s exact pattern (`PageHeader` + a comment
  naming the owner and the backing endpoint(s)). **Mounting real content
  requires editing only the one page file** — `LoginPage.tsx`,
  `SignupPage.tsx`, or `InsightsPage.tsx` — the route (and, for auth, the
  layout) need no changes to go from stub to real.
- **Backing endpoints** documented in `docs/API_CONTRACT.md`'s "Auth" and
  "Insights" sections: `POST /api/auth/login` / `POST /api/auth/signup`
  (both public), and the five project-scoped `GET /api/insights/*`
  endpoints (`dashboard`, `risk`, `handoffs`, `context-switching`,
  `waiting-time` — all require project viewer access), pulled from
  `INTEGRATION_AUDIT.md` §4/§6/§7 (request/response shapes, Bearer-token
  flow, the fact that there's no `/auth/refresh` or `/auth/me` endpoint,
  and that every insights endpoint recomputes live on each call rather than
  being cached).
- **Nothing links to any of the three routes yet, deliberately.** No "Log
  in" link in `Sidebar`/`TopBar` (there's no logout or auth state to react
  to), and no "Insights" nav item or project-page link either — adding one
  now, before the page has real content, would be exactly the kind of dead
  affordance Block 16 removed elsewhere. Confirmed by grep: `/login`,
  `/signup`, and `/insights` each appear only in `router.tsx`'s own route
  declarations and their stub page's own comment. **When `InsightsPage` is
  real, wiring a link is a one-line addition** — `Sidebar.tsx` already has
  the `NavItem`/project-nav-group pattern (see `ProjectNavGroup`'s section
  links) to copy for a per-project Insights entry, or a header button on
  `ProjectPage` next to the existing Members/Section-style actions.

**Still placeholder shells** (render only a `PageHeader` title, nothing else):
`MembersPage`, `HistoryPage`. Both routes are routed and reachable; neither
has real content yet. (`LoginPage`/`SignupPage`/`InsightsPage` are a
different category from these two — not placeholders-for-later-blocks, but
stubs explicitly owned by someone else; see the Auth + Insights route seams
section above.)

`SettingsPage` and its `/settings` route were removed outright rather than
left as a stub: `docs/archive/SCOPE.md` never mentioned Settings at all (not
in the 7 listed deliverables, not in "Explicitly not mine"), so unlike
Members/History it had no owner and no scope decision to honor.

## TimelineCard readability (Block 20)

The Gantt had no way to read a bar's horizontal position against anything —
no gridlines, no today marker, no row separation. Scale binding was checked
first (§20D): tick labels and bars already computed position from the exact
same formula (`dayOffset / range.totalDays`, same `range.rangeStart`/
`range.totalDays`) — not the bug, nothing to fix there.

- **Gridlines were already present but functionally invisible in both
  themes** — `.tickLine` used `border-left: 1px dashed var(--border-subtle)`.
  `--border-subtle` is a barely-there hairline meant for a line sitting
  flush against a card's own background (e.g. `Card`'s own header rule);
  it was never meant to carry visual weight as a plotted line across open
  body space, and reads as close to invisible against `--bg-card` in both
  light and dark. Fixed by switching to `--border` — the standard
  "structural but quiet" token this codebase already uses everywhere else
  a line needs to actually read. Still dashed, still full-height, still
  behind the bars.
- **Today marker** (`.todayLine`) — new. Solid (vs. the ordinary ticks'
  dashed treatment) at `--border-strong`, one token stronger again, so it
  outranks the gridlines without reaching for a signal color. Computed via
  the exact same `dayIndex()`/`range` scale as everything else. Renders
  only when today falls within `[rangeStart, rangeEnd]` — clamping an
  out-of-range today to the nearest edge would silently claim "today is
  here" when it isn't, so it's omitted entirely instead, same reasoning as
  `AbsentValue` elsewhere in this codebase (don't fabricate a fact the data
  doesn't support).
- **Row separation** — a hairline `border-bottom: 1px solid
  var(--border-subtle)` per row (`.barTrack`), not banding. Matches
  `Table`'s own row-divider precedent exactly (`--border-subtle` between
  rows, no zebra striping anywhere in this codebase) rather than
  introducing a heavier visual language for one card. Last row omits the
  border (`.barTrackLast`), same reasoning as `Table.module.css`'s
  `.rowLast`. `--border-subtle` is correct *here* (unlike the gridline
  case above) because a row divider sits immediately between two rows'
  own content, not across open plot space.
- Bar height (32px), the `ProjectMark`/title/`AvatarGroup` composition, the
  priority accent left-edge treatment, keyboard-focusable `<button>` bars,
  `?task=` activation, and the unscheduled-task footer count are all
  unchanged — this block only added structure behind/around the existing
  bars.

## Architecture rules actually being followed

- **Components take data as props, emit callbacks.** No fetching, no mutation
  logic inside any component. `TaskPanel`'s `onSave`/`onDelete`/
  `onAddComment` are real callback props; page-level handlers dispatch to the
  store (see below) — the store is only ever consumed at the page level via
  the selector hooks, never reached into from a component directly.
- **`src/fixtures/index.ts` is the single seam.** Every page reads through the
  store now (see below), which is itself seeded from this file — nothing
  reads fixtures directly except the store's own `init`. Swapping fixtures for
  a real API client is meant to be a change confined to this file plus
  whatever data-fetching replaces the store's seeding — no page or component
  should need to change.
- **The store (`src/store/`) is in-memory only, no persistence.** Added in
  Block 9. `useReducer` + Context, no external state library:
  - `tasksReducer.ts` — `TasksState = { tasksById: Record<string, TaskView>;
    commentsByTaskId: Record<string, Comment[]> }`, normalized by id (not
    nested), seeded from `TASKS`/`COMMENTS` via `initTasksState`. Action set:
    `UPDATE_TASK` (accepts a full `TaskPatch & { state: TaskState;
    assigneeIds: string[] }` — the reducer assigns `state` atomically as a
    whole union value and never decomposes it, preserving the waiting-state
    invariant), `DELETE_TASK` (soft-delete, `isDeleted: true`, **cascades to
    all descendants** via a `parentTaskId` BFS in `descendantIdsOf` — chosen
    deliberately over leaving subtasks orphaned-but-alive, since subtasks are
    only ever reachable as children resolved off their parent row; an orphan
    would be invisible in the UI while still counting toward totals. The BFS
    tracks a `visited` set so a self-referential or cyclic `parentTaskId`
    can't loop it forever — added in Block 9.8 after a Block 9.7 audit found
    it missing; latent today since fixture data has no cycles, but nothing
    yet prevents task-create from introducing one), `ADD_COMMENT`
    (`crypto.randomUUID()` id, `new Date().toISOString()` timestamp,
    `CURRENT_USER_ID` from `src/lib/constants.ts` as author), `CREATE_TASK`
    (Block 10 — accepts a `TaskDraft`, already defined in `src/types/ui.ts`
    since an earlier block and unused until now; builds a full `TaskView`
    with `crypto.randomUUID()` id, same minting convention as
    `ADD_COMMENT`). New tasks are always created `{ status: "to_do",
    delayCause: null, waitingSince: null }` — **deliberately, not a missing
    field.** A status picker at creation would have to reproduce the entire
    delay-cause-required-when-waiting flow TaskPanel already owns (auto-open
    menu, disabled Save, asterisk) a second time; simpler and safer to let
    creation produce only the one `TaskState` variant that never needs extra
    input, and route anyone who wants a different starting status through
    the existing, already-correct TaskPanel edit flow. If `parentTaskId` is
    set, the reducer refuses to create the subtask when the parent doesn't
    currently resolve to a live task — same bail pattern as `UPDATE_TASK`'s
    `if (!existing) return state`, guards a stale "+ Add subtask" click
    against a parent deleted elsewhere in the meantime. `position` is set to
    one past the current max among siblings — **nothing in the codebase
    currently reads `TaskView.position`** (checked: no selector, no page, no
    sort touches it), so this is purely so the field isn't silently garbage
    if drag-reorder ever starts reading it; a silently-unread field is worse
    than a documented one.
  - `TasksContext.tsx` — provider mounted in `App.tsx`, above `BrowserRouter`.
  - `selectors.ts` — `useTask`/`useSection`/`useProject`/`useProjectsIndex`/
    `useComments`/`useTasksByIds`, all consumed at the page level. Every one
    filters `isDeleted` before returning anything (a deleted task resolves to
    `undefined`, not a task carrying `isDeleted: true` — this is what closes
    a `TaskPanel` left pointing at a `?task=` id that no longer resolves).
    `refreshRef()` re-hydrates every `TaskRef` inside `dependsOn`/`blocks`
    against live `tasksById` on every read, so a status/title edit or a
    delete propagates to every place a ref to that task appears — consumers
    (`TaskPanel`'s dependency strip/Blocked-by/Blocking lists, SectionPage's
    Deps column) additionally filter `!ref.isDeleted` before counting or
    rendering, since a refreshed-but-deleted ref still exists in the array,
    it just carries the flag. **Section/subtask membership is live-derived
    from `tasksById`, not walked off the static fixture graph** — `Block 10`
    change. `SECTION_BY_ID[id].tasks` and a fixture task's `subtasks` array
    are both computed once, at fixture-load time, by filtering the original
    `TASKS` array (`src/fixtures/index.ts`, `src/fixtures/tasks.ts`); before
    this block, `liveTopLevelTasks`/`hydrateTask` only re-hydrated entries
    already in those static lists, so a brand-new task written into
    `tasksById` would exist in the store but be invisible everywhere — the
    exact "orphaned but alive" failure the Block 9 delete-cascade decision
    was chosen to avoid, showing up on the create side instead. Fixed by
    `liveChildrenOf`, which filters live `tasksById` directly by
    `sectionId`/`parentTaskId` instead of walking a frozen list — this is
    what actually makes "the store can grow" true, not the create dialog.
  - **Wired**: task edit (`UPDATE_TASK`), delete (`DELETE_TASK`, cascading),
    comment add (`ADD_COMMENT`), task create (`CREATE_TASK`, Block 10) via
    SectionPage's "New task" button and TaskPanel's "+ Add subtask." **Still
    unwired**: Table's drag-reorder (needs an ordering decision — see known
    gaps) and ProjectsPage's "New task" button (see known gaps — it has no
    section context to create into).
  - **State resets on reload by design.** No `localStorage`, no backend —
    this is explicitly in scope only as far as "make existing write paths
    persist in-session," not across reloads.
- **`src/types/database.ts` is untouched, backend-owned.** Don't edit it.
  `src/types/ui.ts` is the UI-facing prop-contract layer built on top of it,
  and documents three unconfirmed backend assumptions in its header comment
  (delay causes as a lookup table, task intelligence as a separate analysis
  endpoint, comments having no real table yet).
- **The waiting-state invariant is structural, not conventional.** `TaskState`
  in `src/types/ui.ts` is a discriminated union — `{ status: 'waiting' }`
  without a `delayCause` literally does not typecheck. Any future code that
  touches task status should preserve this union rather than loosening it
  to a plain `status: StatusType` field with an optional cause. `TaskPanel`'s
  Status dropdown clears the drafted delay cause whenever draft status moves
  away from `"waiting"` (`onSelect` handler on the Status field) — without
  this, switching away from waiting and back within one open session would
  silently reuse the previous cause instead of re-prompting, since the
  auto-open-menu and required-field asterisk only fire when the drafted cause
  is `null`. Found in the Block 9.7 audit, fixed in 9.8. This never let an
  actual invalid state get saved (`canSave`'s check already made that
  structurally impossible) — it was a UX gap, a stale-but-valid cause being
  silently reused rather than reconfirmed.
- **Responsive breakpoints are CSS-driven, not JS `matchMedia`.** Wherever a
  component's DOM structure genuinely differs by breakpoint (Table's grid vs.
  stacked-card view, the sidebar's panel vs. drawer, TallyMeter/AvatarGroup's
  bar/avatar counts), the pattern is: mount multiple variants, let CSS media
  queries pick which one is visible. This was a deliberate choice made partway
  through and applied consistently after — don't introduce a `matchMedia`
  listener without a good reason to break the pattern.
- **Tap targets ≥44px via padding/pseudo-element insets, not visual inflation.**
  Small controls (Table's chevron/drag-handle, Card's kebab, Dialog's close)
  grow their *hit area* through an absolutely-positioned `::before` with
  negative inset, confined to `≤900px` media queries so desktop stays visually
  compact. Follow this pattern for new small controls rather than bumping
  `min-height` unconditionally (that was tried and reverted — it visually
  inflated desktop controls that didn't need it).
- **`Table` uses CSS Grid `subgrid` for column alignment, not flex.** Landed
  in Block 9.3 after two earlier attempts (9.1, 9.2) didn't hold — flex gives
  every row its own independently-computed widths, and even a shared
  `grid-template-columns` string on independent grid containers resolves
  intrinsic tracks (`max-content`) per-container, so rows still don't agree
  with each other or the header. The fix: `.gridView` (in
  `Table.module.css`) is the one real grid container and owns the actual
  track definitions; `.headerRow` and every `.row` (including nested ones)
  are `display: grid; grid-template-columns: subgrid; grid-column: 1 / -1`
  items that inherit those resolved tracks instead of computing their own.
  Requires `.body` to be `display: contents` (it carries no visual styling of
  its own) so nothing breaks the subgrid inheritance chain between `.gridView`
  and each row. `TableColumn.width?: "flex" | "content"` picks the column's
  track function — `"content"` (`minmax(min-content, max-content)`) for
  glyph/count columns, `"flex"` (`minmax(160px, 1fr)`, the default) for the
  one column that should dominate (Task/Section/Project). The 160px floor
  exists so a run of wordy content-column headers can't squeeze the flex
  column to a single character. `.gridView` also has `overflow-x: auto` —
  when a table's columns genuinely don't fit their slot (see ProjectPage's
  Sections table below), it scrolls horizontally rather than the Card's
  `overflow: hidden` (there for corner-radius clipping) silently cutting
  columns off. That scroll only applies ≥640px — below that, `.gridView`
  switches to `display: none` in favour of the stacked-card view, so SPEC's
  "never a horizontally scrolling table" ≤640 rule holds structurally, not
  just by convention. Subgrid needs Chrome/Edge 117+, Firefox 71+, Safari
  16+ — no older target exists anywhere else in this codebase.
- **`ProjectPage`'s body layout applies SPEC's ≤1280 breakpoint at every
  width, not just ≤1280 — and takes intelligence cards to 4-up, past what
  SPEC states.** SPEC.md:466-467 already specifies that at ≤1280 "the project
  page's `1fr 360px` stacks, intelligence cards becoming a two-up grid" — the
  Sections table is SPEC-mandated at eight columns (`Section · Total · In
  progress · Waiting · Blocked · Done · High risk · Progress`), and those
  eight don't comfortably fit the `1fr` side of that split even at ordinary
  desktop widths, so this makes the collapsed (stacked) layout the default at
  every width rather than a narrow-viewport fallback. That part is raising an
  existing threshold, not a SPEC deviation. The 4-up intelligence-card grid at
  desktop **is** a deviation — SPEC's own ≤1280 text says two-up, not four —
  done deliberately per product direction in Block 9.5, not a misreading.
  Reflow still goes 4-up → 2-up (≤1279) → 1-up (≤899), reusing the two
  breakpoints that already existed here.
- **`Card` gained an `actions?: ReactNode` prop (Block 11), purely additive.**
  Renders in the header row after title/subtitle and before the kebab, so
  both can coexist (checked: `onKebabClick` is passed by zero consumers
  today, in the app or kitchen-sink, so there was nothing to conflict with —
  but the two are independent regardless). `hasHeader`'s condition is
  unchanged (`icon !== undefined || title !== undefined`); every existing
  consumer that passes neither `actions` nor a title/icon renders exactly as
  before. This is what let SectionPage/ProjectsPage's hand-rolled "manual
  header row as Card's children" pattern (still visible in `SectionPage.tsx`
  and `ProjectPage.tsx`'s stat/intelligence cards) collapse into `Card`'s own
  header for `ProjectsTable` — a header-only card that needs search/filter/
  new-task controls now uses `title`+`actions`+`flush` with `{null}` as
  children, rather than stuffing a hand-built row into the body.
- **The ProjectsTable extraction (Block 8.1 → done in Block 11).**
  `src/components/project/ProjectsTable/` — one component, both consumers
  (`ProjectsPage`, `HomePage`'s row 3). Props: `title`/`subtitle` (still
  page-owned copy), `compact?: boolean` (SearchField width — SPEC says
  HOME's is "compact" without a value, and neither an existing token nor a
  `SearchField` size prop covers this, so both widths live together as two
  CSS classes in `ProjectsTable.module.css` with a comment, per an explicit
  instruction not to hardcode them separately), `onNewTask?: () => void`
  (both call sites currently omit it — button renders, stays inert, same as
  before), and **`onRowActivate: (row) => void`, required.** `ProjectsTable`
  does not call `useNavigate` or know about routes — row activation is
  navigation, a page concern, same reasoning as `Table` not knowing about
  routing. Both `ProjectsPage.tsx` and `HomePage.tsx` define their own
  `handleActivate` and pass it in. `ProjectsPage.tsx` itself is now a ~15-line
  wrapper.

## Known gaps / things not yet decided

- **Task drag-reorder is wired at `SectionPage` only (Block 14D); `ProjectsTable`
  is deliberately still unwired.** `tasksReducer.ts`'s new `REORDER_TASK`
  action swaps `position` between a task and the sibling it passes —
  siblings are same `sectionId` + same `parentTaskId`, live, sorted by
  current `position` (ties broken by id), which is what structurally
  prevents a subtask from being dragged out of its parent: the swap partner
  can only ever come from that exact group. `SectionPage`'s task table now
  sorts by `position` ascending under the "Default" sort option (previously
  plain array order — `position` existed but nothing read it) and passes
  `draggable`/`onReorder` to `Table` **only when `sortId === "default"`** —
  dragging under an active Priority/Status/Due sort would swap `position`
  while the visible order stays sort-derived, silently misrepresenting what
  the drag did. `Table`'s existing grip-handle + `ArrowUp`/`ArrowDown`
  keyboard machinery (built earlier, previously exercised only in
  `/kitchen-sink`) now has a real call site. **`TableCardView`** (the ≤640px
  stacked-card fallback) previously had zero reorder affordance at all, not
  even a button — Block 14D added a small up/down chevron-pair control
  there too (`draggable`/`onReorder` props, same contract), since drag-only
  or desktop-only reorder isn't acceptable per the block's own requirement.
  **`ProjectsTable` reorder was explicitly scoped out**: it renders one
  `Table` instance mixing project/section/task rows, and `Table.draggable`
  is table-wide (every row gets a handle or none do) — there's no per-row
  override in `Table`'s API. Giving project/section rows a handle that
  no-ops on click/drag would be a fake affordance; building a per-row-kind
  `draggable` mechanism into `Table` itself is a real API change to a
  primitive several pages depend on, not something to bolt on under this
  block. Whoever picks this up next needs to either extend `Table` with a
  per-row draggable predicate, or give `ProjectsTable` its own row-kind-aware
  wrapper around the existing grip/keyboard pattern. **Section reorder is
  out of scope entirely, not just deferred**: `Section.position` exists in
  the schema, but there's no live store slice for sections today —
  `SectionView` is read from static fixtures merged with `tasksById` at
  request time, not its own reducer state. Making section reorder real needs
  a `sectionsById` slice mirroring `tasksById`'s shape (new `TasksState`
  field, `initTasksState` changes, `selectors.ts` hydration changes) before
  a `REORDER_SECTION` action has anything to write to — meaningfully bigger
  than this block's task-reorder wiring, and only `ProjectsTable`'s section
  rows would use it today.
- **ProjectsPage's "New task" button is still visual-only, deliberately.**
  Decided in Block 10: unlike SectionPage (unambiguous section context) and
  TaskPanel's "+ Add subtask" (unambiguous parent), ProjectsPage spans every
  project in one flat/tree table with no section — or even project — context
  at creation time. Wiring it needs a project+section picker bolted onto the
  same form, which is meaningfully more surface than the other two entry
  points for one button. Deliberately deferred rather than rushed in
  alongside the two clean cases; worth a dedicated pass with its own UI
  decision, not a checkbox on a future block.
- **"View all tasks →" (Overall Tasks card) and Attention/Progress's "View
  all" footer links all point at `/my-tasks`.** SPEC doesn't name a target
  for any of them — `/my-tasks` is the only tasks-listing route that exists,
  so it's a judgement call, not a spec-confirmed destination. Revisit if
  `MyTasksPage` ends up scoped differently than "all tasks" once it's built.
- **HomePage's "On-time delivery" TallyMeter renders `AbsentValue` (`—`)
  instead of a real percentage — blocked on backend data, not an oversight.**
  SPEC asks for it but `TaskView` has no completion-date field, only
  `updatedAt` (changes on any edit, not just a move to Done) and `dueDate` —
  there's no honest way to compute "delivered on time" from what exists
  today. Same reasoning kept both TallyMeters' DeltaChip omitted (no
  historical/previous-period snapshot anywhere in fixtures to diff against),
  consistent with the same call already made on `ProjectPage`'s stat cards
  in Block 8. Revisit once a real completion timestamp exists.
- **`ProjectsPage` sits on the same column-width cliff as `ProjectPage`'s
  Sections table, but isn't currently falling off it.** Same eight-column
  shape, same subgrid/`width: "content"` mechanics, but it renders full-width
  (not squeezed into a `1fr` beside a fixed sidebar) so it has roughly 2-3×
  the room ProjectPage's Sections table had before Block 9.5. If columns are
  ever added here, or it ends up embedded somewhere narrower, revisit whether
  it needs the same treatment (flex floor is already shared via `Table`, but
  no layout restructuring has been applied).
- **The 899/900 breakpoint mismatch is fixed (Block 14C).** `Input`,
  `Textarea`, `SearchField` used `max-width: 900px` where every other
  tablet-tier rule in the codebase (~14 files) uses `max-width: 899px`
  (paired with the `--bp-tablet: 900px` token, standard "N−1" `max-width`
  convention — confirmed the 380/379 and 1280/1279 tiers already followed
  this correctly, so 900/899 was the only actual drift, not a wider
  pattern). All three now use `899px`; at exactly a 900px-wide viewport
  their mobile font-size bump (16px, defeats iOS zoom) now fires in the same
  breakpoint step as the rest of the shell's tablet-tier switch instead of
  one pixel late. `src/lib/layout.ts`'s `BREAKPOINT_MOBILE/TABLET/DESKTOP`
  constants were confirmed unused by any runtime logic (no `matchMedia`
  call referenced them) and **deleted in Block 15D** — they were a second,
  unread source of truth alongside `tokens.css`'s `--bp-*` custom
  properties (the ones that actually drive every media query in the
  codebase) and would have misled the next person to touch a breakpoint
  into editing the wrong place. `SIDEBAR_WIDTH`/`TASK_PANEL_WIDTH` in the
  same file were untouched — out of this cleanup's stated scope.
- **Delete is a cascading soft-delete, chosen in Block 9.** Deleting a task
  sets `isDeleted: true` on it *and* every descendant reachable through
  `parentTaskId` (a BFS in `tasksReducer.ts`), not just the task itself.
  This was a deliberate choice among three options (cascade / re-parent
  orphans to top-level / leave orphans invisible-but-counted) — cascade was
  picked because subtasks are only ever reachable as children resolved off
  their parent row in the UI, so anything short of cascading would leave a
  subtask "alive" in the store (still counted in every derived total) while
  being permanently unreachable in the UI once its parent disappears from
  the list. If a future block wants "undo delete" or an audit trail of
  what got removed, the cascade's id list isn't currently recorded anywhere
  beyond the single dispatch — that history is lost immediately.
- **`Table`'s ≤640px breakpoint is a viewport media query, not a container
  query.** This was a deliberate call to stay consistent with the rest of the
  shell's viewport-based breakpoints, but it means a `Table` embedded in a
  genuinely narrow *container* (not narrow viewport) won't collapse to cards.
  Flagged during Block 6 as worth reconsidering if that scenario comes up.
- **DropdownPill/Popover gained controlled `isOpen`/`onOpenChange` props**
  in Block 7 specifically to support TaskPanel's auto-opening delay-cause
  menu. Both still default to uncontrolled (internal `useDisclosure`) if you
  don't pass them.
- **No filter logic anywhere yet.** SectionPage's `Filter` button and the
  `BottomSheet` primitive are visual/structural only — no filtering is wired.
- **`riskTierOf()` in `lib/format.ts`** buckets a 0–100 `riskScore` into R1–R5
  via `Math.ceil(score/20)`. This is an invented mapping (the backend doesn't
  define risk tiers) — revisit if real risk-scoring semantics ever surface.
- **Comments fixture (`src/fixtures/comments.ts`) is new and thin** — 3
  comments across 2 tasks, just enough to exercise the TaskPanel Comments tab
  states. Expand if a page needs richer comment data.
- **Fixture task dates are now stable across real-world time (Block 14A).**
  `src/fixtures/tasks.ts`'s `daysFromNow(n)` made `dueDate` slide with "today"
  but every task's `startDate` was a fixed calendar literal — so
  `dueDate - startDate` (every task's CPM duration) grew by one day per
  real-world day, meaning slack values, the critical set, and even which
  chain was critical drifted day to day for identical code. Every
  non-`null` `startDate` is now also `daysFromNow(n - durationDays)`, where
  `durationDays` is that task's original literal-to-anchor gap, computed
  once and hardcoded as an offset (see each seed's inline comment, e.g.
  `daysFromNow(-75) // 30-day duration, preserved`) — both dates now move
  together, so durations (and therefore every derived overdue/on-time
  status, since only `dueDate`'s own offset determines that, untouched by
  this change) stay exactly what they were. Tasks with `startDate: null`
  were left `null` — `DEFAULT_DURATION_DAYS` in `criticalPath.ts` still
  fires on exactly the same 7 tasks it did before.

## Running it

```powershell
npm install
npm run dev        # http://localhost:5173 (or whatever port Vite picks)
npx tsc --noEmit    # type check
npm run build       # production build
```

No test suite exists yet. Gate for any change: `tsc --noEmit` clean + `build`
succeeds, checked in both themes where the change touches visuals.
