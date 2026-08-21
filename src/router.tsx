import type React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

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

import type {
  SidebarProject,
  SidebarUser,
} from "@/components/layout/Sidebar";

import { getSession } from "@/lib/session";

export interface AppRouterProps {
  workspaceName: string;
  projects: SidebarProject[];
  currentUser: SidebarUser;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRouter({
  workspaceName,
  projects,
  currentUser,
}: AppRouterProps) {
  return (
    <Routes>

      {/* ==================== AUTH ==================== */}

      {/* Opening localhost:5173 always starts at Login */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>


      {/* ==================== OTHER PUBLIC ROUTE ==================== */}

      <Route
        path="/kitchen-sink"
        element={<KitchenSinkPage />}
      />


      {/* ==================== PROTECTED APP ==================== */}

      <Route
        element={
          <ProtectedRoute>
            <AppShell
              workspaceName={workspaceName}
              projects={projects}
              currentUser={currentUser}
            />
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={<HomePage />} />

        <Route path="/my-tasks" element={<MyTasksPage />} />

        <Route path="/projects" element={<ProjectsPage />} />

        <Route
          path="/projects/:projectId"
          element={<ProjectPage />}
        />

        <Route
          path="/projects/:projectId/sections/:sectionId"
          element={<SectionPage />}
        />

        <Route
          path="/projects/:projectId/graph"
          element={<GraphPage />}
        />

        <Route
          path="/projects/:projectId/insights"
          element={<InsightsPage />}
        />

        <Route
          path="/members"
          element={<MembersPage />}
        />

        <Route
          path="/history"
          element={<HistoryPage />}
        />

        <Route
          path="*"
          element={<NotFoundPage />}
        />
      </Route>

    </Routes>
  );
}