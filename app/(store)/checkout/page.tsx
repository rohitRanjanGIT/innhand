import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/store/Store.module.css";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: { absolute: "Innhand Creations — Checkout" },
};

// Signed-in shoppers only. Online checkout and payment arrive in the next phase.
export default function CheckoutPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <Suspense fallback={<div style={{ minHeight: "40vh" }} aria-busy="true" />}>
          <Checkout />
        </Suspense>
      </div>
    </main>
  );
}

async function Checkout() {
  const user = await requireUser("/checkout");
  return (
    <div className={styles.empty}>
      <h1 className={styles.emptyTitle}>
        Checkout is <em>on its way.</em>
      </h1>
      <p className={styles.emptyText}>
        Thank you, {user.name.split(/\s+/)[0]}. Online checkout and payment arrive in the next update. Until then, send
        your cart to us on WhatsApp from the cart page and we will confirm your order there.
      </p>
      <ButtonLink href="/cart" variant="dark">
        Back to cart
      </ButtonLink>
    </div>
  );
}
