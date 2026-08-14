import { useEffect, type ReactNode } from "react";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { CloseIcon } from "@/components/icons";
import styles from "@/components/primitives/BottomSheet/BottomSheet.module.css";

export interface BottomSheetProps {
  triggerLabel: string;
  triggerIcon?: ReactNode;
  title: string;
  children: ReactNode;
}

/**
 * ≤640px sort/filter affordance: a single 44px trigger (hidden above 640px —
 * the owning page renders its normal inline controls there instead) that
 * opens a sheet sliding up from the bottom. Focus trapped, Escape closes,
 * body scroll locked while open, focus restored to the trigger on close.
 */
export function BottomSheet({ triggerLabel, triggerIcon, title, children }: BottomSheetProps) {
  const disclosure = useDisclosure(false);
  const sheetRef = useFocusTrap<HTMLDivElement>(disclosure.isOpen);

  useEscapeKey(disclosure.close, disclosure.isOpen);

  useEffect(() => {
    if (!disclosure.isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [disclosure.isOpen]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={disclosure.open}>
        {triggerIcon}
        {triggerLabel}
      </button>

      {disclosure.isOpen && (
        <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && disclosure.close()}>
          <div className={styles.sheet} ref={sheetRef} role="dialog" aria-modal="true" aria-label={title}>
            <div className={styles.grabber} aria-hidden="true">
              <div className={styles.grabberBar} />
            </div>
            <div className={styles.header}>
              <span className={styles.title}>{title}</span>
              <button type="button" className={styles.closeButton} aria-label="Close" onClick={disclosure.close}>
                <CloseIcon size={16} />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
