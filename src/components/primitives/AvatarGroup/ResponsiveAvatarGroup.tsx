import type { AvatarSize } from "@/components/primitives/Avatar";
import { AvatarGroup, type AvatarGroupMember } from "@/components/primitives/AvatarGroup/AvatarGroup";
import styles from "@/components/primitives/AvatarGroup/ResponsiveAvatarGroup.module.css";

export interface ResponsiveAvatarGroupProps {
  members: AvatarGroupMember[];
  size?: AvatarSize;
}

/**
 * AvatarGroup's `max` is a plain prop — the component doesn't read the
 * viewport. This wrapper mounts a 4-visible instance and a 2-visible
 * instance (SPEC §6: "AvatarGroups show 2 then +N" at ≤380) and lets CSS
 * pick the right one, the same dual-render pattern used for Table and
 * TallyMeter.
 */
export function ResponsiveAvatarGroup({ members, size }: ResponsiveAvatarGroupProps) {
  return (
    <>
      <span className={`${styles.variant} ${styles.default}`}>
        <AvatarGroup members={members} size={size} max={4} />
      </span>
      <span className={`${styles.variant} ${styles.compact}`}>
        <AvatarGroup members={members} size={size} max={2} />
      </span>
    </>
  );
}
