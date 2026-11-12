"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import QtyStepper from "@/components/QtyStepper";
import { removeBundle, removeLine, updateBundleQty, updateLineQty } from "@/lib/cart/actions";
import type { CartActionResult } from "@/lib/cart/contract";
import type { CartBundleView, CartLineView, CartView as Cart } from "@/lib/cart/types";
import { formatPrice } from "@/lib/pricing";
import { whatsappUrl } from "@/lib/whatsapp";
import EmptyState from "./EmptyState";
import ItemSpec from "./ItemSpec";
import styles from "./Store.module.css";

const describe = (l: CartLineView) =>
  [
    l.colourway?.name,
    l.finish,
    ...l.effects.filter((e) => e.option.toLowerCase() !== "none").map((e) => e.option),
    l.soldInSets || l.setSize > 1 ? `set of ${l.setSize}` : null,
  ]
    .filter(Boolean)
    .join(", ");

/** The WhatsApp order message, built from the real cart. */
function orderMessage(cart: Cart) {
  const lines = cart.lines
    .filter((l) => l.available)
    .map((l) => `• ${l.qty} × ${l.name} (${describe(l)})${l.unitPrice === null ? " – price on request" : ""}`);
  const bundles = cart.bundles.map(
    (b) =>
      `• ${b.qty} × ${b.name}: ${b.lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ""}${l.name} (${describe(l)})`).join("; ")}${b.saving ? ` – saves ${formatPrice(b.saving)}` : ""}`,
  );
  return [
    "Hello! I'd like to order:",
    ...lines,
    ...bundles,
    `Total: ${formatPrice(cart.total)}${cart.shipping ? ` (incl. ${formatPrice(cart.shipping)} shipping)` : ""}`,
  ].join("\n");
}

/** Prices and totals come from the server on every change (Server Actions refresh the page). */
export default function CartView({ cart, signedIn, whatsappNumber }: { cart: Cart; signedIn: boolean; whatsappNumber: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const act = (fn: () => Promise<CartActionResult>) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (!r.ok) setError(r.error);
    });

  const empty = cart.lines.length === 0 && cart.bundles.length === 0;
  const checkoutHref = signedIn ? "/checkout" : `/sign-in?next=${encodeURIComponent("/checkout")}`;

  return (
    <>
      <header className={styles.head}>
        <h1 className={styles.title}>
          Your <em>cart</em>
        </h1>
        <span className={styles.count}>
          {cart.count} {cart.count === 1 ? "piece" : "pieces"}
        </span>
      </header>

      {empty ? (
        <EmptyState
          title={
            <>
              Your cart is <em>empty.</em>
            </>
          }
          text="Find a piece you love, choose your colour and finish, and it will wait for you here."
        />
      ) : (
        <div className={styles.cartLayout} aria-busy={pending || undefined}>
          <div>
            <p className={styles.error} role="alert">
              {error}
            </p>
            <ul className={styles.lines}>
              {cart.lines.map((l) => (
                <li key={l.id} className={styles.line}>
                  <Thumb line={l} />
                  <div className={styles.lineInfo}>
                    <span className={styles.lineCat}>{l.category}</span>
                    <Link href={l.href} className={styles.lineName}>
                      {l.name}
                    </Link>
                    <ItemSpec colourway={l.colourway} finish={l.finish} effects={l.effects} setSize={l.soldInSets || l.setSize > 1 ? l.setSize : null} />
                    {!l.available ? (
                      <span className={styles.notice}>No longer available. Please remove it.</span>
                    ) : (
                      <span className={styles.unit}>{l.unitPrice === null ? "Price on request" : `${formatPrice(l.unitPrice)} each`}</span>
                    )}
                  </div>
                  <div className={styles.lineControls}>
                    {l.available && (
                      <QtyStepper
                        small
                        value={l.qty}
                        max={l.maxQty}
                        onChange={(q) => act(() => updateLineQty(l.id, q))}
                        label={`Quantity of ${l.name}`}
                      />
                    )}
                    <button type="button" className={styles.textBtn} disabled={pending} onClick={() => act(() => removeLine(l.id))}>
                      Remove
                    </button>
                  </div>
                  <span className={styles.lineTotal}>{l.lineTotal === null ? "—" : formatPrice(l.lineTotal)}</span>
                </li>
              ))}
              {cart.bundles.map((b) => (
                <Bundle key={b.id} bundle={b} pending={pending} act={act} />
              ))}
            </ul>
          </div>

          <aside className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title" className={styles.summaryTitle}>
              Order summary
            </h2>
            <dl className={styles.rows}>
              <div>
                <dt>Subtotal</dt>
                {/* cart.subtotal is after combo savings; show the pieces' total above the saving. */}
                <dd>{formatPrice(cart.subtotal + cart.savings)}</dd>
              </div>
              {cart.savings > 0 && (
                <div>
                  <dt>Combo savings</dt>
                  <dd>{formatPrice(-cart.savings)}</dd>
                </div>
              )}
              <div>
                <dt>Shipping</dt>
                <dd>{cart.shipping === 0 ? "Free" : formatPrice(cart.shipping)}</dd>
              </div>
            </dl>
            {cart.shipping > 0 && (
              <p className={styles.hint}>Add {formatPrice(cart.freeShippingFrom - cart.subtotal)} more for free shipping.</p>
            )}
            {cart.quoteLines > 0 && (
              <p className={styles.hint}>
                {cart.quoteLines === 1 ? "One piece is" : `${cart.quoteLines} pieces are`} priced on request and not in the total.
                We will confirm the price on WhatsApp.
              </p>
            )}
            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <Link href={checkoutHref} className={`ih-btn ih-btn-primary ${styles.primaryBtn}`}>
              Checkout
            </Link>
            <a href={whatsappUrl(whatsappNumber, orderMessage(cart))} className={`ih-btn ih-btn-ghost ${styles.secondaryBtn}`}>
              Order on WhatsApp
            </a>
            <p className={styles.small}>Every piece is poured to order. We confirm your delivery date when you order.</p>
          </aside>
        </div>
      )}
    </>
  );
}

function Thumb({ line, small = false }: { line: CartLineView; small?: boolean }) {
  return (
    <Link href={line.href} className={small ? `${styles.thumb} ${styles.thumbSmall}` : styles.thumb} tabIndex={-1} aria-hidden="true">
      {line.image && <Image src={line.image} alt="" fill sizes={small ? "64px" : "96px"} style={{ objectFit: "cover" }} />}
    </Link>
  );
}

function Bundle({
  bundle: b,
  pending,
  act,
}: {
  bundle: CartBundleView;
  pending: boolean;
  act: (fn: () => Promise<CartActionResult>) => void;
}) {
  const first = b.lines[0];
  return (
    <li className={styles.bundle}>
      <div className={styles.line}>
        {first ? <Thumb line={first} /> : <span className={styles.thumb} />}
        <div className={styles.lineInfo}>
          <span className={styles.lineCat}>{b.kind === "combo" ? "Combo" : "Your own combo"}</span>
          {b.href ? (
            <Link href={b.href} className={styles.lineName}>
              {b.name}
            </Link>
          ) : (
            <span className={styles.lineName}>{b.name}</span>
          )}
          <span className={styles.unit}>
            {b.lines.length} pieces{b.qty > 1 ? ` · ${b.qty} sets` : ""}
          </span>
          {b.priced && b.saving > 0 && <span className={styles.saving}>You save {formatPrice(b.saving)}</span>}
          {b.notice && <p className={styles.notice}>{b.notice}</p>}
        </div>
        <div className={styles.lineControls}>
          <QtyStepper
            small
            value={b.qty}
            max={b.maxQty}
            onChange={(q) => act(() => updateBundleQty(b.id, q))}
            label={`Quantity of ${b.name}`}
          />
          <button type="button" className={styles.textBtn} disabled={pending} onClick={() => act(() => removeBundle(b.id))}>
            Remove
          </button>
        </div>
        <span className={styles.lineTotal}>
          {b.priced ? (
            <>
              {b.saving > 0 && <span className={styles.was}>{formatPrice(b.piecesTotal)}</span>}
              {formatPrice(b.total)}
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
      <ul className={`${styles.orderItems} ${styles.bundlePieces}`}>
        {b.lines.map((l) => (
          <li key={l.id} className={styles.orderItem}>
            <Thumb line={l} small />
            <div className={styles.lineInfo}>
              <Link href={l.href} className={styles.lineName} style={{ fontSize: 18 }}>
                {l.qty > 1 ? `${l.qty} × ` : ""}
                {l.name}
              </Link>
              <ItemSpec colourway={l.colourway} finish={l.finish} effects={l.effects} setSize={l.soldInSets || l.setSize > 1 ? l.setSize : null} />
              {!l.available && <span className={styles.notice}>No longer available</span>}
            </div>
            <span className={styles.unit}>{l.lineTotal === null ? "—" : formatPrice(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
