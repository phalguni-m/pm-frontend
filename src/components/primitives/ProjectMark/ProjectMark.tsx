import styles from "@/components/primitives/ProjectMark/ProjectMark.module.css";

export type ProjectMarkSize = 16 | 20 | 24 | 28 | 36 | 44;

export interface ProjectMarkProps {
  mark: string;
  name: string;
  size?: ProjectMarkSize;
}

const BASE_SIZE = 20;
const BASE_FONT_SIZE = 11;

export function ProjectMark({ mark, name, size = 28 }: ProjectMarkProps) {
  const fontSize = Math.round((BASE_FONT_SIZE / BASE_SIZE) * size);
  return (
    <span
      className={styles.root}
      style={{ width: size, height: size, fontSize }}
      title={name}
      aria-label={name}
      role="img"
    >
      {mark}
    </span>
  );
}
