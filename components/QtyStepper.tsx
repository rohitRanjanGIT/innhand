import styles from "./QtyStepper.module.css";

/** − n + control. `small` is the compact size used in cart rows. */
export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  small = false,
  label = "Quantity",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  small?: boolean;
  label?: string;
}) {
  return (
    <div className={small ? `${styles.stepper} ${styles.small}` : styles.stepper} role="group" aria-label={label}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
