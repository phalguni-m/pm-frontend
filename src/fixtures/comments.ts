import type { Comment } from "@/types/ui";
import { MEMBER_BY_ID } from "@/fixtures/members";

// No comments table exists in database.ts yet — see the ASSUMPTION 3 note in
// src/types/ui.ts. Fixtures only.
interface CommentSeed {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

const SEEDS: CommentSeed[] = [
  {
    id: "comment-1",
    taskId: "task-triage-rules",
    authorId: "member-vismaya",
    body: "Danger-sign thresholds are drafted — waiting on clinical sign-off before we lock the rule engine.",
    createdAt: "2026-06-18T10:00:00.000Z",
  },
  {
    id: "comment-2",
    taskId: "task-triage-rules",
    authorId: "member-phalguni",
    body: "Sent to the review board this morning, should hear back by Friday.",
    createdAt: "2026-06-19T08:30:00.000Z",
  },
  {
    id: "comment-3",
    taskId: "task-offline-sync",
    authorId: "member-namana",
    body: "Sync queue is holding up under the flaky-network test matrix. Conflict resolution is next.",
    createdAt: "2026-07-02T14:00:00.000Z",
  },
];

export const COMMENTS: Comment[] = SEEDS.map((seed) => {
  const author = MEMBER_BY_ID[seed.authorId];
  if (!author) throw new Error(`Unknown comment author: ${seed.authorId}`);
  return {
    id: seed.id,
    taskId: seed.taskId,
    author,
    body: seed.body,
    createdAt: seed.createdAt,
  };
});
