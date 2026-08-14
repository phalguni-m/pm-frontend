import type { IconProps } from "@/components/icons/types";

export function MembersIcon({ size = 16, className }: IconProps) {
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
      <circle cx="6" cy="5.5" r="2" />
      <path d="M2.5 13c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
      <path d="M10.5 4.25c1 .25 1.75 1.15 1.75 2.25 0 .95-.55 1.75-1.35 2.15" />
      <path d="M11 9.65c1.5.35 2.5 1.65 2.5 3.35" />
    </svg>
  );
}
