import type { IconProps } from "@/components/icons/types";

export function SunIcon({ size = 16, className }: IconProps) {
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
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M2.6 2.6l1.1 1.1M12.3 12.3l1.1 1.1M1.5 8h1.5M13 8h1.5M2.6 13.4l1.1-1.1M12.3 3.7l1.1-1.1" />
    </svg>
  );
}
