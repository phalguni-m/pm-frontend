# DESIGN SPEC — SOFTDECK

Full replacement. Supersedes all previous versions of this file.
Information architecture is unchanged: Workspace → Projects → Sections → Tasks →
Subtasks, same routes, same data rules, same waiting-state invariant.
What changes is the entire visual language.

Reference language: soft dashboard. Muted canvas, white cards floating on it with
generous radius and diffuse shadow, every module headed by a bordered icon tile
with title and subtitle, hairline rule, body, optional tinted footer strip.
Greyscale only — the reference's blues, greens, oranges, and purples all become
tone.

## 1. Tokens — `src/styles/tokens.css`

```css
:root {
  --radius-card:    16px;
  --radius-control: 12px;
  --radius-tile:    10px;
  --radius-inner:   8px;
  --radius-pill:    999px;

  --signal-critical: #E5484D;
  --signal-high:     #D9730D;

  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
               Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo,
               Consolas, monospace;

  --ease: cubic-bezier(0.32, 0.72, 0, 1);
}

[data-theme="light"] {
  --bg-canvas:   #F1F1F2;   /* the page behind the cards */
  --bg-card:     #FFFFFF;   /* every card surface */
  --bg-strip:    #F7F7F8;   /* card footer strips, table header rows */
  --bg-raised:   #F0F0F1;   /* icon tiles, swatches, chips */
  --bg-hover:    #F5F5F6;
  --bg-active:   #EBEBEC;
  --bg-inverted: #2B2B2B;
  --bg-inverted-hover: #111111;

  --border-subtle: #F0F0F0;
  --border:        #E4E4E6;
  --border-strong: #C9C9CC;

  --text-primary:   #1C1C1E;
  --text-secondary: #5C5C61;
  --text-tertiary:  #767680;
  --text-disabled:  #B0B0B6;
  --text-inverted:  #FFFFFF;

  --signal-critical-text: #C62B30;
  --signal-critical-dim:  #FBECEC;
  --signal-high-text:     #A65708;
  --signal-high-dim:      #FBF1E6;

  /* the tally / striped bar tone ramp, densest → lightest */
  --meter-1: #2B2B2B;  --meter-2: #6E6E73;  --meter-3: #9A9AA0;
  --meter-4: #C4C4C9;  --meter-5: #DEDEE1;  --meter-empty: #EDEDEF;

  --overlay: rgba(20,20,22,0.28);
  --shadow-card:    0 1px 2px rgba(16,16,20,0.04), 0 4px 16px rgba(16,16,20,0.05);
  --shadow-raised:  0 1px 2px rgba(16,16,20,0.06), 0 2px 6px rgba(16,16,20,0.05);
  --shadow-popover: 0 8px 32px rgba(16,16,20,0.12);
  --shadow-dialog:  0 24px 64px rgba(16,16,20,0.18);
}

[data-theme="dark"] {
  --bg-canvas:   #0E0E0F;
  --bg-card:     #191919;
  --bg-strip:    #202021;
  --bg-raised:   #242426;
  --bg-hover:    #202021;
  --bg-active:   #2A2A2C;
  --bg-inverted: #FFFFFF;
  --bg-inverted-hover: #D4D4D4;

  --border-subtle: #1F1F20;
  --border:        #2C2C2E;
  --border-strong: #414144;

  --text-primary:   #F5F5F6;
  --text-secondary: #A8A8AE;
  --text-tertiary:  #8A8A90;
  --text-disabled:  #4E4E52;
  --text-inverted:  #1C1C1E;

  --signal-critical-text: #FF6369;
  --signal-critical-dim:  #2A1517;
  --signal-high-text:     #F5943B;
  --signal-high-dim:      #2A1C0E;

  --meter-1: #F5F5F6;  --meter-2: #A8A8AE;  --meter-3: #76767C;
  --meter-4: #4E4E52;  --meter-5: #333336;  --meter-empty: #262628;

  --overlay: rgba(0,0,0,0.55);
  --shadow-card:    0 1px 2px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.24);
  --shadow-raised:  0 1px 2px rgba(0,0,0,0.34), 0 2px 6px rgba(0,0,0,0.28);
  --shadow-popover: 0 8px 32px rgba(0,0,0,0.45);
  --shadow-dialog:  0 24px 64px rgba(0,0,0,0.55);
}
```

**Signal colour is restricted to seven places** and appears nowhere else:
critical priority chip, high priority chip, the overdue chip, an overdue due
date, risk badges R4–R5, the required-field asterisk, and the blocked status
dot. Every other distinction in the app is carried by tone, weight, or position.

## 2. Language

**Elevation.** Cards float. `--bg-card` fill, `1px solid var(--border)`,
`--radius-card`, `--shadow-card`. This deliberately overrides the previous
spec's "no shadows on cards" rule — soft elevation is the language. Cards never
nest inside cards; a card's interior is divided by hairlines and strips, not by
more cards.

**Canvas.** `--bg-canvas` everywhere behind cards. The sidebar sits directly on
canvas with no card of its own; its *contents* are cards.

**Radius.** Cards 16 · controls, inputs, buttons, dropdown pills 12 · icon tiles
and swatches 10 · inner rows and chips 8 · bars, avatars, status pills 999.

**Type.** Inter (self-hosted or via `@fontsource/inter`), fallback system stack.
- Body 14px / `line-height: 1.5`
- Card title 15px / 600 · card subtitle 13px / `--text-secondary`
- Section eyebrow ("Main menu", "Project") 12px / 500 / `--text-tertiary`
- Display figures 28px / 700, `font-variant-numeric: tabular-nums`
- Table cell 14px · table header 13px / 500 / `--text-secondary`
- Micro (file size, timestamps, counts) 12px / `--text-tertiary`
- **Every number, date, duration, and percentage gets `tabular-nums`.**

Density is deliberately looser than the old spec: 14px body not 13px, 52px table
rows not 40px, 20–24px card padding. Whitespace is the point.

**Motion.** 180ms `var(--ease)` on hover and expand, 240ms on panels. All of it
disabled under `prefers-reduced-motion`.

## 3. Components

### Card
```
┌─────────────────────────────────────────┐
│ [tile] Title                       ···  │  header: padding 18px 20px
│        Subtitle                         │
├─────────────────────────────────────────┤  1px --border-subtle
│ body                                    │  padding 20px
├─────────────────────────────────────────┤
│ Footer strip text                    →  │  --bg-strip, padding 14px 20px
└─────────────────────────────────────────┘
```
Header: icon tile 36×36 · title/subtitle block · optional `···` kebab button
28×28 at the right. Footer strip is optional, spans the full width, inherits the
card's bottom radius, holds a 13px `--text-secondary` message and a `→` link
button. Never more than one strip per card.

### IconTile
36×36, `--radius-tile`, `--bg-card`, `1px solid var(--border)`,
`--shadow-raised`, centred 18px line icon in `--text-primary`, `stroke-width
1.6`. In the reference these are the little embossed glyph squares — the
raised-on-white treatment is what makes them read.

### DeltaChip
Pill, `--bg-raised`, `padding: 3px 9px`, 12px / 600 tabular. Arrow glyph 10px
then the value. Neutral by default in `--text-primary`. A delta the user should
act on (rising wait time, rising blocked count) uses `--signal-high-dim` /
`--signal-high-text`. Never green — there is no positive hue in this palette.

### StripedBar — status distribution
Height 14px, `--radius-pill`, segments separated by 3px gaps, each segment
independently pill-rounded. Segment tone by status, densest first:
`in_progress → --meter-1`, `waiting → --meter-2`, `blocked → --meter-3`,
`to_do → --meter-4`, `done → --meter-5`.

Because tone alone can't carry five categories, **each segment also gets a
distinct diagonal hatch** via an inline SVG `<pattern>` at 45°: in_progress
solid, waiting 2px lines at 5px pitch, blocked 2px at 3px pitch (densest),
to_do 1px at 6px, done 1px at 9px. This is the greyscale substitute for the
reference's colour segments and it is the single most important translation in
this spec — get it right and the whole design works without hue.

Legend beneath: swatch 12×12 `--radius-inner` carrying the same tone and hatch,
label 14px left, then count 15px/600 + unit 13px `--text-tertiary` right-aligned.

### TallyMeter — completion
The reference's ~40 discrete vertical bars. Ours: bars 6px wide, 32px tall,
`--radius-pill`, 4px gaps, `flex: 1` so the count adapts to width (28 bars
desktop, 20 tablet, 14 mobile). Filled bars `--meter-1`, remainder
`--meter-empty`. Above the meter: label 14px left, DeltaChip, then the
percentage 20px/700 right.

### DonutGlyph
20px circle, 3px ring, `--meter-empty` track, `--meter-1` sweep from 12 o'clock
clockwise. Used in table Progress cells beside the percentage. `role="img"` with
a title.

### StatusPill
`--bg-card`, `1px solid var(--border)`, `--radius-pill`, `padding: 5px 12px`,
13px. Contents: 8px status dot + label. Dots: `to_do` = `1.5px --border-strong`
ring, unfilled · `in_progress` = half-filled `--meter-1` · `waiting` =
`--meter-2` ring dashed · `blocked` = `--signal-critical` solid · `done` =
`--meter-1` solid with a `--bg-card` tick.

### PriorityChip
`--radius-pill`, `padding: 4px 10px`, 12px/600.
`critical` → `--signal-critical-dim` bg / `--signal-critical-text`;
`high` → `--signal-high-dim` / `--signal-high-text`;
`medium` → `--bg-raised` / `--text-secondary`;
`low` → transparent, `1px --border`, `--text-tertiary`.

### WaitingIndicator
The app's signature element. `--bg-raised`, `--radius-inner`, `padding: 4px 9px`:
a 12px dashed-ring dot, the duration in mono tabular (`3d 04h`), a `·`, then the
delay cause in 13px `--text-secondary`. Live, updating once a minute. Appears in
task rows, the task panel header, and the intelligence card.

### Avatar / AvatarGroup
Circle, `--bg-raised`, `1px solid var(--border)`, two-letter initials in
`--text-secondary` at `size * 0.36` / 600. **No colour, ever.** Group overlaps at
`-8px` with a 2px `--bg-card` ring per avatar; shows 4 then a `+N` chip in
`--bg-raised` / `--text-tertiary`. Sizes 32 / 28 / 24 / 20.

### ProjectMark
Rounded square, `--radius-tile`, `--bg-raised`, `1px solid var(--border)`,
two-letter identifier in mono 11px/700 `--text-secondary`. Sizes 20 / 28 / 36 /
44. This replaces the reference's coloured app icons.

### Button
`--radius-control`, 14px, `padding: 9px 16px`, `gap: 8`, 16px leading icon
optional.
- `default` — `--bg-card`, `1px --border`, `--text-primary`, `--shadow-raised`;
  hover `--bg-hover`.
- `primary` — `--bg-inverted`, `--text-inverted`, no border, weight 500.
- `quiet` — transparent, no border, `--text-secondary`, hover `--bg-hover`.
- `icon` — 36×36 square variant of `default`.

### DropdownPill
The reference's `[icon] Eyez ⌄` selector. `--bg-card`, `1px --border`,
`--radius-control`, `padding: 7px 12px`, 14px, trailing 14px chevron in
`--text-tertiary`. Optional leading ProjectMark at 20. Opens a Menu.

### SearchField
`--bg-raised`, `1px solid transparent`, `--radius-control`, `padding: 10px 14px`,
14px, leading 16px search icon `--text-tertiary`, trailing Kbd hint (`⌘F`) in
`--bg-card` `--radius-inner` mono 11px. Focus: `--bg-card` + `1px --border-strong`.

### Menu / Popover
`--bg-card`, `1px --border`, `--radius-control`, `--shadow-popover`,
`padding: 6px`, `min-width: 220px`. Items `--radius-inner`, `padding: 9px 12px`,
14px, hover `--bg-hover`, tick right-aligned. Full keyboard operation: ↑↓ Enter
Escape, `role="menu"`, focus returns to the trigger.

### Table
Lives inside a Card, below the header rule, edge to edge (the card's own padding
does not apply).
- Header row: `--bg-strip`, 44px, 13px/500 `--text-secondary`, `padding: 0 16px`
  per cell, each sortable header a button with a 14px double-chevron on the
  right and `aria-sort`.
- Body rows: 52px, `border-bottom: 1px solid var(--border-subtle)`, hover
  `--bg-hover`, last row no border. Whole row is a button opening the task panel.
- **Nested rows** (subtasks — tasks with `parent_task_id`): indent 32px, drawn
  with a tree line — a 1px `--border` vertical at x=20 from the parent row's
  bottom to the last child's centre, and a 1px horizontal stub into each child.
  Parent rows carry a 20×20 chevron toggle that rotates 90° when expanded.
  Expansion state lives in the URL so it survives reload.
- Drag handle: 6-dot grip 16×16 `--text-disabled`, visible on row hover only,
  `aria-grabbed` and keyboard-reorderable with ↑↓ when focused.

## 4. Chrome

### Sidebar — 248px, sits on `--bg-canvas`, no card, no border-right
`padding: 16px 12px`, `display: flex; flex-direction: column`.

1. **Brand** — 32×32 ProjectMark-style tile + wordmark 17px/700, `padding: 4px
   8px 16px`.
2. **Workspace switcher** — a Card at `--radius-control`, `padding: 10px 12px`,
   `--shadow-raised`. Avatar tile 36 · two lines (eyebrow 12px
   `--text-tertiary` "Group 37 Workspace", name 14px/600) · a 16px up/down
   stepper glyph at the right. Not a dropdown chevron — the reference uses a
   two-way stepper and it reads as "switch", which is right.
3. **SearchField**, full width, `margin: 12px 0 20px`.
4. **Eyebrow** `Main menu`, then nav items: Home · My Tasks · History · Members ·
   Settings. Item 40px, `--radius-control`, `padding: 0 12px`, `gap: 12`, 18px
   icon, 14px label. Rest: transparent, `--text-secondary`. Hover: `--bg-hover`.
   **Active: a raised white card** — `--bg-card`, `1px --border`,
   `--shadow-raised`, `--text-primary`, weight 500. That raised-active treatment
   is the sidebar's signature; do not substitute a flat fill.
5. **Eyebrow** `Projects`, then a row per project: ProjectMark 24 · name 14px ·
   a 20×20 sparkline badge showing that project's completion (3 bars, tone by
   ratio) · a chevron that expands the project's sections inline at indent 44px,
   each section row 34px / 13px `--text-secondary`.
6. **Spacer**, then the **user card** at the bottom — same Card treatment as the
   workspace switcher: avatar 32 · name 14px/500 + email 12px `--text-tertiary`
   · kebab. Beneath it, 11px `--text-disabled` centred, the theme toggle.

### Top bar — 56px, on canvas, `padding: 0 24px`
Left: back / forward chevron buttons 28×28 `quiet`, then the breadcrumb inside a
Card pill (`--radius-control`, `padding: 8px 16px`, 14px). Right: page actions.
No border-bottom — the canvas gap separates it.

### Page grid
`padding: 0 24px 24px`, cards in a `display: grid; gap: 16px`. No page-level max
width; cards stretch.

## 5. Pages

### HOME — workspace dashboard
Row 1, `grid-template-columns: repeat(3, 1fr)`:

**Card "Overall Tasks" / "Across N projects."** Body: `Tasks` 20px left, total
28px/700 right. StripedBar. Legend, five rows. Footer strip: `View all tasks →`.

**Card "Attention" / "What needs you now."** Body: three big figures in a row —
`WAITING` with total hours mono, `BLOCKED` count, `OVERDUE` count — each label
12px uppercase `letter-spacing: .06em` `--text-tertiary` above a 28px/700 figure.
Beneath, the top three delay causes as label/count rows. Footer strip carries the
worst bottleneck in words. Any figure not yet computed renders `—` in
`--text-disabled`, never `0`.

**Card "Progress" / "Completion across all projects."** Two TallyMeters:
`Completion` and `On-time delivery`, each with label, DeltaChip, percentage.
Footer strip: a one-line summary.

Row 2, full width: **Card "Timeline" / "Task schedule and deadlines."** A Gantt
built from each task's `start` and `due`. Header controls: date DropdownPill,
`Filter` button, `+ Schedule` button. Axis row of day/week ticks with 1px dashed
`--border-subtle` verticals continuing down the body. Each task is a bar:
`--bg-raised`, `--radius-inner`, `height: 32px`, a 3px full-height accent rule on
its left edge (`--signal-critical` for critical, `--signal-high` for high, else
`--border-strong`), a ProjectMark 16, the title 13px, and an AvatarGroup 20 at
the right. Rows stack with 6px gaps. Bars are keyboard-focusable and open the
task panel. Tasks with no `start` are excluded and counted in a footer strip:
`N tasks have no start date →`.

Row 3, full width: **Card "Projects" / "All projects, searchable."** Header right:
SearchField (compact), `Filter`, `+ New task`. Table columns:
`Project` (chevron + grip + ProjectMark 24 + name) · `Sections` (count) ·
`Open` · `Waiting` · `Blocked` · `Overdue` · `Team` (AvatarGroup 24) ·
`Progress` (DonutGlyph + %). Expanding a project reveals its **sections** as
nested rows; expanding a section reveals its **tasks**. Three levels, same tree
lines. Counts in mono tabular; a zero renders `--text-disabled`, an uncomputed
value renders `—`.

### PROJECT — command centre
**Header card**, full width: ProjectMark 44 · name 20px/600 · description 14px
`--text-secondary` · right side `Members` and `+ Section` buttons plus an
AvatarGroup 28. No footer strip.

**Row: `repeat(4, 1fr)` stat cards.** Each a compact Card without a subtitle:
IconTile, label 13px `--text-secondary`, figure 28px/700, and a DeltaChip where a
comparison exists. `Total` · `In progress` · `Waiting hours` · `Blocked`.

**Row: `1fr 360px`.**

*Left — Card "Sections" / "Modules in this project."* Table, columns: `Section`
(name + description beneath in 12px) · `Total` · `In progress` · `Waiting` ·
`Blocked` · `Done` · `High risk` · `Progress` (StripedBar 100px + %). The
`High risk` cell is a link when non-zero, in `--signal-critical-text`, and
filters the section page on click. Rows navigate to the section page. Footer
strip: `+ Add section →`.

*Right — a stack of Cards, `gap: 16px`:*
- **"Waiting" / "Where time is going."** Total hours as a 28px mono figure, then
  each delay cause as a row: label left, a 60px inline bar (tone by rank), count
  right. Footer strip names the top bottleneck.
- **"Handoffs" / "Delay between owners."** Rows of `PM → VR` with a median
  duration in mono. Slowest three only.
- **"Context switching" / "Task switches per member."** Avatar 24 + name + count.
  A member above threshold gets a DeltaChip in the `--signal-high` treatment.
- **"Warnings."** One row per warning: an 8px dot + text. `N blocked`,
  `N overdue`, `N high-risk`. Dots in `--signal-critical`. All clear renders a
  centred `No warnings` in `--text-tertiary`.

Every one of these is fed by the analysis endpoint, so every one has a
`—` state and a Skeleton loading state. Never a zero standing in for absence.

### SECTION — execution view
**Header card**: section name 20px/600 + description, right side sort
DropdownPill, `Filter` button, `+ New task` primary button.

**Table card**, full width, header row + rows per §3. Columns:
`Task` (chevron for subtasks + grip + title 14px + subtask count 12px
`--text-tertiary`) · `Assignees` (AvatarGroup 24) · `Priority` (PriorityChip) ·
`Status` (StatusPill) · `Waiting` (WaitingIndicator, else `—`) · `Due` (14px
tabular, overdue in `--signal-critical-text` with a small overdue chip) ·
`Risk` (badge, R4–R5 in `--signal-critical-dim`) · `Deps` (count + a 14px link
glyph). Subtasks nest one level with tree lines.

Empty state inside the card body: 120px tall, centred, an IconTile at 48,
`No tasks in this section` 14px, and a primary button.

### TASK PANEL — right-docked floating card
Not flush to the edge. `position: fixed; top: 16px; right: 16px; bottom: 16px;
width: min(520px, calc(100vw - 32px))`, `--bg-card`, `--radius-card`,
`--shadow-dialog`, `1px --border`. Scrim `--overlay` behind. Slides in 240ms.
Escape closes, focus returns to the row, `?task={id}` in the URL.

- **Header** `padding: 18px 20px`, bottom hairline: PriorityChip · StatusPill ·
  WaitingIndicator (when waiting) · spacer · link button · close. Beneath,
  the title as a borderless 20px/600 input.
- **Meta strip** `--bg-strip`, `padding: 10px 20px`, 12px `--text-tertiary`:
  `Created by PM · 01 Apr · Updated 15 Apr`.
- **Field grid** `padding: 20px`, `grid-template-columns: 1fr 1fr; gap: 16px`.
  Each field: label 12px/500 `--text-tertiary` above a control row. Status ·
  Priority · Assignees · Start · Due · Risk · Impact · Dependencies.
  **Delay cause** appears full-width the instant status becomes `waiting`, its
  label carrying a `*` in `--signal-critical-text`, its menu opening
  automatically, and the panel's Save button disabled until a cause is chosen.
  The invariant is already enforced by the `TaskState` discriminated union in
  `src/types/ui.ts` — preserve that union exactly; the UI merely reflects it.
  There is no runtime `alert()`.
- **Tabs** `Details` · `Comments` · `History`, 14px, 44px tall, bottom rule,
  active gets a 2px `--text-primary` underline.
  - *Details*: description textarea (borderless, `--bg-strip` on focus, grows);
    `Subtasks` as a compact nested list, each a real task row with its own
    StatusPill and assignees plus an inline `+ Add subtask`; `Dependencies` split
    into `Blocked by` and `Blocking`, each row a mini card at `--radius-inner`
    with StatusPill + title, and a `+` opening a searchable picker that refuses
    self-reference and cycles.
  - *Comments*: Avatar 32 + borderless composer + primary `Comment` button;
    existing comments as avatar + name + 12px timestamp + body. Fixtures only.
  - *History*: timeline with a 1px `--border` vertical rule at x=15 and a 30×30
    IconTile per event sitting on it. Event type as a 12px/600 label, detail
    14px, actor + timestamp 12px `--text-tertiary`. Unknown `event_type` values
    fall through to a generic renderer.
- **Footer** `padding: 16px 20px`, top hairline, `--bg-strip`: `Delete` quiet
  button left; `Cancel` default and `Save changes` primary right.

### HISTORY — project-wide
Filter card: date range, event type, and actor DropdownPills in a row, plus a
SearchField. Then a Card per day with the date as its title, containing that
day's timeline in the same treatment as the task History tab. Soft-deleted tasks
appear as placeholders in `--text-disabled` with a `Deleted` chip. Read-only —
no control anywhere on a history row.

### MEMBERS
**Rule card** at the top, no header, `--bg-strip` body, two rows in 14px:
`Workspace member → can be added to projects`
`Project member → can be assigned tasks`
Arrows as real glyphs, the two nouns in `--text-primary`, the rest
`--text-secondary`.

**Members table card**: Avatar 32 + name + email · Role · Projects (count +
ProjectMarks 20 overlapping) · Status · actions. Header right holds an
`+ Invite` primary button opening a dialog.

### GRAPH — dependency DAG
Full-bleed Card. Nodes are mini cards: `--bg-card`, `1px --border`,
`--radius-control`, `--shadow-raised`, `padding: 10px 12px`, 200px wide, holding
a StatusPill, the title 13px, and an AvatarGroup 20. Edges 1.5px `--border-strong`
bezier curves with a 6px arrowhead. Critical Path Mode: on-path nodes get
`2px --signal-critical` borders and on-path edges go `--signal-critical` at
2.5px; everything else drops to `opacity: 0.35`. Toggle in the card header. The
transition honours `prefers-reduced-motion`. Pan and zoom, plus keyboard focus
traversal through nodes in topological order.

## 6. Responsive

Breakpoints 1280 · 900 · 640 · 380. Tap targets ≥44px throughout — grow the hit
area with padding, never the visual. `dvh` not `vh`. Inputs 16px below 900px to
defeat iOS zoom. `viewport-fit=cover` plus `env(safe-area-inset-*)` on fixed
chrome. No horizontal page scroll at any width ≥320px.

**≤1280** — three-up card rows become two-up, the odd card spanning both. The
project page's `1fr 360px` stacks, intelligence cards becoming a two-up grid.
Task panel width `min(520px, 55vw)`.

**≤900** — sidebar becomes a drawer: off-canvas at `translateX(-100%)`, 280px,
`--bg-canvas`, `--shadow-dialog`, scrim behind, body scroll locked, focus
trapped. A 56px sticky top bar appears: hamburger 44 · breadcrumb (last two
segments) · search 44 · compose 44. Page padding drops to 16px. All card rows go
one-up. Table drops the `Deps` and `Risk` columns.

**≤640** — **table rows become stacked cards**, one per task, `--bg-card`,
`--radius-control`, `1px --border`, `padding: 14px`, `gap: 10px`, no shadow
(they're inside a card already):
```
┌────────────────────────────────────────┐
│ [P0]  Decision tree engine             │
│ ● Waiting  ·  3d 04h · Review          │
│ [PM VR]                    15 Apr  R4  │
└────────────────────────────────────────┘
```
Subtasks nest as a 20px-indented sub-stack with a left rule instead of tree
lines. Never a horizontally scrolling table — sideways scrolling to read a task
list is the failure this rule exists to prevent.
The task panel becomes a full-screen sheet (`inset: 0`, radius 0, its own header
with a back chevron); its field grid collapses to one column. Sort and filter
move into a bottom sheet behind one 44px `Filter` button. The timeline card
switches to a vertical day-grouped list. StripedBar legends go two-up.

**≤380** — TallyMeter drops to 14 bars. AvatarGroups show 2 then `+N`. Display
figures drop to 24px. Stat cards go one-up.

## 7. Non-negotiables

- No `any`, no `@ts-ignore`, no non-null assertions.
- No colour literal outside `tokens.css`. CSS Modules only — no inline `style`
  objects for anything themeable.
- Signal colour only in the seven places listed in §1.
- **Cards carry `--shadow-card`.** This intentionally overrides the previous
  spec's no-shadow-on-cards rule.
- Components take data as props and emit callbacks. No fetching, no mutation, no
  business logic inside a component.
- Every list has loading (Skeleton), empty, and populated states.
- Anything from the analysis endpoint renders `—` when absent. Never `0`.
- Every interactive element is keyboard-operable; dialogs and drawers trap focus,
  close on Escape, restore focus to the trigger.
- All motion respects `prefers-reduced-motion`.
- Both themes are equally finished — check every screen in both.
