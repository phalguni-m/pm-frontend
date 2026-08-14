import type { IconProps } from "@/components/icons/types";

export function LinkIcon({ size = 16, className }: IconProps) {
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
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M7.5 4.5 8.7 3.3a2.3 2.3 0 0 1 3.3 3.3l-1.2 1.2" />
      <path d="M8.5 11.5 7.3 12.7a2.3 2.3 0 0 1-3.3-3.3l1.2-1.2" />
    </svg>
  );
}
