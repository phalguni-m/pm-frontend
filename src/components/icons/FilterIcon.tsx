import type { IconProps } from "@/components/icons/types";

export function FilterIcon({ size = 16, className }: IconProps) {
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
      <path d="M2.5 3.5h11" />
      <path d="M4.5 8h7" />
      <path d="M6.5 12.5h3" />
    </svg>
  );
}
