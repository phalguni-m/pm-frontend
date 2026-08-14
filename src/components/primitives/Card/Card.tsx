import type { ReactNode } from "react";
import styles from "@/components/primitives/Card/Card.module.css";

export interface CardFooter {
  message: string;
  linkLabel: string;
  onLinkClick: () => void;
}

export interface CardProps {
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  onKebabClick?: () => void;
  /** When true, body padding is removed — used for edge-to-edge Table content. */
  flush?: boolean;
  footer?: CardFooter;
  children: ReactNode;
}

export function Card({ icon, title, subtitle, onKebabClick, flush = false, footer, children }: CardProps) {
  const hasHeader = icon !== undefined || title !== undefined;

  return (
    <div className={styles.root}>
      {hasHeader && (
        <>
          <div className={styles.header}>
            {icon}
            <div className={styles.headerText}>
              {title && <div className={styles.title}>{title}</div>}
              {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
            </div>
            {onKebabClick && (
              <button type="button" className={styles.kebab} aria-label="More options" onClick={onKebabClick}>
                &#8943;
              </button>
            )}
          </div>
          <hr className={styles.rule} />
        </>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
      {footer && (
        <div className={styles.footer}>
          <span>{footer.message}</span>
          <button type="button" className={styles.footerLink} onClick={footer.onLinkClick}>
            {footer.linkLabel} &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
