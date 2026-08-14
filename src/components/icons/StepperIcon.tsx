import type { IconProps } from "@/components/icons/types";

// Two-way up/down stepper glyph for the workspace switcher — reads as
// "switch", distinct from a single dropdown chevron.
export function StepperIcon({ size = 16, className }: IconProps) {
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
      <path d="M4.5 6.5 8 3l3.5 3.5" />
      <path d="M4.5 9.5 8 13l3.5-3.5" />
    </svg>
  );
}
