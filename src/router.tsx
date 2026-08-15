import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { HomePage } from "@/pages/HomePage";
import { MyTasksPage } from "@/pages/MyTasksPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { SectionPage } from "@/pages/SectionPage";
import { GraphPage } from "@/pages/GraphPage";
import { InsightsPage } from "@/pages/InsightsPage";
import { MembersPage } from "@/pages/MembersPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
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

      {/* The only routes outside AppShell — no sidebar, no topbar, no
          breadcrumbs. Unowned stubs (Block 19); see HANDOFF.md. */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<AppShell workspaceName={workspaceName} projects={projects} currentUser={currentUser} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/projects/:projectId/sections/:sectionId" element={<SectionPage />} />
        <Route path="/projects/:projectId/graph" element={<GraphPage />} />
        <Route path="/projects/:projectId/insights" element={<InsightsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
