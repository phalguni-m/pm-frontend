import { useEffect, useId, type ReactNode } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { CloseIcon } from "@/components/icons";
import styles from "@/components/primitives/Dialog/Dialog.module.css";

export interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Dialog({ isOpen, title, onClose, footer, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.panel} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button type="button" className={styles.closeButton} aria-label="Close dialog" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
