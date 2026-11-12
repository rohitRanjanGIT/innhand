"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { discountAmount, formatPrice, priceLabel, tierFor, unitPrice, type Discount } from "@/lib/pricing";
import type { LineChoice } from "@/lib/cart/contract";
import {
  defaultChoice,
  discountLabel,
  finishOf,
  lineChoice,
  pricedLine,
  priceBundle,
  type PieceChoice,
  type PieceProduct,
} from "./model";
import PiecePicker from "./PiecePicker";
import { useAddBundle } from "./useAddBundle";
import styles from "./Combos.module.css";

export type BuildTile = PieceProduct & {
  image: { key: string; alt: string } | null;
  price: { price: number | null; from: boolean };
};

const MIN = 2;
const MAX = 4;

/** Shopper-built combo: pick 2 to 4 pieces, set each one up, and get the discount for that many. */
export default function BuildConfigurator({
  products,
  tiers,
}: {
  products: BuildTile[];
  tiers: { itemCount: number; discount: Discount }[];
}) {
  const byId = useMemo(() => new Map(products.map((p) => [p.productId, p])), [products]);
  const [picked, setPicked] = useState<{ productId: string; choice: PieceChoice }[]>([]);
  const { add, pending, status } = useAddBundle();

  const pieces = picked.flatMap((p) => {
    const product = byId.get(p.productId);
    return product ? [{ product, choice: p.choice }] : [];
  });
  const count = pieces.length;
  const tier = tierFor(tiers, count);
  const priced = count > 0 ? priceBundle(pieces, tier?.discount ?? null) : null;
  const nextTier = tierFor(tiers, Math.max(count + 1, MIN));
  const nextSaving =
    priced && nextTier && count < MAX ? discountAmount(priced.piecesTotal, nextTier.discount) : 0;

  function toggle(p: BuildTile) {
    setPicked((list) => {
      if (list.some((x) => x.productId === p.productId)) return list.filter((x) => x.productId !== p.productId);
      if (list.length >= MAX) return list;
      const choice = defaultChoice(p);
      return choice ? [...list, { productId: p.productId, choice }] : list;
    });
  }

  function addToCart() {
    const items = pieces.map(({ product, choice }) => lineChoice(product, choice));
    if (count < MIN || count > MAX || items.some((i) => !i)) return;
    add({ kind: "custom", items: items as LineChoice[] });
  }

  return (
    <div className={styles.layout}>
      <section className={styles.galleryArea} aria-labelledby="pick-title" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h2 id="pick-title" className={styles.sectionTitle}>
          1. Pick your <em style={{ fontStyle: "italic" }}>pieces</em>
        </h2>
        {tiers.length > 0 && (
          <ul className={styles.tiers} aria-label="Combo discounts">
            {tiers.map((t) => (
              <li key={t.itemCount} className={styles.tier} data-current={t.itemCount === count}>
                <span>{t.itemCount} pieces</span>
                <strong>{t.discount.value > 0 ? `${discountLabel(t.discount, formatPrice)} off` : "No discount"}</strong>
              </li>
            ))}
          </ul>
        )}
        <ul className={styles.pickGrid}>
          {products.map((p) => {
            const on = picked.some((x) => x.productId === p.productId);
            return (
              <li key={p.productId}>
                <button
                  type="button"
                  className={styles.pick}
                  aria-pressed={on}
                  disabled={!on && count >= MAX}
                  onClick={() => toggle(p)}
                >
                  <span className={styles.pickMedia}>
                    {p.image && (
                      <Image
                        src={p.image.key}
                        alt=""
                        fill
                        sizes="(max-width: 600px) 45vw, 200px"
                        style={{ objectFit: "cover" }}
                      />
                    )}
                    <span className={styles.pickTick} aria-hidden="true">
                      {on ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5 10 17l9-10" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className={styles.pickName}>{p.name}</span>
                  <span className={styles.pickPrice}>{priceLabel(p.price)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.piecesArea} aria-labelledby="setup-title">
        <h2 id="setup-title" className={styles.sectionTitle}>
          2. Make them <em style={{ fontStyle: "italic" }}>yours</em>
        </h2>
        {count === 0 ? (
          <p className={styles.sectionNote}>Pick at least {MIN} pieces above, then choose a finish and colours for each.</p>
        ) : (
          pieces.map(({ product, choice }, i) => (
            <PiecePicker
              key={product.productId}
              id={`b-${product.productId}`}
              index={i}
              product={product}
              choice={choice}
              onChange={(c) =>
                setPicked((list) => list.map((x) => (x.productId === product.productId ? { ...x, choice: c } : x)))
              }
              action={
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => setPicked((list) => list.filter((x) => x.productId !== product.productId))}
                >
                  Remove
                </button>
              }
            />
          ))
        )}
      </section>

      <aside className={styles.summaryArea} aria-label="Your combo">
        <div className={styles.summary}>
          <h2 className={styles.sectionTitle}>Your combo</h2>
          <div className={styles.priceRow}>
            <span className={styles.price}>{priced ? formatPrice(priced.total) : formatPrice(0)}</span>
            {priced && priced.saving > 0 && <span className={styles.was}>{formatPrice(priced.piecesTotal)}</span>}
            {priced && priced.saving > 0 && tier && (
              <span className={styles.save}>
                You save {formatPrice(priced.saving)}
                {tier.discount.type === "percent" ? ` (${tier.discount.value}%)` : ""}
              </span>
            )}
          </div>

          <ul className={styles.lines}>
            {count === 0 && <li>No pieces yet</li>}
            {pieces.map(({ product, choice }) => {
              const line = pricedLine(product, choice);
              const f = finishOf(product, choice);
              const cw = f?.colourways.find((c) => c.id === choice.colourwayId);
              const u = line ? unitPrice(line) : null;
              return (
                <li key={product.productId}>
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
                <span>{count}-piece discount</span>
                <span>−{formatPrice(priced.saving)}</span>
              </li>
            )}
            {priced && count >= MIN && (
              <li className={styles.lineTotal}>
                <span>Combo price</span>
                <span>{formatPrice(priced.total)}</span>
              </li>
            )}
          </ul>

          {count < MIN ? (
            <p className={styles.hint}>
              Pick {MIN - count} more {MIN - count === 1 ? "piece" : "pieces"} to make a combo
              {nextSaving > 0 ? ` and save ${formatPrice(nextSaving)}` : ""}.
            </p>
          ) : count < MAX && nextSaving > (priced?.saving ?? 0) ? (
            <p className={styles.hint}>
              Add one more piece to get {discountLabel(nextTier!.discount, formatPrice)} off.
            </p>
          ) : null}

          <button
            type="button"
            className={`ih-btn ih-btn-primary ${styles.addToCart}`}
            onClick={addToCart}
            disabled={pending || count < MIN || !priced}
          >
            {pending ? "Adding…" : "Add combo to cart"}
          </button>
          <p className={`${styles.status} ${status && !status.ok ? styles.error : ""}`} role="status">
            {status?.ok && (
              <>
                {status.text} <Link href="/cart">View cart</Link>
              </>
            )}
            {status && !status.ok && status.text}
          </p>
        </div>
      </aside>
    </div>
  );
}
