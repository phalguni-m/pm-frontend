import type { IconProps } from "@/components/icons/types";

export function ProjectIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 4.5c0-.55.45-1 1-1h2.7l1.2 1.5h5.1c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-9c-.55 0-1-.45-1-1v-7.5Z" />
    </svg>
  );
}
