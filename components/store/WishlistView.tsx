"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { demoWishlist } from "@/lib/account";
import { formatPrice, getProduct, type Product } from "@/lib/products";
import { DISPLAY } from "../ui";
import EmptyState from "./EmptyState";
import styles from "./Store.module.css";

const CONFIRM_MS = 2200;

// Starts from the dummy wishlist; changes last until the page is reloaded.
export default function WishlistView() {
  const [slugs, setSlugs] = useState(demoWishlist);
  const [added, setAdded] = useState<Product | null>(null);
  const items = slugs.map(getProduct).filter((p): p is Product => !!p);

  // There is no shared cart yet, so adding only confirms on the page.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [added]);

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
        {added && `${added.name} added to cart`}
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
        <div className={styles.wishGrid}>
          {items.map((p) => (
            <article key={p.slug} className={styles.wishItem}>
              <Link href={p.href} className="ih-tile">
                <div className="ih-tile-media" style={{ aspectRatio: "3 / 4" }}>
                  <Image src={p.image} alt="" fill sizes="(max-width: 600px) 90vw, 320px" unoptimized={p.image.endsWith(".svg")} style={{ objectFit: "cover" }} />
                </div>
                <div className={styles.wishText}>
                  <span className={styles.lineCat}>{p.category}</span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1.15 }}>{p.name}</span>
                  <span>{formatPrice(p.price)}</span>
                </div>
              </Link>
              <button
                type="button"
                className={styles.wishRemove}
                aria-label={`Remove ${p.name} from wishlist`}
                onClick={() => setSlugs((s) => s.filter((x) => x !== p.slug))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
              <button type="button" className={`ih-btn ih-btn-primary ${styles.wishAdd}`} onClick={() => setAdded(p)}>
                {added?.slug === p.slug ? "Added to cart ✓" : "Add to cart"}
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
