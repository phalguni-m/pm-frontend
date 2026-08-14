import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AppRouter } from "@/router";
import { MEMBER_BY_ID } from "@/fixtures";
import { TasksProvider } from "@/store/TasksContext";
import { useProjectsIndex } from "@/store/selectors";
import { projectMarkOf } from "@/lib/format";
import { CURRENT_USER_ID } from "@/lib/constants";
import type { StatusCounts } from "@/types/ui";

const WORKSPACE_NAME = "Group 37";

function completionPercent(counts: StatusCounts): number {
  const total = counts.to_do + counts.in_progress + counts.waiting + counts.blocked + counts.done;
  if (total === 0) return 0;
  return (counts.done / total) * 100;
}

const currentMember = MEMBER_BY_ID[CURRENT_USER_ID];
const currentUser = {
  name: currentMember?.name ?? "Unknown",
  email: currentMember?.email ?? "",
  initials: currentMember?.initials ?? "?",
};

function AppRoutes() {
  // Reads through the tasks store (not the raw PROJECTS_WITH_TASKS fixture)
  // so the sidebar's completion sparkline reflects live edits/deletes, same
  // as every other derived count in the app.
  const projects = useProjectsIndex();

  const sidebarProjects = projects.map((project) => ({
    id: project.id,
    name: project.name,
    mark: projectMarkOf(project.name),
    completionPercent: completionPercent(project.statusCounts),
    sections: project.sections.map((section) => ({ id: section.id, name: section.name })),
  }));

  return <AppRouter workspaceName={WORKSPACE_NAME} projects={sidebarProjects} currentUser={currentUser} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <TasksProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TasksProvider>
    </ThemeProvider>
  );
}
