import { useState, type ReactNode } from "react";
import styles from "@/pages/KitchenSinkPage/KitchenSinkPage.module.css";
import { Card } from "@/components/primitives/Card";
import { IconTile } from "@/components/primitives/IconTile";
import { DeltaChip } from "@/components/primitives/DeltaChip";
import { StripedBar, StripedBarSwatch } from "@/components/primitives/StripedBar";
import { TallyMeter, ResponsiveTallyMeter } from "@/components/primitives/TallyMeter";
import { DonutGlyph } from "@/components/primitives/DonutGlyph";
import { StatusPill } from "@/components/primitives/StatusPill";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import { WaitingIndicator } from "@/components/primitives/WaitingIndicator";
import { Avatar } from "@/components/primitives/Avatar";
import { AvatarGroup, ResponsiveAvatarGroup, type AvatarGroupMember } from "@/components/primitives/AvatarGroup";
import { ProjectMark } from "@/components/primitives/ProjectMark";
import { Skeleton } from "@/components/primitives/Skeleton";
import { AbsentValue } from "@/components/primitives/AbsentValue";
import { Button } from "@/components/primitives/Button";
import { Kbd } from "@/components/primitives/Kbd";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import { Field } from "@/components/primitives/Field";
import { Checkbox } from "@/components/primitives/Checkbox";
import { SearchField } from "@/components/primitives/SearchField";
import { Popover } from "@/components/primitives/Popover";
import { Menu } from "@/components/primitives/Menu";
import { DropdownPill } from "@/components/primitives/DropdownPill";
import { Tabs } from "@/components/primitives/Tabs";
import { Dialog } from "@/components/primitives/Dialog";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Table, TableCardView, type TableColumn, type TableRowData } from "@/components/primitives/Table";
import { CardGrid } from "@/components/primitives/CardGrid";
import { BottomSheet } from "@/components/primitives/BottomSheet";
import { HomeIcon, TasksIcon, ProjectIcon, SearchIcon } from "@/components/icons";
import type { StatusType, PriorityLevel } from "@/types/database";

const ALL_STATUSES: StatusType[] = ["to_do", "in_progress", "waiting", "blocked", "done"];
const ALL_PRIORITIES: PriorityLevel[] = ["critical", "high", "medium", "low"];

const NINE_MEMBERS: AvatarGroupMember[] = [
  { id: "1", initials: "PM", name: "Phalguni M" },
  { id: "2", initials: "VR", name: "Vismaya R" },
  { id: "3", initials: "NK", name: "Namana K" },
  { id: "4", initials: "PS", name: "Purva S" },
  { id: "5", initials: "AB", name: "Amit B" },
  { id: "6", initials: "CD", name: "Chandra D" },
  { id: "7", initials: "EF", name: "Esha F" },
  { id: "8", initials: "GH", name: "Gopal H" },
  { id: "9", initials: "IJ", name: "Isha J" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

const SORT_MENU_ITEMS = [
  { id: "default", label: "Default", selected: true },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" },
  { id: "due", label: "Due" },
];

const FILTER_MENU_ITEMS = [
  { id: "all", label: "All statuses", selected: true },
  { id: "open", label: "Open only" },
  { id: "waiting", label: "Waiting only", disabled: true },
];

const DETAIL_TABS = [
  { id: "details", label: "Details" },
  { id: "comments", label: "Comments" },
  { id: "history", label: "History" },
];

function ControlsBlock() {
  const [sortLabel, setSortLabel] = useState("Default");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkedOn, setCheckedOn] = useState(true);
  const [checkedOff, setCheckedOff] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  return (
    <>
      <Section title="Button — variants, rest / hover / focus-visible / disabled / loading">
        <div className={styles.row}>
          <Button variant="default">Default</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="icon" aria-label="Search">
            <SearchIcon size={16} />
          </Button>
        </div>
        <div className={styles.row}>
          <Button variant="default" disabled>
            Disabled
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button variant="default" icon={<HomeIcon size={16} />}>
            With icon
          </Button>
        </div>
        <p className={styles.rowLabel}>Tab to a button and check the focus-visible ring; hover states are live.</p>
      </Section>

      <Section title="Kbd">
        <div className={styles.row}>
          <Kbd>⌘F</Kbd>
          <Kbd>Esc</Kbd>
          <Kbd>C</Kbd>
        </div>
      </Section>

      <Section title="Input — rest / disabled / error">
        <div className={styles.cardStack} style={{ maxWidth: 320 }}>
          <Input placeholder="Rest state" />
          <Input placeholder="Disabled" disabled />
          <Input placeholder="Error state" error defaultValue="Bad value" />
        </div>
      </Section>

      <Section title="Textarea — borderless (default) and bordered">
        <div className={styles.cardStack} style={{ maxWidth: 320 }}>
          <Textarea placeholder="Borderless — task panel Description" />
          <Textarea placeholder="Bordered — standalone form" bordered />
          <Textarea placeholder="Disabled" disabled />
        </div>
      </Section>

      <Section title="Field — with and without required asterisk, with error">
        <div className={styles.cardStack} style={{ maxWidth: 320 }}>
          <Field label="Title" htmlFor="ks-field-title">
            <Input id="ks-field-title" placeholder="Task title" />
          </Field>
          <Field label="Delay cause" htmlFor="ks-field-cause" required>
            <Input id="ks-field-cause" placeholder="Select a cause" />
          </Field>
          <Field label="Due date" htmlFor="ks-field-due" errorMessage="Due date must be after the start date.">
            <Input id="ks-field-due" error defaultValue="01 Jan" />
          </Field>
        </div>
      </Section>

      <Section title="Checkbox — checked / unchecked / disabled">
        <div className={styles.row}>
          <Checkbox label="Checked" checked={checkedOn} onChange={(e) => setCheckedOn(e.target.checked)} />
          <Checkbox label="Unchecked" checked={checkedOff} onChange={(e) => setCheckedOff(e.target.checked)} />
          <Checkbox label="Disabled, checked" checked disabled onChange={() => {}} />
          <Checkbox label="Disabled, unchecked" disabled onChange={() => {}} />
        </div>
        <p className={styles.rowLabel}>Tab to a box and press Space to toggle — real input semantics, not a div.</p>
      </Section>

      <Section title="SearchField — with and without shortcut hint">
        <div className={styles.cardStack} style={{ maxWidth: 320 }}>
          <SearchField placeholder="Search tasks" shortcutHint="⌘F" />
          <SearchField placeholder="No hint" />
          <SearchField placeholder="Disabled" disabled />
        </div>
      </Section>

      <Section title="Popover — Escape closes, click-outside closes, focus returns to trigger">
        <Popover
          trigger={(triggerProps) => (
            <Button variant="default" onClick={triggerProps.onClick} aria-expanded={triggerProps["aria-expanded"]} aria-haspopup={triggerProps["aria-haspopup"]}>
              Open popover
            </Button>
          )}
        >
          {() => <div style={{ padding: 16, maxWidth: 220 }}>Popover content. Press Escape or click outside to close.</div>}
        </Popover>
      </Section>

      <Section title="Menu — ↑↓ moves, Enter selects, tick on selected, disabled item">
        <div style={{ maxWidth: 240 }}>
          <Menu items={FILTER_MENU_ITEMS} onSelect={() => {}} />
        </div>
      </Section>

      <Section title="DropdownPill — with and without leading ProjectMark">
        <div className={styles.row}>
          <DropdownPill
            label={sortLabel}
            items={SORT_MENU_ITEMS.map((item) => ({ ...item, selected: item.label === sortLabel }))}
            onSelect={(id) => {
              const match = SORT_MENU_ITEMS.find((item) => item.id === id);
              if (match) setSortLabel(match.label);
            }}
          />
          <DropdownPill
            label="HealthBridge"
            leadingMark={<ProjectMark mark="HB" name="HealthBridge" size={20} />}
            items={[
              { id: "hb", label: "HealthBridge", selected: true },
              { id: "ac", label: "Atlas Core" },
              { id: "ag", label: "API Gateway" },
            ]}
            onSelect={() => {}}
          />
          <DropdownPill label="Disabled" items={SORT_MENU_ITEMS} onSelect={() => {}} disabled />
        </div>
      </Section>

      <Section title="Tabs — ←→ moves between tabs, roving tabindex">
        <div style={{ maxWidth: 360 }}>
          <Tabs tabs={DETAIL_TABS} activeTabId={activeTab} onChange={setActiveTab} ariaLabel="Kitchen sink demo tabs">
            {activeTab === "details" && <p>Details panel content.</p>}
            {activeTab === "comments" && <p>Comments panel content.</p>}
            {activeTab === "history" && <p>History panel content.</p>}
          </Tabs>
        </div>
      </Section>

      <Section title="Dialog — focus trapped, Escape closes, scroll locked, focus restores to trigger">
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Dialog
          isOpen={dialogOpen}
          title="Confirm action"
          onClose={() => setDialogOpen(false)}
          footer={
            <>
              <Button variant="default" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p>Dialog body content. Tab should cycle only within this panel.</p>
        </Dialog>
      </Section>

      <Section title="EmptyState — with icon + action, and message-only">
        <div className={styles.grid}>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
            <EmptyState icon={<TasksIcon size={18} />} message="No tasks in this section" action={{ label: "Create task", onClick: () => {} }} />
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
            <EmptyState message="Nothing to show yet." />
          </div>
        </div>
      </Section>
    </>
  );
}

// Generic demo row shape — deliberately not "task"-shaped, to prove Table
// doesn't know about tasks. project -> section -> task nesting reuses the
// same generic tree, just three levels deep instead of two.
interface DemoRow {
  id: string;
  label: string;
  status: StatusType;
  priority: PriorityLevel;
  count: number;
  due: string;
  risk: string;
  deps: number;
}

const DEMO_COLUMNS: TableColumn<DemoRow>[] = [
  {
    id: "label",
    header: "Name",
    sortable: true,
    cardSlot: "title",
    render: (row) => row.label,
  },
  {
    id: "priority",
    header: "Priority",
    width: "content",
    cardSlot: "title",
    render: (row) => <PriorityChip priority={row.priority} />,
  },
  {
    id: "status",
    header: "Status",
    width: "content",
    cardSlot: "meta",
    render: (row) => <StatusPill status={row.status} />,
  },
  {
    id: "count",
    header: "Count",
    sortable: true,
    align: "end",
    width: "content",
    cardSlot: "footerStart",
    render: (row) => <span className="tabular">{row.count}</span>,
  },
  {
    id: "due",
    header: "Due",
    width: "content",
    cardSlot: "footerEnd",
    render: (row) => <span className="tabular">{row.due}</span>,
  },
  {
    id: "risk",
    header: "Risk",
    align: "end",
    width: "content",
    hideBelowTablet: true,
    cardSlot: "footerEnd",
    render: (row) => <span className="tabular">{row.risk}</span>,
  },
  {
    id: "deps",
    header: "Deps",
    align: "end",
    width: "content",
    hideBelowTablet: true,
    render: (row) => <span className="tabular">{row.deps || "—"}</span>,
  },
];

function row(
  id: string,
  label: string,
  status: StatusType,
  overrides: Partial<Omit<DemoRow, "id" | "label" | "status">> = {},
): DemoRow {
  return {
    id,
    label,
    status,
    priority: "medium",
    count: 0,
    due: "—",
    risk: "—",
    deps: 0,
    ...overrides,
  };
}

const THREE_LEVEL_ROWS: TableRowData<DemoRow>[] = [
  {
    id: "project-hb",
    data: row("project-hb", "HealthBridge", "in_progress", { priority: "high", count: 12, due: "18 Aug" }),
    children: [
      {
        id: "section-triage",
        data: row("section-triage", "Core Triage", "in_progress", { priority: "critical", count: 7, due: "18 Aug" }),
        children: [
          { id: "task-1", data: row("task-1", "Build intake form", "done", { priority: "high", due: "12 Jul", risk: "R1", deps: 0 }) },
          {
            id: "task-2",
            data: row("task-2", "Triage rule engine", "in_progress", { priority: "critical", due: "20 Aug", risk: "R4", deps: 2 }),
          },
          { id: "task-3", data: row("task-3", "Offline sync", "waiting", { priority: "high", due: "24 Aug", risk: "R5", deps: 1 }) },
        ],
      },
      {
        id: "section-reports",
        data: row("section-reports", "Reports & Analytics", "to_do", { priority: "low", count: 5, due: "01 Sep" }),
        children: [
          { id: "task-4", data: row("task-4", "CSV export", "to_do", { priority: "medium", due: "28 Aug", risk: "R2", deps: 1 }) },
          { id: "task-5", data: row("task-5", "Outcome dashboard", "to_do", { priority: "low", due: "05 Sep", risk: "R1", deps: 1 }) },
        ],
      },
    ],
  },
  {
    id: "project-ac",
    data: row("project-ac", "Atlas Core", "blocked", { priority: "critical", count: 9, due: "25 Aug" }),
    children: [
      {
        id: "section-frontend",
        data: row("section-frontend", "Frontend", "blocked", { priority: "critical", count: 3, due: "25 Aug" }),
        children: [
          {
            id: "task-6",
            data: row("task-6", "Dependency graph view", "blocked", { priority: "critical", due: "25 Aug", risk: "R5", deps: 3 }),
          },
        ],
      },
    ],
  },
];

// Deep-nesting stress case: five levels, single-child chains, to check the
// tree-line gutters don't drift as depth grows.
const DEEP_ROWS: TableRowData<DemoRow>[] = [
  {
    id: "d1",
    data: row("d1", "Level 1", "in_progress", { count: 1 }),
    children: [
      {
        id: "d2",
        data: row("d2", "Level 2", "in_progress", { count: 1 }),
        children: [
          {
            id: "d3",
            data: row("d3", "Level 3", "waiting", { count: 1 }),
            children: [
              {
                id: "d4",
                data: row("d4", "Level 4", "waiting", { count: 1 }),
                children: [
                  { id: "d5a", data: row("d5a", "Level 5 — first sibling", "to_do") },
                  { id: "d5b", data: row("d5b", "Level 5 — second sibling", "done") },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

function TableBlock() {
  const [expandedThreeLevel, setExpandedThreeLevel] = useState<ReadonlySet<string>>(
    new Set(["project-hb", "section-triage"]),
  );
  const [expandedDeep, setExpandedDeep] = useState<ReadonlySet<string>>(new Set(["d1", "d2", "d3", "d4"]));
  const [sort, setSort] = useState<{ columnId: string | null; direction: "asc" | "desc" }>({
    columnId: null,
    direction: "asc",
  });

  function toggle(set: ReadonlySet<string>, setSet: (next: ReadonlySet<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  function handleSortChange(columnId: string) {
    setSort((prev) =>
      prev.columnId === columnId
        ? { columnId, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    );
  }

  return (
    <>
      <Section title="Table — three levels (project → section → task), sortable header">
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <Table
            columns={DEMO_COLUMNS}
            rows={THREE_LEVEL_ROWS}
            expandedIds={expandedThreeLevel}
            onToggleExpand={(id) => toggle(expandedThreeLevel, setExpandedThreeLevel, id)}
            onRowActivate={() => {}}
            sort={sort}
            onSortChange={handleSortChange}
            draggable
          />
        </div>
        <p className={styles.rowLabel}>
          Expansion state is owned here and passed in via props — the URL-persistence wiring happens at the page level in a
          later block, not inside Table itself. Resize below 640px (or check the ≤640 pane below) to see this same Table
          become stacked cards, assembled purely from each column&apos;s cardSlot. The Risk and Deps columns drop first at
          ≤900px.
        </p>
      </Section>

      <Section title="Table — deep nesting (5 levels), tree-line drift check">
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <Table
            columns={DEMO_COLUMNS}
            rows={DEEP_ROWS}
            expandedIds={expandedDeep}
            onToggleExpand={(id) => toggle(expandedDeep, setExpandedDeep, id)}
            onRowActivate={() => {}}
          />
        </div>
      </Section>

      <Section title="Table — empty state">
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <Table
            columns={DEMO_COLUMNS}
            rows={[]}
            expandedIds={new Set()}
            onToggleExpand={() => {}}
            onRowActivate={() => {}}
            emptyState={<EmptyState icon={<TasksIcon size={18} />} message="No rows to show" />}
          />
        </div>
      </Section>

      <Section title="Table — loading state">
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <Table
            columns={DEMO_COLUMNS}
            rows={[]}
            expandedIds={new Set()}
            onToggleExpand={() => {}}
            onRowActivate={() => {}}
            isLoading
          />
        </div>
      </Section>

      <Section title="Table — forced ≤640 stacked-card view (TableCardView directly, so this is visible without shrinking the actual browser window)">
        <div style={{ maxWidth: 320, border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 12 }}>
          <TableCardView
            columns={DEMO_COLUMNS}
            rows={THREE_LEVEL_ROWS}
            expandedIds={expandedThreeLevel}
            onToggleExpand={(id) => toggle(expandedThreeLevel, setExpandedThreeLevel, id)}
            onRowActivate={() => {}}
          />
        </div>
        <p className={styles.rowLabel}>
          Same THREE_LEVEL_ROWS/DEMO_COLUMNS data as the sortable table above, rendered through TableCardView directly.
          Subtasks nest as a 20px-indented sub-stack with a left rule, not tree lines. At an actual viewport ≤640px, Table
          itself switches to exactly this via CSS — no separate wiring needed.
        </p>
      </Section>
    </>
  );
}

function ResponsiveBlock() {
  return (
    <>
      <Section title="CardGrid — three-up, becomes two-up (odd spans both) ≤1280, one-up ≤900">
        <CardGrid>
          <Card title="Card A" subtitle="First of five">
            <p>Resize the window through 1280 and 900 to see the reflow.</p>
          </Card>
          <Card title="Card B" subtitle="Second of five">
            <p>At two-up, an odd trailing card spans both columns.</p>
          </Card>
          <Card title="Card C" subtitle="Third of five">
            <p>Body content.</p>
          </Card>
          <Card title="Card D" subtitle="Fourth of five">
            <p>Body content.</p>
          </Card>
          <Card title="Card E — the odd one out" subtitle="Fifth of five">
            <p>Spans both columns at the two-up breakpoint; full width at one-up.</p>
          </Card>
        </CardGrid>
      </Section>

      <Section title="ResponsiveTallyMeter — 28 bars desktop / 20 tablet (≤900) / 14 mobile (≤640, stays 14 at ≤380)">
        <ResponsiveTallyMeter label="Completion" percent={64} delta={<DeltaChip direction="up" value="5" />} />
      </Section>

      <Section title="ResponsiveAvatarGroup — 4 then +N above 380px, 2 then +N at ≤380">
        <ResponsiveAvatarGroup members={NINE_MEMBERS} size={28} />
      </Section>

      <Section title="Display figure — 28px/700 tabular, drops to 24px at ≤380">
        <span className="displayFigure">1,248</span>
      </Section>

      <Section title="BottomSheet — ≤640 sort/filter affordance (trigger only visible below 640px)">
        <BottomSheet triggerLabel="Filter" title="Sort & filter">
          <div className={styles.cardStack}>
            <Field label="Sort by" htmlFor="ks-sheet-sort">
              <Input id="ks-sheet-sort" defaultValue="Priority" readOnly />
            </Field>
            <Field label="Status" htmlFor="ks-sheet-status">
              <Input id="ks-sheet-status" defaultValue="All" readOnly />
            </Field>
          </div>
        </BottomSheet>
        <p className={styles.rowLabel}>
          Above 640px this trigger is hidden entirely — the owning page renders its normal inline sort/filter controls
          instead. Below 640px it&apos;s the only way to reach them, per SPEC §6.
        </p>
      </Section>
    </>
  );
}

function AvatarGroupSizeRow({ size }: { size: 20 | 24 | 28 | 32 }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>size {size}</span>
      <AvatarGroup members={NINE_MEMBERS.slice(0, 1)} size={size} />
      <AvatarGroup members={NINE_MEMBERS.slice(0, 3)} size={size} />
      <AvatarGroup members={NINE_MEMBERS.slice(0, 4)} size={size} />
      <AvatarGroup members={NINE_MEMBERS.slice(0, 9)} size={size} />
    </div>
  );
}

function KitchenSinkContent() {
  const twelveDaysAgo = new Date(Date.now() - (12 * 24 + 3) * 60 * 60 * 1000).toISOString();
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  return (
    <>
      <Section title="Card + IconTile + DeltaChip">
        <div className={styles.grid}>
          <Card icon={<IconTile icon={<HomeIcon size={18} />} />} title="Overall Tasks" subtitle="Across 3 projects.">
            <div className={styles.row}>
              <DeltaChip direction="up" value="12" />
              <DeltaChip direction="up" value="4" needsAttention />
            </div>
          </Card>
          <Card
            icon={<IconTile icon={<TasksIcon size={18} />} />}
            title="Attention"
            subtitle="What needs you now."
            footer={{ message: "Biggest bottleneck: Review", linkLabel: "View all", onLinkClick: () => {} }}
          >
            <p>Body content area.</p>
          </Card>
          <Card icon={<IconTile icon={<ProjectIcon size={18} />} size="sm" />} title="Small tile" subtitle="30px variant">
            <p>Used in History tab timelines.</p>
          </Card>
        </div>
      </Section>

      <Section title="Card header at 280px width (truncation test)">
        <div style={{ width: 280 }}>
          <Card
            icon={<IconTile icon={<HomeIcon size={18} />} />}
            title="A much longer card title that should truncate, not wrap"
            subtitle="And a longer subtitle line that also truncates cleanly"
          >
            <p>Body content.</p>
          </Card>
        </div>
      </Section>

      <Section title="StripedBar — five-status distribution">
        <StripedBar
          segments={[
            { status: "in_progress", count: 6 },
            { status: "waiting", count: 3 },
            { status: "blocked", count: 2 },
            { status: "to_do", count: 8 },
            { status: "done", count: 11 },
          ]}
        />
      </Section>

      <Section title="StripedBar — two-status distribution">
        <StripedBar
          segments={[
            { status: "in_progress", count: 5 },
            { status: "done", count: 5 },
          ]}
        />
      </Section>

      <Section title="StripedBar — all done">
        <StripedBar segments={[{ status: "done", count: 20 }]} />
      </Section>

      <Section title="StripedBar — 3-task project (sliver-width test)">
        <StripedBar
          segments={[
            { status: "in_progress", count: 1 },
            { status: "waiting", count: 1 },
            { status: "done", count: 1 },
          ]}
        />
      </Section>

      <Section title="StripedBar — narrow container, dense mix (forces flat fallback)">
        <div style={{ maxWidth: 160 }}>
          <StripedBar
            segments={[
              { status: "in_progress", count: 10 },
              { status: "waiting", count: 1 },
              { status: "blocked", count: 1 },
              { status: "to_do", count: 1 },
              { status: "done", count: 10 },
            ]}
            showLegend={false}
          />
        </div>
      </Section>

      <Section title="StripedBar swatches at 12px (legend size)">
        <div className={styles.row}>
          {ALL_STATUSES.map((status) => (
            <div key={status} className={styles.row} style={{ marginBottom: 0 }}>
              <div style={{ width: 12, height: 12 }}>
                <StripedBarSwatch status={status} />
              </div>
              <span>{status}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="TallyMeter">
        <div className={styles.cardStack}>
          <TallyMeter label="0%" percent={0} />
          <TallyMeter label="33%" percent={33} delta={<DeltaChip direction="up" value="3" />} />
          <TallyMeter label="89%" percent={89} />
          <TallyMeter label="100%" percent={100} />
          <TallyMeter label="≤380 — 14 bars" percent={62} barCount={14} />
        </div>
      </Section>

      <Section title="DonutGlyph">
        <div className={styles.row}>
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} className={styles.row} style={{ marginBottom: 0 }}>
              <DonutGlyph percent={p} />
              <span>{p}%</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="StatusPill — all five statuses">
        <div className={styles.row}>
          {ALL_STATUSES.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="PriorityChip — all four priorities">
        <div className={styles.row}>
          {ALL_PRIORITIES.map((priority) => (
            <PriorityChip key={priority} priority={priority} />
          ))}
        </div>
      </Section>

      <Section title="WaitingIndicator">
        <div className={styles.row}>
          <WaitingIndicator waitingSince={fourHoursAgo} causeName="Review" />
          <WaitingIndicator waitingSince={twelveDaysAgo} causeName="External input" />
        </div>
        <p className={styles.rowLabel}>Updates once a minute via internal interval; duration above is computed live from waitingSince.</p>
      </Section>

      <Section title="Avatar — sizes 32 / 28 / 24 / 20">
        <div className={styles.row}>
          <Avatar initials="PM" name="Phalguni M" size={32} />
          <Avatar initials="VR" name="Vismaya R" size={28} />
          <Avatar initials="NK" name="Namana K" size={24} />
          <Avatar initials="PS" name="Purva S" size={20} />
        </div>
      </Section>

      <Section title="AvatarGroup — 1, 3, 4, 9 members at each size">
        <AvatarGroupSizeRow size={32} />
        <AvatarGroupSizeRow size={28} />
        <AvatarGroupSizeRow size={24} />
        <AvatarGroupSizeRow size={20} />
      </Section>

      <Section title="ProjectMark — sizes 20 / 28 / 36 / 44">
        <div className={styles.row}>
          <ProjectMark mark="HB" name="HealthBridge" size={20} />
          <ProjectMark mark="AC" name="Atlas Core" size={28} />
          <ProjectMark mark="AG" name="API Gateway" size={36} />
          <ProjectMark mark="HB" name="HealthBridge" size={44} />
        </div>
      </Section>

      <Section title="Skeleton">
        <div className={styles.cardStack}>
          <Skeleton width={200} height={14} />
          <Skeleton width={120} height={28} radius="md" />
          <Skeleton width={36} height={36} radius="lg" />
        </div>
      </Section>

      <Section title="Absent value ( — )">
        <div className={styles.row}>
          <span>Risk score:</span>
          <AbsentValue />
          <span>Waiting hours:</span>
          <AbsentValue />
        </div>
      </Section>

      <ControlsBlock />
      <TableBlock />
      <ResponsiveBlock />
    </>
  );
}

export function KitchenSinkPage() {
  return (
    <div className={styles.root}>
      <div className={styles.pane} data-theme="light">
        <div className={styles.paneLabel}>Light theme</div>
        <KitchenSinkContent />
      </div>
      <div className={styles.pane} data-theme="dark">
        <div className={styles.paneLabel}>Dark theme</div>
        <KitchenSinkContent />
      </div>
    </div>
  );
}
