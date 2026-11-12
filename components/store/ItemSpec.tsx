import styles from "./Store.module.css";

/** "●● Blush + Ivory swirl · Marble · Gold leaf · Set of 4": how a piece is poured. */
export default function ItemSpec({
  colourway,
  finish,
  effects = [],
  setSize,
}: {
  colourway: { name: string; swatches: { name: string; hex: string }[] } | null;
  finish: string;
  effects?: { slot: string; option: string }[];
  /** Shown when the piece is sold in sets. */
  setSize?: number | null;
}) {
  const parts = [
    colourway?.name,
    finish,
    ...effects.filter((e) => e.option.toLowerCase() !== "none").map((e) => e.option),
    setSize ? `Set of ${setSize}` : null,
  ].filter(Boolean);
  return (
    <span className={styles.spec}>
      {colourway && colourway.swatches.length > 0 && (
        <span className={styles.swatchPair} aria-hidden="true">
          {colourway.swatches.map((s, i) => (
            <span key={i} className={styles.dot} style={{ background: s.hex }} />
          ))}
        </span>
      )}
      {parts.join(" · ")}
    </span>
  );
}
