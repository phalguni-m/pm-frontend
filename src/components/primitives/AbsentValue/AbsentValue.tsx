import styles from "@/components/primitives/AbsentValue/AbsentValue.module.css";

// Renders the "—" placeholder for a value that has not been computed yet
// (e.g. analysis-endpoint figures). Never substitute a 0 for this.
export function AbsentValue() {
  return (
    <span className={styles.root} aria-label="Not yet available">
      &mdash;
    </span>
  );
}
