import type { IconProps } from "@/components/icons/types";

export function HistoryIcon({ size = 16, className }: IconProps) {
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
      <path d="M2.5 8a5.5 5.5 0 1 0 1.7-3.97" />
      <path d="M2.5 2.5v3h3" />
      <path d="M8 5v3.2l2.2 1.3" />
    </svg>
  );
}
