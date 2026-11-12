import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CartView from "@/components/store/CartView";
import styles from "@/components/store/Store.module.css";
import { readCart } from "@/lib/cart/read";
import { getSettings } from "@/lib/data/settings";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Cart" },
};

export default function CartPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
        {/* The cart is this visitor's, priced now, so it streams in. */}
        <Suspense fallback={<div style={{ minHeight: "50vh" }} aria-busy="true" />}>
          <Cart />
        </Suspense>
      </div>
    </main>
  );
}

async function Cart() {
  const [cart, session, settings] = await Promise.all([readCart(), getSession(), getSettings()]);
  return <CartView cart={cart} signedIn={!!session} whatsappNumber={settings.whatsappNumber} />;
}
