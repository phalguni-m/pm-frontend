import { useEffect, useRef, type ReactNode } from "react";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import styles from "@/components/primitives/Popover/Popover.module.css";

export interface PopoverTriggerProps {
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": true;
}

export interface PopoverProps {
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function Popover({ trigger, children, align = "left", isOpen: controlledOpen, onOpenChange }: PopoverProps) {
  const disclosure = useDisclosure(false);
  const isOpen = controlledOpen ?? disclosure.isOpen;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerFocusRef = useRef<HTMLElement | null>(null);

  const close = () => {
    if (controlledOpen === undefined) disclosure.close();
    onOpenChange?.(false);
    triggerFocusRef.current?.focus();
  };

  const open = () => {
    triggerFocusRef.current = document.activeElement as HTMLElement | null;
    if (controlledOpen === undefined) disclosure.open();
    onOpenChange?.(true);
  };

  useEscapeKey(close, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        close();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {trigger({
        onClick: () => (isOpen ? close() : open()),
        "aria-expanded": isOpen,
        "aria-haspopup": true,
      })}
      {isOpen && (
        <div className={align === "right" ? `${styles.content} ${styles.contentRight}` : styles.content}>
          {children(close)}
        </div>
      )}
    </div>
  );
}
