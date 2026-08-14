import type { TableRowData } from "@/components/primitives/Table/types";
import type { FlatRow } from "@/components/primitives/Table/TableRow";

export function flattenRows<T>(
  rows: TableRowData<T>[],
  expandedIds: ReadonlySet<string>,
  depth = 0,
  ancestorContinues: boolean[] = [],
): FlatRow<T>[] {
  const flat: FlatRow<T>[] = [];

  rows.forEach((row, index) => {
    const isLastChild = index === rows.length - 1;
    const hasChildren = Boolean(row.children && row.children.length > 0);

    flat.push({
      id: row.id,
      data: row.data,
      depth,
      hasChildren,
      ancestorContinues,
      isLastChild,
    });

    if (hasChildren && expandedIds.has(row.id)) {
      flat.push(
        ...flattenRows(row.children ?? [], expandedIds, depth + 1, [...ancestorContinues, !isLastChild]),
      );
    }
  });

  return flat;
}
