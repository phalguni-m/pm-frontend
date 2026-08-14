# Scope

## Architectural rule

Components receive data as props and emit callbacks. No fetching, no
mutations, no business logic inside components. The UI is developed against
hardcoded fixtures in `src/fixtures/`; swapping them for a real API is
confined to `src/fixtures/index.ts`.

## My seven UI deliverables

1. Design system â tokens, theme provider, primitives (buttons, chips,
   inputs, avatars, dialogs, popovers).
2. Sidebar / navigation shell.
3. Project page â sections and dense task table.
4. Task detail panel (side dialog) â fields, assignees, dependencies,
   subtasks, comments.
5. Task history feed on the detail panel.
6. Dependency graph view with critical path highlighting.
7. Responsive behavior across desktop, tablet, and mobile breakpoints.

## Explicitly not mine

- Authentication and session handling.
- API client / data fetching layer.
- Data mutation logic (writes go through emitted callbacks only).
- Backend business logic (triage rules, critical path computation, risk
  scoring).
- Members page (workspace-wide member management).
- Project-wide History page (only the per-task history feed is in scope).

## Props-and-callbacks rule

Every component takes typed data (from `src/types/ui.ts`) as props and
communicates user intent upward via callback props (e.g. `onStatusChange`,
`onTaskSelect`). No component reads global state, fetches data, or performs a
mutation directly.

## Assumptions

Three unconfirmed backend API shapes are baked into `src/types/ui.ts`, each
marked in that file's header comment:

1. **DelayCause** â no `delay_causes` table exists in `database.ts` yet.
   Assumed to be a small lookup table of `{ id, name }` referenced by
   `Task.delay_cause_id`.
2. **TaskIntelligence** â risk/impact/critical-path scoring is assumed to
   come from a separate analysis endpoint (built on top of
   `CriticalPathResult` / `TaskImpact` / `StatusTimeline`) whose delivery
   shape is not yet confirmed. Modeled as optional (`intelligence?`) on
   `TaskView` so every component is forced to handle its absence.
3. **Comment** â no comments table exists in `database.ts` yet. Modeled as a
   forward-looking assumption so task detail UI has something to render
   against.

Additionally, `HistoryEntry.eventType` is typed as a bare `string` (not an
enum) because `TaskHistory.event_type` is unconfirmed on the backend. Known
values are tracked in `src/lib/constants.ts` (`KNOWN_EVENT_TYPES`); anything
outside that set falls through to a generic renderer rather than being
dropped or throwing.
