import type { ReactNode } from "react";
import styles from "@/components/primitives/IconTile/IconTile.module.css";

export interface IconTileProps {
  icon: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<IconTileProps["size"]>, string | undefined> = {
  sm: styles.sizeSm,
  md: undefined,
  lg: styles.sizeLg,
};

export function IconTile({ icon, size = "md" }: IconTileProps) {
  const sizeClass = SIZE_CLASS[size];
  return <div className={sizeClass ? `${styles.root} ${sizeClass}` : styles.root}>{icon}</div>;
}
