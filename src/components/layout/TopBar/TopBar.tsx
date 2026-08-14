import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import styles from "@/components/layout/TopBar/TopBar.module.css";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ChevronIcon, HamburgerIcon, SearchIcon, ComposeIcon } from "@/components/icons";

export interface TopBarProps {
  actions?: ReactNode;
  onOpenDrawer?: () => void;
  onSearch?: () => void;
  onCompose?: () => void;
}

export function TopBar({ actions, onOpenDrawer, onSearch, onCompose }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <button type="button" className={styles.hamburger} aria-label="Open navigation" onClick={onOpenDrawer}>
        <HamburgerIcon size={18} />
      </button>

      <div className={styles.navButtons}>
        <button
          type="button"
          className={`${styles.navButton} ${styles.back}`}
          aria-label="Go back"
          onClick={() => navigate(-1)}
        >
          <ChevronIcon size={14} />
        </button>
        <button type="button" className={styles.navButton} aria-label="Go forward" onClick={() => navigate(1)}>
          <ChevronIcon size={14} />
        </button>
      </div>

      <div className={styles.breadcrumbPill}>
        <Breadcrumbs />
      </div>

      {actions && <div className={styles.actions}>{actions}</div>}

      <button type="button" className={styles.mobileAction} aria-label="Search" onClick={onSearch}>
        <SearchIcon size={18} />
      </button>
      <button type="button" className={styles.mobileAction} aria-label="New task" onClick={onCompose}>
        <ComposeIcon size={18} />
      </button>
    </div>
  );
}
