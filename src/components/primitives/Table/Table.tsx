import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "@/components/primitives/Skeleton";
import { TableHeader } from "@/components/primitives/Table/TableHeader";
import { TableRow } from "@/components/primitives/Table/TableRow";
import { TableCardView } from "@/components/primitives/Table/TableCardView";
import { flattenRows } from "@/components/primitives/Table/flatten";
import type { TableColumn, TableRowData, TableSortState } from "@/components/primitives/Table/types";
import styles from "@/components/primitives/Table/Table.module.css";

/**
 * One track per column. .gridView (see Table.module.css) is the actual grid
 * container and owns this template; .headerRow and every .row are subgrid
 * items (grid-template-columns: subgrid; grid-column: 1 / -1) that inherit
 * these exact resolved tracks rather than computing their own — that's what
 * makes a column resolve to the same x range in the header and in every row,
 * nested rows included, instead of each row sizing an intrinsic track
 * (minmax(min-content, max-content)) against only its own content.
 *
 * "content" columns get a max-content track (capped so one long value can't
 * blow out the column); "flex" columns share the remaining space via
 * minmax(0, 1fr), which is also what lets their content ellipsis instead of
 * overflowing.
 *
 * Exactly one track per column, never a separate track for the drag
 * handle/indent gutters/expand chevron — those render inside the first
 * column's own cell (both in the header, via its leading-controls spacer,
 * and in each row, via .firstCell) so an indented or draggable row never
 * shifts any other column's track.
 *
 * Built twice: the full track list, and a reduced one that drops
 * hideBelowTablet columns for ≤900px — see buildGridTemplate's `tablet` arg.
 * At that breakpoint .gridView redeclares --table-cols to the reduced list,
 * which every subgrid item automatically picks up; grid-auto-flow places the
 * remaining (still-rendered, just display:none'd) cells into it in DOM
 * order, so it must list exactly the tracks for the columns that stay
 * visible, in the same order.
 */
function buildGridTemplate<T>(columns: TableColumn<T>[], tablet: boolean): string {
  return columns
    .filter((column) => !(tablet && column.hideBelowTablet))
    // The flex column's floor is a small fixed length, not 0 — a run of
    // wordy "content" headers (e.g. "In progress", "High risk") can add up to
    // more than the container's width, and minmax(0, 1fr) loses that fight
    // down to literally nothing. 160px is enough for a genuinely readable
    // truncated name (SPEC's Section column also carries a description line
    // beneath it) plus ellipsis, while still growing to take the remaining
    // space whenever there's room. This is a floor against total collapse,
    // not a fix for a table that structurally doesn't fit its slot — see
    // Table's width-pressure note below.
    .map((column) => (column.width === "content" ? "minmax(min-content, max-content)" : "minmax(160px, 1fr)"))
    .join(" ");
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: TableRowData<T>[];
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onRowActivate: (row: T) => void;
  sort?: TableSortState;
  onSortChange?: (columnId: string) => void;
  draggable?: boolean;
  onReorder?: (sourceId: string, direction: "up" | "down") => void;
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyState?: ReactNode;
}

/**
 * Generic tree table. At ≥640px this renders as a conventional grid with
 * sortable headers and tree-line nesting (see TableRow). Below 640px it
 * renders as a stack of cards instead (see TableCardView), assembled purely
 * from each column's `cardSlot` — the component has no idea what a "task" is
 * either way. Both views are mounted simultaneously and toggled by CSS
 * (`.gridView`/`.cardView` in Table.module.css) rather than a JS media-query
 * listener, consistent with how the rest of the shell handles breakpoints.
 */
export function Table<T>({
  columns,
  rows,
  expandedIds,
  onToggleExpand,
  onRowActivate,
  sort = { columnId: null, direction: "asc" },
  onSortChange,
  draggable = false,
  onReorder,
  isLoading = false,
  loadingRowCount = 5,
  emptyState,
}: TableProps<T>) {
  const flatRows = flattenRows(rows, expandedIds);
  const hasLeadingControls = draggable;

  const gridStyle = {
    "--table-cols": buildGridTemplate(columns, false),
    "--table-cols-tablet": buildGridTemplate(columns, true),
  } as CSSProperties;

  return (
    <div className={styles.root}>
      <div className={styles.gridView} role="table" style={gridStyle}>
        <TableHeader columns={columns} sort={sort} onSortChange={onSortChange ?? (() => {})} hasLeadingControls={hasLeadingControls} />
        <div className={styles.body} role="rowgroup">
          {isLoading &&
            Array.from({ length: loadingRowCount }, (_, index) => (
              <div key={index} className={styles.loadingRow}>
                <Skeleton width={20} height={20} radius="sm" />
                <Skeleton width="40%" height={14} />
                <Skeleton width="15%" height={14} />
                <Skeleton width="15%" height={14} />
              </div>
            ))}

          {!isLoading && flatRows.length === 0 && emptyState && <div className={styles.emptyRow}>{emptyState}</div>}

          {!isLoading &&
            flatRows.map((row, index) => (
              <TableRow
                key={row.id}
                row={row}
                columns={columns}
                isExpanded={expandedIds.has(row.id)}
                onToggleExpand={onToggleExpand}
                onActivate={onRowActivate}
                isLast={index === flatRows.length - 1}
                draggable={draggable}
                onMoveUp={onReorder ? (id) => onReorder(id, "up") : undefined}
                onMoveDown={onReorder ? (id) => onReorder(id, "down") : undefined}
              />
            ))}
        </div>
      </div>

      <div className={styles.cardView}>
        <TableCardView
          columns={columns}
          rows={rows}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onRowActivate={onRowActivate}
          isLoading={isLoading}
          loadingRowCount={loadingRowCount}
          emptyState={emptyState}
        />
      </div>
    </div>
  );
}
