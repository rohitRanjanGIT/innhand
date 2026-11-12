import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/pricing";
import type { StoreCombo } from "@/lib/data/combos";
import { discountLabel, pieceImage } from "./model";
import styles from "./Combos.module.css";

/** Combo tile: cover photo, pieces, "From" price and the saving. */
export default function ComboCard({ combo }: { combo: StoreCombo }) {
  const cover =
    combo.images[0] ?? (combo.pieces[0] ? pieceImage(combo.pieces[0].product, combo.pieces[0].choice) : null);
  return (
    <Link href={`/combos/${combo.slug}`} className="ih-tile">
      <div className="ih-tile-media" style={{ aspectRatio: "4 / 5", background: "#FFFFFF", position: "relative" }}>
        {cover && (
          <Image src={cover.key} alt="" fill sizes="(max-width: 600px) 90vw, 420px" style={{ objectFit: "cover" }} />
        )}
        {combo.discount.value > 0 && (
          <span className={`${styles.save} ${styles.badge}`}>Save {discountLabel(combo.discount, formatPrice)}</span>
        )}
      </div>
      <div className={styles.tileBody}>
        <span className={styles.tileName}>{combo.name}</span>
        <span className={styles.tilePieces}>
          {combo.pieces.length} pieces: {combo.pieces.map((p) => p.product.name).join(" + ")}
        </span>
        <span className={styles.tilePrice}>
          <span>From {formatPrice(combo.fromTotal)}</span>
          {combo.saving > 0 && <span className={styles.was}>{formatPrice(combo.piecesTotal)}</span>}
        </span>
        <span className="ih-tile-link">
          View combo
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
            <path d="M4 12h16M14 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
