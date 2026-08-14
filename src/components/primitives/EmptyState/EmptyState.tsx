import type { ReactNode } from "react";
import { IconTile } from "@/components/primitives/IconTile";
import { Button } from "@/components/primitives/Button";
import styles from "@/components/primitives/EmptyState/EmptyState.module.css";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      {icon && <IconTile icon={icon} size="lg" />}
      <p className={styles.message}>{message}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
