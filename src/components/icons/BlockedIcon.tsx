import type { IconProps } from "@/components/icons/types";

export function BlockedIcon({ size = 16, className }: IconProps) {
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
      <circle cx="8" cy="8" r="5.5" />
      <path d="M4.4 4.4l7.2 7.2" />
    </svg>
  );
}
