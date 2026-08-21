import { useEffect, useMemo, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { CloseIcon, ChevronIcon, LinkIcon } from "@/components/icons";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { Textarea } from "@/components/primitives/Textarea";
import { DropdownPill } from "@/components/primitives/DropdownPill";
import { Avatar } from "@/components/primitives/Avatar";
import { StatusPill } from "@/components/primitives/StatusPill";
import { PriorityChip } from "@/components/primitives/PriorityChip";
import { WaitingIndicator } from "@/components/primitives/WaitingIndicator";
import { AbsentValue } from "@/components/primitives/AbsentValue";
import { RiskBadge } from "@/components/primitives/RiskBadge";
import { IconTile } from "@/components/primitives/IconTile";
import { Tabs } from "@/components/primitives/Tabs";
import { NewTaskDialog } from "@/components/task/NewTaskDialog";
import { STATUS_ORDER, STATUS_LABEL, PRIORITY_ORDER, PRIORITY_LABEL, KNOWN_EVENT_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime, riskTierOf, sentenceCase } from "@/lib/format";
import type { StatusType, PriorityLevel } from "@/types/database";
import type { Comment, DelayCause, HistoryEntry, Member, TaskDraft, TaskIntelligence, TaskPatch, TaskState, TaskView } from "@/types/ui";
import styles from "@/components/task/TaskPanel/TaskPanel.module.css";

export interface TaskPanelProps {
  task: TaskView;
  intelligence?: TaskIntelligence;
  delayCauses: DelayCause[];
  projectMembers: Member[];
  comments: Comment[];
  history: HistoryEntry[];
  onClose: () => void;
  onSubtaskActivate: (taskId: string) => void;
  /** Only called when the draft state is valid — a "waiting" draft with no cause never reaches here. */
  onSave: (patch: TaskPatch & { state: TaskState; assigneeIds: string[] }) => void;
  onDelete: () => void;
  onAddComment: (body: string) => void;
  onCreateSubtask: (draft: TaskDraft) => void;
}

type PanelTab = "details" | "comments" | "history";

const TAB_ITEMS: { id: PanelTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "comments", label: "Comments" },
  { id: "history", label: "History" },
];

function HistoryEventLabel({ eventType }: { eventType: string }) {
  if ((KNOWN_EVENT_TYPES as readonly string[]).includes(eventType)) {
    return <>{eventType.replace(/_/g, " ")}</>;
  }
  return <>Activity</>;
}

export function TaskPanel({
  task,
  intelligence,
  delayCauses,
  projectMembers,
  comments,
  history,
  onClose,
  onSubtaskActivate,
  onSave,
  onDelete,
  onAddComment,
  onCreateSubtask,
}: TaskPanelProps) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  useEscapeKey(onClose, true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<PanelTab>("details");
  const [isNewSubtaskOpen, setIsNewSubtaskOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [draftStatus, setDraftStatus] = useState<StatusType>(task.state.status);
  const [draftDelayCauseId, setDraftDelayCauseId] = useState<string | null>(
    task.state.status === "waiting" ? task.state.delayCause?.id ?? null : null,
  );
  const [draftPriority, setDraftPriority] = useState<PriorityLevel>(task.priority);
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>(task.assignees.map((m) => m.id));
  const [commentDraft, setCommentDraft] = useState("");

  // Reset local draft state whenever a different task is opened.
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDraftStatus(task.state.status);
    setDraftDelayCauseId(task.state.status === "waiting" ? task.state.delayCause?.id ?? null : null);
    setDraftPriority(task.priority);
    setDraftAssigneeIds(task.assignees.map((m) => m.id));
    setActiveTab("details");
  }, [task]);

  const justEnteredWaiting = draftStatus === "waiting" && draftDelayCauseId === null;

  const [causeMenuOpen, setCauseMenuOpen] = useState(false);

  // The instant status becomes "waiting" with no cause chosen yet, the cause
  // picker's menu opens on its own rather than waiting for a second click.
  useEffect(() => {
    if (justEnteredWaiting) setCauseMenuOpen(true);
  }, [justEnteredWaiting]);

  // THE WAITING RULE: Save is disabled until a cause is chosen. This is a UI
  // reflection of the TaskState discriminated union in src/types/ui.ts, not a
  // re-implementation of it — the union is what makes an invalid combination
  // impossible to construct below.
  const canSave = draftStatus !== "waiting" || draftDelayCauseId !== null;

  function buildDraftState(): TaskState | null {
    if (draftStatus === "waiting") {
      const cause = delayCauses.find((c) => c.id === draftDelayCauseId);
      if (!cause) return null;
      return { status: "waiting", delayCause: cause, waitingSince: new Date().toISOString() };
    }
    return { status: draftStatus, delayCause: null, waitingSince: null };
  }

  function handleSave() {
    const state = buildDraftState();
    if (!state) return;
    onSave({
      title,
      description: description || null,
      priority: draftPriority,
      state,
      assigneeIds: draftAssigneeIds,
    });
  }

  function toggleAssignee(memberId: string) {
    setDraftAssigneeIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  }

  // Refs are refreshed against live task state by the store's selector layer
  // (see refreshRef in src/store/selectors.ts) before this prop ever arrives
  // here, so a ref's isDeleted reflects whether the task it points at is
  // still around right now — a deleted blocker shouldn't keep counting
  // toward the link total or showing up in Blocked by / Blocking.
  const liveDependsOn = task.dependsOn.filter((ref) => !ref.isDeleted);
  const liveBlocks = task.blocks.filter((ref) => !ref.isDeleted);
  const depCount = liveDependsOn.length + liveBlocks.length;
  const impactScore = intelligence?.impact;

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments],
  );
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [history],
  );

  return (
    <>
      <div className={styles.scrim} onMouseDown={onClose} />
      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${task.title}`}
      >
        <div className={styles.header}>
          <div className={styles.headerTopRow}>
            <button type="button" className={styles.backButton} aria-label="Back" onClick={onClose}>
              <ChevronIcon size={16} />
            </button>
            <PriorityChip priority={draftPriority} />
            <StatusPill status={draftStatus} />
            {draftStatus === "waiting" && draftDelayCauseId && (
              <WaitingIndicator
                waitingSince={task.state.status === "waiting" && task.state.waitingSince !== null ? task.state.waitingSince : new Date().toISOString()}
                causeName={delayCauses.find((c) => c.id === draftDelayCauseId)?.name ?? ""}
              />
            )}
            <span className={styles.headerSpacer} />
            <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>
              <CloseIcon size={16} />
            </button>
          </div>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Task title"
          />
        </div>

        <div className={styles.body} tabIndex={0}>
          <div className={styles.metaStrip}>
            Created by {task.createdBy?.name ?? "Unknown"} &middot; {formatDate(task.createdAt)}
            {task.updatedAt && <> &middot; Updated {formatDate(task.updatedAt)}</>}
          </div>

          <div className={styles.fieldGrid}>
            <Field label="Status" htmlFor="task-panel-status">
              <DropdownPill
                label={STATUS_LABEL[draftStatus]}
                items={STATUS_ORDER.map((status) => ({ id: status, label: STATUS_LABEL[status], selected: status === draftStatus }))}
                onSelect={(id) => {
                  const nextStatus = id as StatusType;
                  setDraftStatus(nextStatus);
                  // Leaving "waiting" clears the drafted cause so returning to
                  // "waiting" later in the same session re-prompts exactly like
                  // a first entry (auto-open menu, required-field asterisk,
                  // Save disabled) instead of silently reusing a cause the user
                  // never reconfirmed for this waiting period.
                  if (nextStatus !== "waiting") setDraftDelayCauseId(null);
                }}
              />
            </Field>
            <Field label="Priority" htmlFor="task-panel-priority">
              <DropdownPill
                label={PRIORITY_LABEL[draftPriority]}
                items={PRIORITY_ORDER.map((p) => ({ id: p, label: PRIORITY_LABEL[p], selected: p === draftPriority }))}
                onSelect={(id) => setDraftPriority(id as PriorityLevel)}
              />
            </Field>

            {draftStatus === "waiting" && (
              <div className={styles.fieldFullWidth}>
                <Field label="Delay cause" htmlFor="task-panel-cause" required errorMessage={justEnteredWaiting ? "Choose a cause before saving." : undefined}>
                  <DropdownPill
                    label={sentenceCase(delayCauses.find((c) => c.id === draftDelayCauseId)?.name ?? "Choose a cause")}
                    items={delayCauses.map((cause) => ({ id: cause.id, label: sentenceCase(cause.name), selected: cause.id === draftDelayCauseId }))}
                    onSelect={(id) => {
                      setDraftDelayCauseId(id);
                      setCauseMenuOpen(false);
                    }}
                    isOpen={causeMenuOpen}
                    onOpenChange={setCauseMenuOpen}
                  />
                </Field>
              </div>
            )}

            <Field label="Assignees" htmlFor="task-panel-assignees">
              <div className={styles.assigneeChips} id="task-panel-assignees">
                {projectMembers.map((member) => {
                  const selected = draftAssigneeIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={selected ? `${styles.assigneeChip} ${styles.assigneeChipSelected}` : styles.assigneeChip}
                      onClick={() => toggleAssignee(member.id)}
                      aria-pressed={selected}
                    >
                      <Avatar initials={member.initials} name={member.name} size={20} />
                      {member.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Start" htmlFor="task-panel-start">
              {task.startDate ? (
                <span className={styles.readOnlyValue}>{formatDate(task.startDate)}</span>
              ) : (
                <span className={styles.readOnlyValue}>
                  <AbsentValue />
                </span>
              )}
            </Field>
            <Field label="Due" htmlFor="task-panel-due">
              {task.dueDate ? (
                <span className={styles.readOnlyValue}>{formatDate(task.dueDate)}</span>
              ) : (
                <span className={styles.readOnlyValue}>
                  <AbsentValue />
                </span>
              )}
            </Field>

            <Field label="Risk" htmlFor="task-panel-risk">
              <span className={styles.readOnlyValue}>{intelligence ? <RiskBadge tier={riskTierOf(intelligence.riskScore)} /> : <AbsentValue />}</span>
            </Field>
            <Field label="Impact" htmlFor="task-panel-impact">
              <span className={styles.readOnlyValue}>{impactScore !== undefined ? <span className="tabular">{impactScore}</span> : <AbsentValue />}</span>
            </Field>
          </div>

          <div className={styles.depStrip}>
            {depCount} links &middot; Impact score: {impactScore ?? "—"}
          </div>

          <Tabs
            tabs={TAB_ITEMS}
            activeTabId={activeTab}
            onChange={(id) => setActiveTab(id as PanelTab)}
            ariaLabel="Task detail tabs"
          >
            <div className={styles.tabsRegion}>
              {activeTab === "details" && (
                <div className={styles.tabSections}>
                  <div>
                    <div className={styles.sectionLabel}>Description</div>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Add a description..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <div className={styles.sectionLabelRow}>
                      <div className={styles.sectionLabel}>Subtasks</div>
                      <button type="button" className={styles.addSubtaskLink} onClick={() => setIsNewSubtaskOpen(true)}>
                        + Add subtask
                      </button>
                    </div>
                    <div className={styles.subtaskList}>
                      {task.subtasks.length === 0 && <AbsentValue />}
                      {task.subtasks.map((subtask) => (
                        <button
                          key={subtask.id}
                          type="button"
                          className={styles.subtaskRow}
                          onClick={() => onSubtaskActivate(subtask.id)}
                        >
                          <StatusPill status={subtask.status} />
                          <span className={styles.subtaskTitle}>{subtask.title}</span>
                          <PriorityChip priority={subtask.priority} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={styles.sectionLabel}>Blocked by</div>
                    <div className={styles.depList}>
                      {liveDependsOn.length === 0 && <AbsentValue />}
                      {liveDependsOn.map((dep) => (
                        <div key={dep.id} className={styles.depRow}>
                          <StatusPill status={dep.status} />
                          <span className={styles.depTitle}>{dep.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={styles.sectionLabel}>Blocking</div>
                    <div className={styles.depList}>
                      {liveBlocks.length === 0 && <AbsentValue />}
                      {liveBlocks.map((dep) => (
                        <div key={dep.id} className={styles.depRow}>
                          <StatusPill status={dep.status} />
                          <span className={styles.depTitle}>{dep.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div className={styles.tabSections}>
                  <div className={styles.composer}>
                    <Avatar initials="PM" name="You" size={32} />
                    <div className={styles.composerBody}>
                      <Textarea
                        bordered
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        placeholder="Write a comment..."
                        rows={3}
                      />
                      <Button
                        variant="primary"
                        disabled={commentDraft.trim().length === 0}
                        onClick={() => {
                          onAddComment(commentDraft);
                          setCommentDraft("");
                        }}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>

                  {sortedComments.length === 0 && <AbsentValue />}
                  {sortedComments.map((comment) => (
                    <div key={comment.id} className={styles.commentRow}>
                      <Avatar initials={comment.author.initials} name={comment.author.name} size={32} />
                      <div className={styles.commentBody}>
                        <div className={styles.commentMeta}>
                          <span className={styles.commentAuthor}>{comment.author.name}</span>
                          <span className={styles.commentTime}>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p className={styles.commentText}>{comment.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "history" && (
                <div className={styles.historyList}>
                  {sortedHistory.length === 0 && <AbsentValue />}
                  {sortedHistory.map((entry) => (
                    <div key={entry.id} className={styles.historyRow}>
                      <span className={styles.historyIconTile}>
                        <IconTile size="sm" icon={<LinkIcon size={14} />} />
                      </span>
                      <div className={styles.historyBody}>
                        <div className={styles.historyType}>
                          <HistoryEventLabel eventType={entry.eventType} />
                        </div>
                        {entry.changes.length > 0 && (
                          <div className={styles.historyDetail}>
                            {entry.changes
                              .map((change) => {
                                const isDelayCause = change.field === "delayCause";
                                const from = change.from && isDelayCause ? sentenceCase(change.from) : change.from ?? "—";
                                const to = change.to && isDelayCause ? sentenceCase(change.to) : change.to ?? "—";
                                return `${change.field}: ${from} → ${to}`;
                              })
                              .join(", ")}
                          </div>
                        )}
                        <div className={styles.historyMeta}>
                          {entry.actor?.name ?? "Unknown"} &middot; {formatDateTime(entry.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </div>

        <div className={styles.footer}>
          <Button variant="quiet" onClick={onDelete}>
            Delete
          </Button>
          <div className={styles.footerActions}>
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSave} onClick={handleSave}>
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <NewTaskDialog
        isOpen={isNewSubtaskOpen}
        onClose={() => setIsNewSubtaskOpen(false)}
        projectId={task.projectId}
        sectionId={task.sectionId}
        parentTaskId={task.id}
        projectMembers={projectMembers}
        onCreate={onCreateSubtask}
      />
    </>
  );
}
