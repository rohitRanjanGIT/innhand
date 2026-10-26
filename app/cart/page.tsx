import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CartView from "@/components/store/CartView";
import styles from "@/components/store/Store.module.css";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Cart" },
};

export default function CartPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        <CartView />
      </div>
    </main>
  );
}
