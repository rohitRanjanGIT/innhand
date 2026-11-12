"use client";

import { useOptimistic, useTransition } from "react";
import { toggleWishlist } from "@/lib/cart/actions";
import styles from "./Product.module.css";

/** The heart beside "Add to cart". Works for guests too (the first save sets the guest cookie). */
export default function WishButton({ productId, saved }: { productId: string; saved: boolean }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(saved);

  const onClick = () =>
    start(async () => {
      setShown(!shown);
      await toggleWishlist(productId);
    });

  return (
    <button
      type="button"
      className={styles.wish}
      aria-label={shown ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={shown}
      aria-busy={pending || undefined}
      onClick={onClick}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={shown ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />
      </svg>
    </button>
  );
}
