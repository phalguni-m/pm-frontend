import type { SortDirection, TableColumn, TableSortState } from "@/components/primitives/Table/types";
import styles from "@/components/primitives/Table/Table.module.css";

export interface TableHeaderProps<T> {
  columns: TableColumn<T>[];
  sort: TableSortState;
  onSortChange: (columnId: string) => void;
  hasLeadingControls: boolean;
}

function DoubleChevron({ direction }: { direction: SortDirection | null }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M4 5.5 7 3l3 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={direction === "desc" ? 0.3 : 1}
      />
      <path
        d="M4 8.5 7 11l3-2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={direction === "asc" ? 0.3 : 1}
      />
    </svg>
  );
}

export function TableHeader<T>({ columns, sort, onSortChange, hasLeadingControls }: TableHeaderProps<T>) {
  return (
    <div className={styles.headerRow} role="row">
      {columns.map((column, index) => {
        const isSorted = sort.columnId === column.id;
        const ariaSort = isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : column.sortable ? "none" : undefined;
        const classNames = [styles.headerCell];
        if (column.hideBelowTablet) classNames.push(styles.headerCellHideBelowTablet);

        return (
          <div
            key={column.id}
            className={classNames.join(" ")}
            role="columnheader"
            aria-sort={ariaSort}
            style={{ justifyContent: column.align === "end" ? "flex-end" : "flex-start" }}
          >
            {/* Leading-controls gutter (drag handle + expand chevron) lives inside the
                first column's own cell, same as TableRow's .firstCell, so it never
                claims a grid track of its own and can't shift any other column. */}
            {index === 0 && hasLeadingControls && <span className={styles.chevronSpacer} aria-hidden="true" />}
            {column.sortable ? (
              <button type="button" className={styles.headerCellButton} onClick={() => onSortChange(column.id)}>
                {column.header}
                <span className={isSorted ? `${styles.sortIcon} ${styles.sortIconActive}` : styles.sortIcon}>
                  <DoubleChevron direction={isSorted ? sort.direction : null} />
                </span>
              </button>
            ) : (
              <span className={styles.headerCellStatic}>{column.header}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
