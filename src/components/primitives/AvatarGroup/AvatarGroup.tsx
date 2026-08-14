import { Avatar, type AvatarSize } from "@/components/primitives/Avatar";
import styles from "@/components/primitives/AvatarGroup/AvatarGroup.module.css";

export interface AvatarGroupMember {
  id: string;
  initials: string;
  name: string;
}

export interface AvatarGroupProps {
  members: AvatarGroupMember[];
  size?: AvatarSize;
  max?: number;
}

export function AvatarGroup({ members, size = 24, max = 4 }: AvatarGroupProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <span className={styles.root}>
      {visible.map((member) => (
        <Avatar key={member.id} initials={member.initials} name={member.name} size={size} className={styles.item} />
      ))}
      {overflow > 0 && (
        <span
          className={styles.overflow}
          style={{ width: size, height: size, fontSize: size * 0.34 }}
          aria-label={`${overflow} more members`}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
