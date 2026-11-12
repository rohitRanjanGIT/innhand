"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addToCart, toggleWishlist } from "@/lib/cart/actions";
import type { LineChoice } from "@/lib/cart/contract";
import type { ProductTile } from "@/lib/data/types";
import { priceLabel } from "@/lib/pricing";
import { DISPLAY } from "../ui";
import EmptyState from "./EmptyState";
import styles from "./Store.module.css";

const CONFIRM_MS = 2200;

/** `choice` is the piece's default options (null when it can't go straight in the cart). */
export type WishItem = { tile: ProductTile; choice: LineChoice | null; summary: string };

export default function WishlistView({ items }: { items: WishItem[] }) {
  const [added, setAdded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [added]);

  const add = (item: WishItem) =>
    start(async () => {
      setError("");
      const r = await addToCart(item.choice!);
      if (r.ok) setAdded(item.tile.id);
      else setError(r.error);
    });

  const remove = (productId: string) =>
    start(async () => {
      setError("");
      const r = await toggleWishlist(productId);
      if (!r.ok) setError(r.error);
    });

  const addedItem = items.find((i) => i.tile.id === added);

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>
          Saved for <em>later</em>
        </h1>
        <span className={styles.count}>
          {items.length} {items.length === 1 ? "piece" : "pieces"}
        </span>
      </header>

      <p className={styles.srOnly} role="status">
        {addedItem && `${addedItem.tile.name} added to cart`}
      </p>
      <p className={styles.error} role="alert">
        {error}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title={
            <>
              Nothing saved <em>yet.</em>
            </>
          }
          text="Tap the heart on any piece to keep it here while you decide."
        />
      ) : (
        <div className={styles.wishGrid} aria-busy={pending || undefined}>
          {items.map((item) => {
            const p = item.tile;
            return (
              <article key={p.id} className={styles.wishItem}>
                <Link href={p.href} className="ih-tile">
                  <div className="ih-tile-media" style={{ aspectRatio: "3 / 4" }}>
                    {p.image && <Image src={p.image} alt="" fill sizes="(max-width: 600px) 90vw, 320px" style={{ objectFit: "cover" }} />}
                  </div>
                  <div className={styles.wishText}>
                    <span className={styles.lineCat}>{p.category}</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1.15 }}>{p.name}</span>
                    <span>{priceLabel(p)}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className={styles.wishRemove}
                  aria-label={`Remove ${p.name} from wishlist`}
                  disabled={pending}
                  onClick={() => remove(p.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
                {item.choice ? (
                  <button
                    type="button"
                    className={`ih-btn ih-btn-primary ${styles.wishAdd}`}
                    disabled={pending}
                    title={item.summary ? `Adds it in ${item.summary}. Choose other options on the product page.` : undefined}
                    onClick={() => add(item)}
                  >
                    {added === p.id ? "Added to cart ✓" : "Add to cart"}
                  </button>
                ) : (
                  <Link href={p.href} className={`ih-btn ih-btn-primary ${styles.wishAdd}`}>
                    Choose options
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
