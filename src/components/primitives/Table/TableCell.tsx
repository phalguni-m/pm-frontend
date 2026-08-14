import type { ReactNode } from "react";
import type { TableColumn } from "@/components/primitives/Table/types";
import styles from "@/components/primitives/Table/Table.module.css";

export interface TableCellProps {
  align?: "start" | "end";
  width?: TableColumn<unknown>["width"];
  hideBelowTablet?: boolean;
  children: ReactNode;
}

export function TableCell({ align = "start", width = "flex", hideBelowTablet = false, children }: TableCellProps) {
  const classNames = [styles.cell];
  if (width === "content") classNames.push(styles.cellContent);
  if (hideBelowTablet) classNames.push(styles.cellHideBelowTablet);

  return (
    <div className={classNames.join(" ")} role="cell" style={{ justifyContent: align === "end" ? "flex-end" : "flex-start" }}>
      {children}
    </div>
  );
}
