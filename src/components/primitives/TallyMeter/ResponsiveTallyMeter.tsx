import type { ReactNode } from "react";
import { TallyMeter } from "@/components/primitives/TallyMeter/TallyMeter";
import styles from "@/components/primitives/TallyMeter/ResponsiveTallyMeter.module.css";

export interface ResponsiveTallyMeterProps {
  label: string;
  percent: number;
  delta?: ReactNode;
}

/**
 * TallyMeter's bar count is a plain prop (28 desktop / 20 tablet / 14
 * mobile per SPEC §3, staying 14 at ≤380 per §6) — the component itself
 * doesn't read the viewport. This wrapper mounts three instances and lets
 * CSS pick the one for the current breakpoint, the same dual-render pattern
 * Table and AppShell already use instead of a matchMedia listener.
 */
export function ResponsiveTallyMeter({ label, percent, delta }: ResponsiveTallyMeterProps) {
  return (
    <>
      <div className={`${styles.variant} ${styles.desktop}`}>
        <TallyMeter label={label} percent={percent} delta={delta} barCount={28} />
      </div>
      <div className={`${styles.variant} ${styles.tablet}`}>
        <TallyMeter label={label} percent={percent} delta={delta} barCount={20} />
      </div>
      <div className={`${styles.variant} ${styles.mobile}`}>
        <TallyMeter label={label} percent={percent} delta={delta} barCount={14} />
      </div>
    </>
  );
}
