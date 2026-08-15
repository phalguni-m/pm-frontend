import { useNavigate } from "react-router-dom";
import styles from "@/pages/ProjectsPage/ProjectsPage.module.css";
import { ProjectsTable, type ProjectsRow } from "@/components/project/ProjectsTable";

export function ProjectsPage() {
  const navigate = useNavigate();

  function handleActivate(row: ProjectsRow) {
    if (row.kind === "project") {
      navigate(`/projects/${row.project.id}`);
    } else if (row.kind === "section") {
      navigate(`/projects/${row.project.id}/sections/${row.section.id}`);
    } else {
      navigate(`/projects/${row.project.id}/sections/${row.task.sectionId}?task=${row.task.id}`);
    }
  }

  return (
    <div className={styles.root}>
      <ProjectsTable title="Projects" subtitle="All projects, searchable." onRowActivate={handleActivate} />
    </div>
  );
}
