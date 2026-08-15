import { useEffect, useState } from "react";
import { Dialog } from "@/components/primitives/Dialog";
import { Field } from "@/components/primitives/Field";
import { Input } from "@/components/primitives/Input";
import { Button } from "@/components/primitives/Button";
import styles from "@/components/project/NewSectionDialog/NewSectionDialog.module.css";

export interface NewSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function NewSectionDialog({ isOpen, onClose, onCreate }: NewSectionDialogProps) {
  const [name, setName] = useState("");

  // Fresh draft every time the dialog opens, same as NewTaskDialog — a
  // cancelled create shouldn't leave a stale name behind for next time.
  useEffect(() => {
    if (!isOpen) return;
    setName("");
  }, [isOpen]);

  const canCreate = name.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;
    onCreate(name.trim());
    onClose();
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="New section"
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
        <Field label="Name" htmlFor="new-section-name" required>
          <Input
            id="new-section-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Section name"
            autoFocus
          />
        </Field>
      </div>
    </Dialog>
  );
}
