import type { IconProps } from "@/components/icons/types";

export function HomeIcon({ size = 16, className }: IconProps) {
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
      <path d="M2 7.5 8 2l6 5.5" />
      <path d="M3.5 6.5V14h9V6.5" />
      <path d="M6.5 14v-4h3v4" />
    </svg>
  );
}
