"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { formatPrice, unitPrice } from "@/lib/pricing";
import type { LineChoice } from "@/lib/cart/contract";
import { finishOf, lineChoice, pricedLine, priceBundle, type PieceChoice, type PieceProduct } from "./model";
import PiecePicker from "./PiecePicker";
import { useAddBundle } from "./useAddBundle";
import styles from "./Combos.module.css";

export type ConfiguratorCombo = {
  id: string;
  name: string;
  description: string;
  discount: { type: "amount" | "percent"; value: number };
  pieces: { product: PieceProduct; choice: PieceChoice }[];
};

/**
 * An admin combo the shopper can adjust: each piece keeps its own finish, colourway, effects and set
 * size. The price follows the finishes; the saving stays (an amount stays the same, a percentage is
 * worked out again on the new total).
 */
export default function ComboConfigurator({
  combo,
  gallery,
  eyebrow,
}: {
  combo: ConfiguratorCombo;
  gallery: ReactNode;
  eyebrow: ReactNode;
}) {
  const [choices, setChoices] = useState(() => combo.pieces.map((p) => p.choice));
  const { add, pending, status } = useAddBundle();

  const pieces = combo.pieces.map((p, i) => ({ product: p.product, choice: choices[i] }));
  const priced = priceBundle(pieces, combo.discount);

  function addToCart() {
    const items = pieces.map(({ product, choice }) => lineChoice(product, choice));
    if (items.some((i) => !i)) return;
    add({ kind: "combo", comboId: combo.id, items: items as LineChoice[] });
  }

  return (
    <div className={styles.layout}>
      <div className={styles.galleryArea}>{gallery}</div>

      <section className={styles.piecesArea} aria-labelledby="pieces-title">
        <h2 id="pieces-title" className={styles.sectionTitle}>
          Make it <em style={{ fontStyle: "italic" }}>yours</em>
        </h2>
        <p className={styles.sectionNote}>
          Change the finish and colours of each piece. The price follows your finishes and you keep the combo saving.
        </p>
        {pieces.map(({ product, choice }, i) => (
          <PiecePicker
            key={`${product.productId}-${i}`}
            id={`p${i}`}
            index={i}
            product={product}
            choice={choice}
            onChange={(c) => setChoices((list) => list.map((x, n) => (n === i ? c : x)))}
          />
        ))}
      </section>

      <aside className={styles.summaryArea} aria-label="Combo price">
        <div className={styles.summary}>
          {eyebrow}
          <h1 className={styles.comboTitle}>{combo.name}</h1>
          {priced && (
            <div className={styles.priceRow}>
              <span className={styles.price}>{formatPrice(priced.total)}</span>
              {priced.saving > 0 && <span className={styles.was}>{formatPrice(priced.piecesTotal)}</span>}
              {priced.saving > 0 && (
                <span className={styles.save}>
                  You save {formatPrice(priced.saving)}
                  {combo.discount.type === "percent" ? ` (${combo.discount.value}%)` : ""}
                </span>
              )}
            </div>
          )}
          {combo.description && <p className={styles.description}>{combo.description}</p>}

          <ul className={styles.lines}>
            {pieces.map(({ product, choice }, i) => {
              const line = pricedLine(product, choice);
              const f = finishOf(product, choice);
              const cw = f?.colourways.find((c) => c.id === choice.colourwayId);
              const u = line ? unitPrice(line) : null;
              return (
                <li key={i}>
                  <span>
                    {product.name}
                    {choice.setSize > 1 ? ` × ${choice.setSize}` : ""}
                    <span className={styles.lineMeta}>{[f?.name, cw?.name].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span>{u === null ? "" : formatPrice(u)}</span>
                </li>
              );
            })}
            {priced && priced.saving > 0 && (
              <li className={styles.lineSaving}>
                <span>Combo saving</span>
                <span>−{formatPrice(priced.saving)}</span>
              </li>
            )}
            {priced && (
              <li className={styles.lineTotal}>
                <span>Combo price</span>
                <span>{formatPrice(priced.total)}</span>
              </li>
            )}
          </ul>

          <button
            type="button"
            className={`ih-btn ih-btn-primary ${styles.addToCart}`}
            onClick={addToCart}
            disabled={pending || !priced}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
            </svg>
            {pending ? "Adding…" : "Add combo to cart"}
          </button>
          <p className={`${styles.status} ${status && !status.ok ? styles.error : ""}`} role="status">
            {status?.ok && (
              <>
                {status.text} {combo.name}. <Link href="/cart">View cart</Link>
              </>
            )}
            {status && !status.ok && status.text}
          </p>
        </div>
      </aside>
    </div>
  );
}
