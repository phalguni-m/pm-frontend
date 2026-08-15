import type { IconProps } from "@/components/icons/types";

// Horizontal Gantt-bar glyph — three staggered bars reading as a schedule.
export function TimelineIcon({ size = 16, className }: IconProps) {
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
      <path d="M2.5 4.5h6" />
      <path d="M2.5 8h9" />
      <path d="M2.5 11.5h4.5" />
    </svg>
  );
}
