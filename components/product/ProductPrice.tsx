"use client";

import { formatPrice } from "@/lib/pricing";
import { resolveChoice } from "./choice";
import { useProductChoice } from "./ProductChoice";
import styles from "./Product.module.css";

/** The price of the chosen finish, set size and effects (one set, or one piece). */
export default function ProductPrice() {
  const { product, choice } = useProductChoice();
  const { variant, unit } = resolveChoice(product, choice);
  const set = variant && (product.soldInSets || variant.setSize > 1) ? `Set of ${variant.setSize} · ` : "";
  return (
    <div className={styles.priceRow}>
      <span className={styles.price}>{unit === null ? "Price on request" : formatPrice(unit)}</span>
      <span className={styles.note}>{unit === null ? "Message us for a quote" : `${set}Made to order`}</span>
    </div>
  );
}
