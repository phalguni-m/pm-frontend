import type { IconProps } from "@/components/icons/types";

export function MonitorIcon({ size = 16, className }: IconProps) {
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
      <rect x="2" y="3" width="12" height="8" rx="1" />
      <path d="M5.5 13.5h5" />
      <path d="M8 11v2.5" />
    </svg>
  );
}
