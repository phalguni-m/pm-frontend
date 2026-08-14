import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import styles from "@/components/layout/Sidebar/Sidebar.module.css";
import {
  HomeIcon,
  TasksIcon,
  MembersIcon,
  HistoryIcon,
  SettingsIcon,
  ChevronIcon,
  StepperIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
} from "@/components/icons";
import { SearchField } from "@/components/primitives/SearchField";
import { Avatar } from "@/components/primitives/Avatar";
import { ProjectMark } from "@/components/primitives/ProjectMark";
import { CompletionSparkline } from "@/components/primitives/CompletionSparkline";
import type { ThemePreference } from "@/theme/ThemeProvider";

export interface SidebarSection {
  id: string;
  name: string;
}

export interface SidebarProject {
  id: string;
  name: string;
  mark: string;
  completionPercent: number;
  sections: SidebarSection[];
}

export interface SidebarUser {
  name: string;
  email: string;
  initials: string;
}

export interface SidebarProps {
  workspaceName: string;
  projects: SidebarProject[];
  currentUser: SidebarUser;
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  onCycleTheme: () => void;
  /** "panel" is the fixed/rail sidebar; "drawer" is the off-canvas overlay instance. */
  variant?: "panel" | "drawer";
  onNavigate?: () => void;
}

const THEME_SEQUENCE: ThemePreference[] = ["light", "dark", "system"];

function nextThemeLabel(theme: ThemePreference): string {
  const index = THEME_SEQUENCE.indexOf(theme);
  const next = THEME_SEQUENCE[(index + 1) % THEME_SEQUENCE.length];
  return `Switch to ${next} theme`;
}

function ThemeIcon({ theme, resolvedTheme }: { theme: ThemePreference; resolvedTheme: "light" | "dark" }) {
  if (theme === "system") return <MonitorIcon size={14} />;
  return resolvedTheme === "dark" ? <MoonIcon size={14} /> : <SunIcon size={14} />;
}

function NavItem({
  to,
  end,
  icon,
  label,
  onNavigate,
}: {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
    >
      <span className={styles.navIcon}>{icon}</span>
      <span className={styles.navLabel}>{label}</span>
    </NavLink>
  );
}

function ProjectNavGroup({ project, onNavigate }: { project: SidebarProject; onNavigate?: () => void }) {
  const { projectId, sectionId } = useParams<{ projectId?: string; sectionId?: string }>();
  const isActiveProject = projectId === project.id;
  const [manuallyExpanded, setManuallyExpanded] = useState<boolean | null>(null);

  // Manual overrides are scoped to the current route: once the active project
  // changes, expansion reverts to being route-driven rather than sticking to
  // a stale click.
  useEffect(() => {
    setManuallyExpanded(null);
  }, [isActiveProject]);

  const expanded = manuallyExpanded ?? isActiveProject;

  return (
    <div>
      <div className={styles.projectRow}>
        <NavLink
          to={`/projects/${project.id}`}
          onClick={onNavigate}
          className={({ isActive }) => `${styles.projectLink} ${isActive ? styles.projectLinkActive : ""}`}
          aria-current={isActiveProject ? "page" : undefined}
        >
          <span className={styles.projectMark}>
            <ProjectMark mark={project.mark} name={project.name} size={20} />
          </span>
          <span className={styles.projectName}>{project.name}</span>
        </NavLink>
        <span className={styles.projectSparkline}>
          <CompletionSparkline percent={project.completionPercent} />
        </span>
        {project.sections.length > 0 && (
          <button
            type="button"
            className={styles.projectChevron}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${project.name}` : `Expand ${project.name}`}
            onClick={() => setManuallyExpanded((prev) => !(prev ?? isActiveProject))}
          >
            <span
              className={
                expanded ? `${styles.projectChevronGlyph} ${styles.projectChevronGlyphOpen}` : styles.projectChevronGlyph
              }
            >
              <ChevronIcon size={14} />
            </span>
          </button>
        )}
      </div>
      {expanded && project.sections.length > 0 && (
        <div className={styles.sectionList}>
          {project.sections.map((section) => (
            <NavLink
              key={section.id}
              to={`/projects/${project.id}/sections/${section.id}`}
              onClick={onNavigate}
              className={({ isActive }) => `${styles.sectionLink} ${isActive ? styles.sectionLinkActive : ""}`}
              aria-current={sectionId === section.id ? "page" : undefined}
            >
              {section.name}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  workspaceName,
  projects,
  currentUser,
  theme,
  resolvedTheme,
  onCycleTheme,
  variant = "panel",
  onNavigate,
}: SidebarProps) {
  const rootClassName = `${styles.root} ${variant === "drawer" ? styles.rootDrawer : ""}`;

  return (
    <nav aria-label="Main" className={rootClassName}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          SD
        </span>
        <span className={styles.wordmark}>Softdeck</span>
      </div>

      <button type="button" className={styles.miniCard} aria-label={`Switch workspace, currently ${workspaceName}`}>
        <Avatar initials="G3" name={workspaceName} size={36} />
        <span className={styles.miniCardText}>
          <span className={styles.miniCardEyebrow}>Workspace</span>
          <span className={styles.miniCardName}>{workspaceName}</span>
        </span>
        <span className={styles.miniCardGlyph}>
          <StepperIcon size={16} />
        </span>
      </button>

      <div className={styles.search}>
        <SearchField placeholder="Search" aria-label="Search" />
      </div>

      <div className={styles.scrollRegion}>
        <div className={styles.eyebrow}>Main menu</div>
        <div className={styles.navList}>
          <NavItem to="/" end icon={<HomeIcon size={18} />} label="Home" onNavigate={onNavigate} />
          <NavItem to="/my-tasks" icon={<TasksIcon size={18} />} label="My Tasks" onNavigate={onNavigate} />
          <NavItem to="/history" icon={<HistoryIcon size={18} />} label="History" onNavigate={onNavigate} />
          <NavItem to="/members" icon={<MembersIcon size={18} />} label="Members" onNavigate={onNavigate} />
          <NavItem to="/settings" icon={<SettingsIcon size={18} />} label="Settings" onNavigate={onNavigate} />
        </div>

        <div className={styles.eyebrow}>Projects</div>
        <div className={styles.navList}>
          {projects.map((project) => (
            <ProjectNavGroup key={project.id} project={project} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.miniCard} aria-label={`${currentUser.name}, account options`}>
          <Avatar initials={currentUser.initials} name={currentUser.name} size={32} />
          <span className={styles.miniCardText}>
            <span className={styles.miniCardName}>{currentUser.name}</span>
            <span className={styles.miniCardEmail}>{currentUser.email}</span>
          </span>
        </button>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={onCycleTheme}
          title={nextThemeLabel(theme)}
          aria-label={nextThemeLabel(theme)}
        >
          <span className={styles.themeToggleIcon}>
            <ThemeIcon theme={theme} resolvedTheme={resolvedTheme} />
          </span>
          {theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}
        </button>
      </div>
    </nav>
  );
}
