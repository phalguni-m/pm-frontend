import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import styles from "@/components/layout/AppShell/AppShell.module.css";
import { Sidebar, type SidebarProject, type SidebarUser } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useTheme } from "@/theme/useTheme";
import type { ThemePreference } from "@/theme/ThemeProvider";

export interface AppShellProps {
  workspaceName: string;
  projects: SidebarProject[];
  currentUser: SidebarUser;
  topBarActions?: ReactNode;
}

const THEME_SEQUENCE: ThemePreference[] = ["light", "dark", "system"];

export function AppShell({ workspaceName, projects, currentUser, topBarActions }: AppShellProps) {
  const { theme, resolved, setTheme } = useTheme();
  const location = useLocation();
  const drawer = useDisclosure(false);

  const cycleTheme = () => {
    const index = THEME_SEQUENCE.indexOf(theme);
    const next = THEME_SEQUENCE[(index + 1) % THEME_SEQUENCE.length];
    setTheme(next ?? "system");
  };

  useEscapeKey(drawer.close, drawer.isOpen);

  useEffect(() => {
    drawer.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer.isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawer.isOpen]);

  const drawerRef = useFocusTrap<HTMLDivElement>(drawer.isOpen);

  return (
    <div className={styles.root}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <div className={styles.panelSidebar}>
        <Sidebar
          workspaceName={workspaceName}
          projects={projects}
          currentUser={currentUser}
          theme={theme}
          resolvedTheme={resolved}
          onCycleTheme={cycleTheme}
          variant="panel"
        />
      </div>

      {drawer.isOpen && (
        <>
          <div className={styles.backdrop} onClick={drawer.close} />
          <div ref={drawerRef}>
            <Sidebar
              workspaceName={workspaceName}
              projects={projects}
              currentUser={currentUser}
              theme={theme}
              resolvedTheme={resolved}
              onCycleTheme={cycleTheme}
              variant="drawer"
              onNavigate={drawer.close}
            />
          </div>
        </>
      )}

      <div className={styles.main}>
        <TopBar actions={topBarActions} onOpenDrawer={drawer.open} />
        <div className={styles.scrollRegion}>
          <main id="main-content" className={styles.pageGrid}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
