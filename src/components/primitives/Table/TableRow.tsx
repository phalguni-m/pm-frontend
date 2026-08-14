import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronIcon } from "@/components/icons";
import { GripIcon } from "@/components/primitives/Table/GripIcon";
import { TableCell } from "@/components/primitives/Table/TableCell";
import type { TableColumn } from "@/components/primitives/Table/types";
import styles from "@/components/primitives/Table/Table.module.css";

export interface FlatRow<T> {
  id: string;
  data: T;
  depth: number;
  hasChildren: boolean;
  /** For each ancestor depth (0..depth-1), whether that ancestor still has a sibling after it (so its vertical line continues through this row). */
  ancestorContinues: boolean[];
  /** Whether this row itself is the last child among its siblings (its own connector line stops at its centre rather than continuing). */
  isLastChild: boolean;
}

export interface TableRowProps<T> {
  row: FlatRow<T>;
  columns: TableColumn<T>[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onActivate: (data: T) => void;
  isLast: boolean;
  draggable: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

function IndentGutters<T>({ row }: { row: FlatRow<T> }) {
  if (row.depth === 0) return null;

  const gutters: ReactNode[] = [];
  for (let level = 0; level < row.depth; level++) {
    const isConnectorLevel = level === row.depth - 1;
    if (!isConnectorLevel) {
      const continues = row.ancestorContinues[level];
      gutters.push(
        <div key={level} className={styles.indentGutter}>
          {continues && <div className={styles.indentGutterLine} style={{ height: "100%" }} />}
        </div>,
      );
    } else {
      gutters.push(
        <div key={level} className={styles.indentGutter}>
          <div className={styles.indentGutterLine} style={{ height: row.isLastChild ? "50%" : "100%" }} />
          <div className={styles.indentGutterStub} />
        </div>,
      );
    }
  }
  return <>{gutters}</>;
}

export function TableRow<T>({
  row,
  columns,
  isExpanded,
  onToggleExpand,
  onActivate,
  isLast,
  draggable,
  onMoveUp,
  onMoveDown,
}: TableRowProps<T>) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate(row.data);
    }
  }

  const [isGrabbed, setIsGrabbed] = useState(false);

  function handleHandleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onMoveUp?.(row.id);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMoveDown?.(row.id);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsGrabbed((prev) => !prev);
    }
  }

  const [firstColumn, ...restColumns] = columns;

  return (
    <div
      className={isLast ? `${styles.row} ${styles.rowLast}` : styles.row}
      role="row"
      tabIndex={0}
      onClick={() => onActivate(row.data)}
      onKeyDown={handleRowKeyDown}
    >
      <TableCell>
        <div className={styles.firstCell}>
          <IndentGutters row={row} />
          {draggable && (
            <button
              type="button"
              className={styles.dragHandle}
              aria-label="Reorder row. Use arrow up and down to move, Enter to pick up or drop."
              aria-grabbed={isGrabbed}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();
                handleHandleKeyDown(event);
              }}
              onBlur={() => setIsGrabbed(false)}
            >
              <GripIcon />
            </button>
          )}
          {row.hasChildren ? (
            <button
              type="button"
              className={styles.chevron}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand(row.id);
              }}
            >
              <span className={isExpanded ? `${styles.chevronGlyph} ${styles.chevronGlyphOpen}` : styles.chevronGlyph}>
                <ChevronIcon size={14} />
              </span>
            </button>
          ) : (
            <span className={styles.chevronSpacer} aria-hidden="true" />
          )}
          {firstColumn && firstColumn.render(row.data)}
        </div>
      </TableCell>
      {restColumns.map((column) => (
        <TableCell key={column.id} align={column.align} width={column.width} hideBelowTablet={column.hideBelowTablet}>
          {column.render(row.data)}
        </TableCell>
      ))}
    </div>
  );
}
