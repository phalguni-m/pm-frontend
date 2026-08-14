import styles from "@/components/primitives/Kbd/Kbd.module.css";

export interface KbdProps {
  children: string;
}

export function Kbd({ children }: KbdProps) {
  return <kbd className={styles.root}>{children}</kbd>;
}
