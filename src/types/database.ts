export type PriorityLevel = "low" | "medium" | "high" | "critical";
export type StatusType = "to_do" | "in_progress" | "waiting" | "blocked" | "done";
export type RoleType = "admin" | "editor" | "viewer";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  job_role_id: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  role: RoleType;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string | null;
  user_id: string | null;
  role: RoleType;
}

export interface Section {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  position: number;
  created_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  section_id: string | null;
  delay_cause_id: string | null;
  parent_task_id: string | null;
  priority: PriorityLevel;
  start_date: string | null;
  due_date: string | null;
  position: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
  status: StatusType;
}

export interface TaskDep {
  id: string;
  blocking_task_id: string | null;
  blocked_task_id: string | null;
  created_at: string | null;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  task_snapshot: Partial<Task> | null;
  user_id: string;
  event_type: string;
  created_at: string;
}

export interface AssigneeEvent {
  id: string;
  task_id: string | null;
  project_id: string | null;
  user_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}


export interface TaskAssignee {
  id: string;
  task_id: string | null;
  user_id: string | null;
}

export interface StatusTimeline {
  taskId: string;
  status: StatusType;
  enteredAt: string;
  exitedAt: string | null;
  durationHours: number | null;
}

export interface AssigneeHandoff {
  taskId: string;
  eventType: "assignee_added" | "assignee_removed";
  fromUserId: string | null;
  toUserId: string | null;
  changedAt: string;
  gapHours: number | null;
}

export interface CriticalPathResult {
  targetTaskId: string;
  chain: Task[];
  totalDurationDays: number;
  estimatedCompletionDate: string | null;
}

export interface TaskImpact {
  taskId: string;
  directDependents: number;
  totalDependents: number;
  blockedDependents: number;
}
