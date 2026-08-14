import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/primitives/PageHeader";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PROJECT_BY_ID } from "@/fixtures";

export function GraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = projectId ? PROJECT_BY_ID[projectId] : undefined;

  if (!project) {
    return <NotFoundPage message="This project doesn't exist." />;
  }

  return <PageHeader title={`${project.name} — Dependency graph`} />;
}
