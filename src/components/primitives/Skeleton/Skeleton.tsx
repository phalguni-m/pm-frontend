import styles from "@/components/primitives/Skeleton/Skeleton.module.css";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: "sm" | "md" | "lg";
  className?: string;
}

const RADIUS_VAR: Record<NonNullable<SkeletonProps["radius"]>, string> = {
  sm: "var(--radius-inner)",
  md: "var(--radius-control)",
  lg: "var(--radius-card)",
};

export function Skeleton({ width = "100%", height = 16, radius = "sm", className }: SkeletonProps) {
  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      style={{ width, height, borderRadius: RADIUS_VAR[radius] }}
      aria-hidden="true"
    />
  );
}
