import type { ProjectView, SectionView, StatusCounts } from "@/types/ui";
import { MEMBERS, MEMBER_BY_ID } from "@/fixtures/members";

function emptyCounts(): StatusCounts {
  return { to_do: 0, in_progress: 0, waiting: 0, blocked: 0, done: 0 };
}

// Sections are populated with their tasks in fixtures/index.ts, once tasks.ts
// exists, to avoid a circular import between projects.ts and tasks.ts.
export const PROJECT_HEALTHBRIDGE_ID = "project-healthbridge";
export const PROJECT_ATLAS_CORE_ID = "project-atlas-core";
export const PROJECT_API_GATEWAY_ID = "project-api-gateway";

export const SECTION_CORE_TRIAGE_ID = "section-core-triage";
export const SECTION_REPORTS_ANALYTICS_ID = "section-reports-analytics";
export const SECTION_DESIGN_ID = "section-design";
export const SECTION_FRONTEND_ID = "section-frontend";
export const SECTION_BACKEND_ID = "section-backend";
export const SECTION_AUTH_LAYER_ID = "section-auth-layer";
export const SECTION_INFRASTRUCTURE_ID = "section-infrastructure";

interface ProjectSeed {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  sections: { id: string; name: string; description: string | null; position: number }[];
}

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    id: PROJECT_HEALTHBRIDGE_ID,
    name: "HealthBridge",
    description: "WHO/IMCI community health triage tool",
    memberIds: [
      "member-phalguni",
      "member-vismaya",
      "member-namana",
    ],
    sections: [
      { id: SECTION_CORE_TRIAGE_ID, name: "Core Triage", description: "Symptom capture and triage logic", position: 0 },
      { id: SECTION_REPORTS_ANALYTICS_ID, name: "Reports & Analytics", description: "Field reporting and outcome dashboards", position: 1 },
    ],
  },
  {
    id: PROJECT_ATLAS_CORE_ID,
    name: "Atlas Core",
    description: "Workspace and project management platform",
    memberIds: [
      "member-phalguni",
      "member-vismaya",
      "member-namana",
      "member-purva",
    ],
    sections: [
      { id: SECTION_DESIGN_ID, name: "Design", description: "Design system and UX flows", position: 0 },
      { id: SECTION_FRONTEND_ID, name: "Frontend", description: "React app and component library", position: 1 },
      { id: SECTION_BACKEND_ID, name: "Backend", description: "API and persistence layer", position: 2 },
    ],
  },
  {
    id: PROJECT_API_GATEWAY_ID,
    name: "API Gateway",
    description: "Backend services and authentication layer",
    memberIds: ["member-phalguni", "member-purva"],
    sections: [
      { id: SECTION_AUTH_LAYER_ID, name: "Auth Layer", description: "Authentication and session handling", position: 0 },
      { id: SECTION_INFRASTRUCTURE_ID, name: "Infrastructure", description: "Deployment and observability", position: 1 },
    ],
  },
];

export const PROJECTS: ProjectView[] = PROJECT_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  description: seed.description,
  members: seed.memberIds.map((id) => MEMBER_BY_ID[id]).filter((m): m is (typeof MEMBERS)[number] => m !== undefined),
  sections: seed.sections.map(
    (section): SectionView => ({
      id: section.id,
      projectId: seed.id,
      name: section.name,
      description: section.description,
      position: section.position,
      tasks: [],
    }),
  ),
  statusCounts: emptyCounts(),
  createdAt: "2026-01-15T09:00:00.000Z",
  isDeleted: false,
}));

export const PROJECT_BY_ID: Record<string, ProjectView> = Object.fromEntries(
  PROJECTS.map((p) => [p.id, p]),
);
