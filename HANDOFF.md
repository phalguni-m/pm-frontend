# HANDOFF — Softdeck frontend

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

Built in ordered blocks (0 through 9 so far), each gated on `npx tsc --noEmit`
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
- **`ProjectsPage`** — searchable three-level tree table (project → section →
  task) matching HOME's row-3 spec: Project/Sections/Open/Waiting/Blocked/
  Overdue/Team/Progress columns, expand-in-place nesting.
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
  actually persist now — see "The store" below.
- `/kitchen-sink` — a temporary two-theme-pane QA route exercising every
  primitive in every state (rest/hover/disabled/error/loading/empty). Still
  routed; **not** meant to ship. Remove once every primitive has a real page
  consumer, or once you're confident it's no longer needed for review.

**Still placeholder shells** (render only a `PageHeader` title, nothing else):
`HomePage`, `MyTasksPage`, `GraphPage`, `MembersPage`, `HistoryPage`,
`SettingsPage`. All are routed and reachable; none have real content yet.
`HomePage` is the remaining page SPEC describes in the most detail (stat
cards, Attention card, Progress card, Gantt-style Timeline, projects table)
and is probably the highest-value next target.

## Architaecture rules actually being followed

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
    all descendants** via a `parentTaskId` BFS — chosen deliberately over
    leaving subtasks orphaned-but-alive, since subtasks are only ever
    reachable as children resolved off their parent row; an orphan would be
    invisible in the UI while still counting toward totals), `ADD_COMMENT`
    (`crypto.randomUUID()` id, `new Date().toISOString()` timestamp,
    `CURRENT_USER_ID` from `src/lib/constants.ts` as author).
  - `TasksContext.tsx` — provider mounted in `App.tsx`, above `BrowserRouter`.
  - `selectors.ts` — `useTask`/`useSection`/`useProject`/`useProjectsIndex`/
    `useComments`/`useTasksByIds`, all consumed at the page level. Every one
    filters `isDeleted` before returning anything (a deleted task resolves to
    `undefined`, not a task carrying `isDeleted: true` — this is what closes
    a `TaskPanel` left pointing at a `?task=` id that no longer resolves).
    `refreshRef()` re-hydrates every `TaskRef` inside `dependsOn`/`blocks`/
    `subtasks` against live `tasksById` on every read, so a status/title edit
    or a delete propagates to every place a ref to that task appears —
    consumers (`TaskPanel`'s dependency strip/Blocked-by/Blocking lists,
    SectionPage's Deps column) additionally filter `!ref.isDeleted` before
    counting or rendering, since a refreshed-but-deleted ref still exists in
    the array, it just carries the flag.
  - **Wired**: task edit (`UPDATE_TASK`), delete (`DELETE_TASK`, cascading),
    comment add (`ADD_COMMENT`). **Unwired**: task create, Table's
    drag-reorder — both intentionally deferred; see known gaps below. As a
    consequence, the store can currently only shrink (delete), never grow.
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
  to a plain `status: StatusType` field with an optional cause.
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

## Known gaps / things not yet decided

- **Task create and Table's drag-reorder are unwired.** The store (see
  above) only has actions for edit/delete/comment — as a result it can
  currently only shrink, never grow. Task create is the natural next block;
  drag-reorder needs a decision on what persists the new order (an `order`
  field on `TaskView`? array position in `tasksById`-adjacent state?) before
  it can wire up.
- **The ProjectsTable extraction proposed in Block 8.1 is still just a
  proposal.** `ProjectsPage`'s table and HOME's row-3 "Projects" card
  (SPEC.md:337-344) render the same shape — project → section → task tree,
  same eight columns — and were flagged as a good shared-component
  candidate rather than two parallel implementations once `HomePage` gets
  built. Doing that extraction would need `Card` to gain a header-actions
  slot (both call sites need their own header controls — search/filter/new
  task — that don't fit `Card`'s current `title`/`subtitle`/`onKebabClick`
  props). Not started.
- **`ProjectsPage` sits on the same column-width cliff as `ProjectPage`'s
  Sections table, but isn't currently falling off it.** Same eight-column
  shape, same subgrid/`width: "content"` mechanics, but it renders full-width
  (not squeezed into a `1fr` beside a fixed sidebar) so it has roughly 2-3×
  the room ProjectPage's Sections table had before Block 9.5. If columns are
  ever added here, or it ends up embedded somewhere narrower, revisit whether
  it needs the same treatment (flex floor is already shared via `Table`, but
  no layout restructuring has been applied).
- **The 899/900 breakpoint mismatch is still unfixed.** Most of the
  codebase's `≤900px` media queries use `max-width: 899px` (`AppShell`,
  `Breadcrumbs`, `Sidebar`, `TopBar`, `Button`, `CardGrid`, `DropdownPill`,
  `Menu`, `Table`, `TallyMeter`), but `Input`, `SearchField`, and `Textarea`
  use `max-width: 900px` — one pixel wider. At exactly 900px, inputs/search/
  textarea are in a different responsive state than the rest of the shell.
  Low-impact (900px is a narrow window to actually land on) but worth a
  find-and-replace pass to `899px` for consistency.
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

## Running it

```powershell
npm install
npm run dev        # http://localhost:5173 (or whatever port Vite picks)
npx tsc --noEmit    # type check
npm run build       # production build
```

No test suite exists yet. Gate for any change: `tsc --noEmit` clean + `build`
succeeds, checked in both themes where the change touches visuals.
