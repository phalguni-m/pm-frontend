import styles from "@/components/primitives/Avatar/Avatar.module.css";

export type AvatarSize = 20 | 24 | 28 | 32 | 36;

export interface AvatarProps {
  initials: string;
  name: string;
  size?: AvatarSize;
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({ initials, name, size = 24, className, style }: AvatarProps) {
  return (
    <span
      className={className ? `${styles.root} ${className}` : styles.root}
      style={{ width: size, height: size, fontSize: size * 0.36, ...style }}
      title={name}
      aria-label={name}
      role="img"
    >
      {initials}
    </span>
  );
}
