import { colours } from "@/lib/products";
import styles from "./Store.module.css";

/** "● Blush · Marble": the colour and finish a piece is poured in. */
export default function ItemSpec({ colour, finish }: { colour: string; finish: string }) {
  const hex = colours.find((c) => c.name === colour)?.hex;
  return (
    <span className={styles.spec}>
      <span className={styles.dot} style={{ background: hex }} aria-hidden="true" />
      {colour} · {finish}
    </span>
  );
}
