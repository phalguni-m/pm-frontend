import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { MyTasksPage } from "@/pages/MyTasksPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { SectionPage } from "@/pages/SectionPage";
import { GraphPage } from "@/pages/GraphPage";
import { MembersPage } from "@/pages/MembersPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { KitchenSinkPage } from "@/pages/KitchenSinkPage";
import type { SidebarProject, SidebarUser } from "@/components/layout/Sidebar";

export interface AppRouterProps {
  workspaceName: string;
  projects: SidebarProject[];
  currentUser: SidebarUser;
}

/**
 * Opening a task sets a `?task={id}` search param on whatever route is
 * active, rather than a dedicated path — the task panel reads/writes that
 * param directly (see later blocks), so no route entry exists for it here.
 */
export function AppRouter({ workspaceName, projects, currentUser }: AppRouterProps) {
  return (
    <Routes>
      {/* Temporary QA route for Blocks 2-4 primitives — remove once every primitive has a real page consumer. */}
      <Route path="/kitchen-sink" element={<KitchenSinkPage />} />

      <Route element={<AppShell workspaceName={workspaceName} projects={projects} currentUser={currentUser} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/projects/:projectId/sections/:sectionId" element={<SectionPage />} />
        <Route path="/projects/:projectId/graph" element={<GraphPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
