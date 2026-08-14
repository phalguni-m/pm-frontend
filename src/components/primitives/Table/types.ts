import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

/**
 * Where this column's rendered content lands when the table collapses to
 * stacked cards below 640px (SPEC §6). Omit to let the column disappear from
 * the card entirely (rare — most columns should map to a slot). "title"
 * takes over line one alongside any leading controls; "meta" is line two;
 * "footerStart"/"footerEnd" share line three, start- and end-aligned.
 */
export type TableCardSlot = "title" | "meta" | "footerStart" | "footerEnd";

export interface TableColumn<T> {
  id: string;
  header: string;
  sortable?: boolean;
  align?: "start" | "end";
  render: (row: T) => ReactNode;
  /** Hidden first at ≤900px when space is tight (e.g. Deps, Risk). Columns without this are never auto-hidden. */
  hideBelowTablet?: boolean;
  /** Placement in the ≤640px stacked-card layout. Columns without a slot are omitted from the card. */
  cardSlot?: TableCardSlot;
  /**
   * "flex" (default) shares the row's remaining space and may ellipsis long
   * content — use it for the one column that should dominate (e.g. Task).
   * "content" sizes to its own content, never grows, and never wraps — use
   * it for glyph/short-value columns (Priority, Status, Waiting, Due, Risk,
   * Deps) so a long value in one of them can't squeeze the flex column.
   */
  width?: "flex" | "content";
}

export interface TableRowData<T> {
  id: string;
  data: T;
  children?: TableRowData<T>[];
}

export interface TableSortState {
  columnId: string | null;
  direction: SortDirection;
}
