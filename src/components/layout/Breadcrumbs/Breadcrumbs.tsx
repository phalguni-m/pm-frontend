import { Link, useParams } from "react-router-dom";
import styles from "@/components/layout/Breadcrumbs/Breadcrumbs.module.css";
import { SECTION_BY_ID } from "@/fixtures";
import { useTasksContext, baseProjectOf } from "@/store";

const TRUNCATE_AT = 24;

function truncate(label: string): { text: string; title?: string } {
  if (label.length <= TRUNCATE_AT) return { text: label };
  return { text: `${label.slice(0, TRUNCATE_AT)}…`, title: label };
}

interface Crumb {
  key: string;
  label: string;
  to?: string;
}

export function Breadcrumbs() {
  const { projectId, sectionId } = useParams<{ projectId?: string; sectionId?: string }>();
  const { state } = useTasksContext();

  const crumbs: Crumb[] = [{ key: "workspace", label: "Group 37", to: "/" }];

  if (projectId) {
    const project = baseProjectOf(projectId, state.projectsById);
    if (project) {
      crumbs.push({
        key: "project",
        label: project.name,
        to: sectionId ? `/projects/${project.id}` : undefined,
      });
    }
  }

  if (sectionId) {
    const section = SECTION_BY_ID[sectionId];
    if (section) {
      crumbs.push({ key: "section", label: section.name });
    }
  }

  return (
    <div className={styles.root}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const { text, title } = truncate(crumb.label);
        return (
          <span key={crumb.key} className={styles.crumb}>
            {index > 0 && <span className={styles.separator}>/</span>}
            {!isLast && crumb.to ? (
              <Link to={crumb.to} className={styles.segment} title={title}>
                {text}
              </Link>
            ) : (
              <span className={styles.segmentCurrent} title={title} aria-current={isLast ? "page" : undefined}>
                {text}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
