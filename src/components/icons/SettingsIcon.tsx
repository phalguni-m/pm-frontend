import type { IconProps } from "@/components/icons/types";

export function SettingsIcon({ size = 16, className }: IconProps) {
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
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M2.9 4.4l1.4 1.4M11.7 10.2l1.4 1.4M1.5 8h2M12.5 8h2M2.9 11.6l1.4-1.4M11.7 5.8l1.4-1.4" />
    </svg>
  );
}
