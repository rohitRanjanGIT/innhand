"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import QtyStepper from "@/components/QtyStepper";
import { demoCart, FREE_SHIPPING_FROM, shippingFor, subtotalOf, withProducts, type CartLine } from "@/lib/account";
import { formatPrice } from "@/lib/products";
import { WHATSAPP_URL } from "@/lib/site";
import EmptyState from "./EmptyState";
import ItemSpec from "./ItemSpec";
import styles from "./Store.module.css";

// Starts from the dummy cart; changes last until the page is reloaded.
export default function CartView() {
  const [lines, setLines] = useState<CartLine[]>(demoCart);
  const [checkoutNote, setCheckoutNote] = useState(false);

  const items = withProducts(lines);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = subtotalOf(lines);
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  const setQty = (id: string, qty: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty } : l)));
  const remove = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  const message = [
    "Hello! I'd like to order:",
    ...items.map((l) => `• ${l.qty} × ${l.product.name} (${l.colour}, ${l.finish})`),
    `Total: ${formatPrice(total)}`,
  ].join("\n");

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>
          Your <em>cart</em>
        </h1>
        <span className={styles.count}>
          {count} {count === 1 ? "piece" : "pieces"}
        </span>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title={
            <>
              Your cart is <em>empty.</em>
            </>
          }
          text="Find a piece you love, choose your colour and finish, and it will wait for you here."
        />
      ) : (
        <div className={styles.cartLayout}>
          <ul className={styles.lines}>
            {items.map((l) => (
              <li key={l.id} className={styles.line}>
                <Link href={l.product.href} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                  <Image src={l.product.image} alt="" fill sizes="96px" unoptimized={l.product.image.endsWith(".svg")} style={{ objectFit: "cover" }} />
                </Link>
                <div className={styles.lineInfo}>
                  <span className={styles.lineCat}>{l.product.category}</span>
                  <Link href={l.product.href} className={styles.lineName}>
                    {l.product.name}
                  </Link>
                  <ItemSpec colour={l.colour} finish={l.finish} />
                  <span className={styles.unit}>{formatPrice(l.product.price)} each</span>
                </div>
                <div className={styles.lineControls}>
                  <QtyStepper small value={l.qty} onChange={(q) => setQty(l.id, q)} label={`Quantity of ${l.product.name}`} />
                  <button type="button" className={styles.textBtn} onClick={() => remove(l.id)}>
                    Remove
                  </button>
                </div>
                <span className={styles.lineTotal}>{formatPrice(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>

          <aside className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title" className={styles.summaryTitle}>
              Order summary
            </h2>
            <dl className={styles.rows}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
              </div>
            </dl>
            {shipping > 0 && (
              <p className={styles.hint}>Add {formatPrice(FREE_SHIPPING_FROM - subtotal)} more for free shipping.</p>
            )}
            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button type="button" className={`ih-btn ih-btn-primary ${styles.primaryBtn}`} onClick={() => setCheckoutNote(true)}>
              Checkout
            </button>
            <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(message)}`} className={`ih-btn ih-btn-ghost ${styles.secondaryBtn}`}>
              Order on WhatsApp
            </a>
            <p className={styles.hint} role="status">
              {checkoutNote && "Online checkout is coming soon. For now, send your order on WhatsApp and we will confirm it there."}
            </p>
            <p className={styles.small}>Every piece is poured to order. We confirm your delivery date when you order.</p>
          </aside>
        </div>
      )}
    </>
  );
}
