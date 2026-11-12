import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import WishlistView from "@/components/store/WishlistView";
import styles from "@/components/store/Store.module.css";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Wishlist" },
};

export default function WishlistPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
        <WishlistView />
      </div>
    </main>
  );
}
