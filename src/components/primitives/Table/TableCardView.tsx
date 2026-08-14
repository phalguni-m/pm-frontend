import type { ReactNode } from "react";
import { ChevronIcon } from "@/components/icons";
import { Skeleton } from "@/components/primitives/Skeleton";
import type { TableColumn, TableRowData } from "@/components/primitives/Table/types";
import styles from "@/components/primitives/Table/TableCardView.module.css";

export interface TableCardViewProps<T> {
  columns: TableColumn<T>[];
  rows: TableRowData<T>[];
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onRowActivate: (row: T) => void;
  isLoading?: boolean;
  loadingRowCount?: number;
  emptyState?: ReactNode;
}

function slotContent<T>(columns: TableColumn<T>[], slot: TableColumn<T>["cardSlot"], data: T): ReactNode[] {
  return columns.filter((column) => column.cardSlot === slot).map((column) => <span key={column.id}>{column.render(data)}</span>);
}

function CardRow<T>({
  row,
  columns,
  expandedIds,
  onToggleExpand,
  onRowActivate,
}: {
  row: TableRowData<T>;
  columns: TableColumn<T>[];
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onRowActivate: (row: T) => void;
}) {
  const hasChildren = Boolean(row.children && row.children.length > 0);
  const isExpanded = expandedIds.has(row.id);

  const title = slotContent(columns, "title", row.data);
  const meta = slotContent(columns, "meta", row.data);
  const footerStart = slotContent(columns, "footerStart", row.data);
  const footerEnd = slotContent(columns, "footerEnd", row.data);

  return (
    <div>
      <div className={styles.cardRow} role="button" tabIndex={0} onClick={() => onRowActivate(row.data)}>
        <div className={styles.cardTitleLine}>
          {hasChildren && (
            <button
              type="button"
              className={styles.cardChevron}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand(row.id);
              }}
            >
              <span className={isExpanded ? `${styles.cardChevronGlyph} ${styles.cardChevronGlyphOpen}` : styles.cardChevronGlyph}>
                <ChevronIcon size={14} />
              </span>
            </button>
          )}
          <div className={styles.cardTitleContent}>{title}</div>
        </div>
        {meta.length > 0 && <div className={styles.cardMetaLine}>{meta}</div>}
        {(footerStart.length > 0 || footerEnd.length > 0) && (
          <div className={styles.cardFooterLine}>
            <div className={styles.cardFooterStart}>{footerStart}</div>
            <div className={styles.cardFooterEnd}>{footerEnd}</div>
          </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.childStack}>
          {row.children?.map((child) => (
            <CardRow
              key={child.id}
              row={child}
              columns={columns}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onRowActivate={onRowActivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TableCardView<T>({
  columns,
  rows,
  expandedIds,
  onToggleExpand,
  onRowActivate,
  isLoading = false,
  loadingRowCount = 4,
  emptyState,
}: TableCardViewProps<T>) {
  if (isLoading) {
    return (
      <div className={styles.stack}>
        {Array.from({ length: loadingRowCount }, (_, index) => (
          <div key={index} className={styles.loadingCard}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={13} />
            <Skeleton width="80%" height={13} />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className={styles.emptyState}>{emptyState}</div>;
  }

  return (
    <div className={styles.stack}>
      {rows.map((row) => (
        <CardRow
          key={row.id}
          row={row}
          columns={columns}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onRowActivate={onRowActivate}
        />
      ))}
    </div>
  );
}
