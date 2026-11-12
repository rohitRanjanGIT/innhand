import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import WishlistView, { type WishItem } from "@/components/store/WishlistView";
import styles from "@/components/store/Store.module.css";
import { initialChoice, resolveChoice, toLineChoice } from "@/components/product/choice";
import { readWishlistIds } from "@/lib/cart/read";
import { getProduct, getTilesByIds } from "@/lib/data/catalogue";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Wishlist" },
};

export default function WishlistPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
        {/* Works for guests (cookie) and signed-in shoppers alike, so it streams in. */}
        <Suspense fallback={<div style={{ minHeight: "50vh" }} aria-busy="true" />}>
          <Wishlist />
        </Suspense>
      </div>
    </main>
  );
}

async function Wishlist() {
  const tiles = await getTilesByIds(await readWishlistIds());
  // "Add to cart" from the wishlist uses the piece's default options; pieces without a price
  // (or with no options yet) link to the product page instead.
  const items: WishItem[] = await Promise.all(
    tiles.map(async (tile) => {
      const product = await getProduct(tile.slug);
      if (!product) return { tile, choice: null, summary: "" };
      const c = initialChoice(product);
      const { unit, finish, colourway } = resolveChoice(product, c);
      return {
        tile,
        choice: unit === null ? null : toLineChoice(product, c),
        summary: [colourway?.name, finish?.name].filter(Boolean).join(", "),
      };
    }),
  );
  return <WishlistView items={items} />;
}
