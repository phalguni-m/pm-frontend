import { useEffect, useState } from "react";
import { Dialog } from "@/components/primitives/Dialog";
import { Field } from "@/components/primitives/Field";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import { DropdownPill } from "@/components/primitives/DropdownPill";
import { Avatar } from "@/components/primitives/Avatar";
import { Button } from "@/components/primitives/Button";
import { PRIORITY_ORDER, PRIORITY_LABEL, DEFAULT_PRIORITY } from "@/lib/constants";
import type { PriorityLevel } from "@/types/database";
import type { Member, TaskDraft } from "@/types/ui";
import styles from "@/components/task/NewTaskDialog/NewTaskDialog.module.css";

export interface NewTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fixed by the entry point the dialog was opened from — never user-editable. */
  projectId: string;
  sectionId: string | null;
  parentTaskId: string | null;
  projectMembers: Member[];
  onCreate: (draft: TaskDraft) => void;
}

export function NewTaskDialog({
  isOpen,
  onClose,
  projectId,
  sectionId,
  parentTaskId,
  projectMembers,
  onCreate,
}: NewTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(DEFAULT_PRIORITY);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  // Fresh draft every time the dialog opens, so a cancelled create doesn't
  // leave stale field values behind for next time.
  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setDescription("");
    setPriority(DEFAULT_PRIORITY);
    setStartDate("");
    setDueDate("");
    setAssigneeIds([]);
  }, [isOpen]);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]));
  }

  const canCreate = title.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;
    onCreate({
      title: title.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
      projectId,
      sectionId,
      parentTaskId,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
      assigneeIds,
    });
    onClose();
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={parentTaskId ? "New subtask" : "New task"}
      onClose={onClose}
      footer={
        <>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!canCreate}>
            Create
          </Button>
        </>
      }
    >
      <div className={styles.fields}>
        <Field label="Title" htmlFor="new-task-title" required>
          <Input
            id="new-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="new-task-description">
          <Textarea
            id="new-task-description"
            bordered
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a description..."
            rows={3}
          />
        </Field>

        <div className={styles.row}>
          <Field label="Priority" htmlFor="new-task-priority">
            <DropdownPill
              label={PRIORITY_LABEL[priority]}
              items={PRIORITY_ORDER.map((p) => ({ id: p, label: PRIORITY_LABEL[p], selected: p === priority }))}
              onSelect={(id) => setPriority(id as PriorityLevel)}
            />
          </Field>
        </div>

        <div className={styles.row}>
          <Field label="Start" htmlFor="new-task-start">
            <Input id="new-task-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="Due" htmlFor="new-task-due">
            <Input id="new-task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
        </div>

        <Field label="Assignees" htmlFor="new-task-assignees">
          <div className={styles.assigneeChips} id="new-task-assignees">
            {projectMembers.map((member) => {
              const selected = assigneeIds.includes(member.id);
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
      </div>
    </Dialog>
  );
}
