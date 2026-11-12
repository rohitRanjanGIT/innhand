"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import QtyStepper from "@/components/QtyStepper";
import { addToCart } from "@/lib/cart/actions";
import { whatsappUrl } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/pricing";
import { describeChoice, needsNone, resolveChoice, swatchBackground, toLineChoice, withFinish } from "./choice";
import { useProductChoice } from "./ProductChoice";
import styles from "./Product.module.css";

const CONFIRM_MS = 4000;

type Status = { kind: "added"; text: string } | { kind: "error"; text: string } | null;

/**
 * Finish, colourway, each effect, set size and quantity. Unpriced choices get "Ask for a quote"
 * instead of the cart button. `wish` is the wishlist heart (rendered on the server per visitor).
 */
export default function ProductOptions({
  whatsappNumber,
  maxQty,
  wish,
}: {
  whatsappNumber: string;
  maxQty: number;
  wish: ReactNode;
}) {
  const { product, choice, setChoice } = useProductChoice();
  const { finish, variant, colourway, unit } = resolveChoice(product, choice);
  const [status, setStatus] = useState<Status>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (status?.kind !== "added") return;
    const t = setTimeout(() => setStatus(null), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [status]);

  const described = describeChoice(product, choice);
  const quoteHref = whatsappUrl(
    whatsappNumber,
    `Hello! I'd like a quote for ${choice.qty} × ${product.name}${described ? ` (${described})` : ""}.`,
  );
  const onRequest = !variant || unit === null;
  const showSets = !!finish && (product.soldInSets || finish.variants.length > 1);

  const add = () => {
    const line = toLineChoice(product, choice);
    if (!line) return;
    setStatus(null);
    start(async () => {
      const r = await addToCart(line);
      setStatus(
        r.ok
          ? { kind: "added", text: `${choice.qty} × ${product.name}${described ? `, ${described}` : ""}.` }
          : { kind: "error", text: r.error },
      );
    });
  };

  return (
    <div className={styles.options}>
      {product.finishes.length > 1 && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            Finish — <strong>{finish?.name}</strong>
          </legend>
          <div className={styles.choices}>
            {product.finishes.map((f) => (
              <label key={f.productFinishId} className={styles.choice} title={f.description || undefined}>
                <input
                  type="radio"
                  name="finish"
                  value={f.productFinishId}
                  checked={choice.productFinishId === f.productFinishId}
                  onChange={() => setChoice(withFinish(product, choice, f.productFinishId))}
                />
                <span className={styles.pill}>{f.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {finish && finish.colourways.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            Colourway — <strong>{colourway?.name}</strong>
          </legend>
          <div className={styles.choices}>
            {finish.colourways.map((cw) => (
              <label key={cw.id} className={styles.choice} title={cw.name}>
                <input
                  type="radio"
                  name="colourway"
                  value={cw.id}
                  aria-label={`${cw.name}: ${cw.swatches.map((s) => `${s.slotLabel} ${s.name}`).join(", ")}`}
                  checked={choice.colourwayId === cw.id}
                  onChange={() => setChoice({ ...choice, colourwayId: cw.id })}
                />
                <span className={styles.swatch} style={{ background: swatchBackground(cw.swatches.map((s) => s.hex)) }} />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {finish?.effectSlots.map((slot) => {
        const picked = slot.options.find((o) => o.id === choice.effects[slot.id]);
        const pick = (optionId: string | null) => setChoice({ ...choice, effects: { ...choice.effects, [slot.id]: optionId } });
        return (
          <fieldset key={slot.id} className={styles.group}>
            <legend className={styles.legend}>
              {slot.label} — <strong>{picked?.name ?? "None"}</strong>
            </legend>
            <div className={styles.choices}>
              {needsNone(slot) && (
                <label className={styles.choice}>
                  <input type="radio" name={`effect-${slot.id}`} checked={!picked} onChange={() => pick(null)} />
                  <span className={styles.pill}>None</span>
                </label>
              )}
              {slot.options.map((o) => (
                <label key={o.id} className={styles.choice}>
                  <input
                    type="radio"
                    name={`effect-${slot.id}`}
                    value={o.id}
                    checked={picked?.id === o.id}
                    onChange={() => pick(o.id)}
                  />
                  <span className={styles.pill}>
                    {o.name}
                    {o.extraPrice > 0 && ` +${formatPrice(o.extraPrice)}${product.soldInSets ? " each" : ""}`}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      {showSets && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            Set size — <strong>Set of {variant?.setSize}</strong>
          </legend>
          <div className={styles.choices}>
            {finish.variants.map((v) => (
              <label key={v.id} className={styles.choice}>
                <input
                  type="radio"
                  name="set-size"
                  value={v.setSize}
                  checked={variant?.id === v.id}
                  onChange={() => setChoice({ ...choice, setSize: v.setSize })}
                />
                <span className={styles.pill}>Set of {v.setSize}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={styles.buyRow}>
        <QtyStepper value={choice.qty} max={Math.max(1, maxQty)} onChange={(qty) => setChoice({ ...choice, qty })} />

        {onRequest ? (
          <a className={`ih-btn ih-btn-primary ${styles.addToCart}`} href={quoteHref}>
            Ask for a quote
          </a>
        ) : (
          <button
            type="button"
            className={`ih-btn ih-btn-primary ${styles.addToCart}`}
            onClick={add}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
            </svg>
            {pending ? "Adding…" : "Add to cart"}
          </button>
        )}

        {wish}
      </div>

      <p className={styles.status} role="status">
        {status?.kind === "added" && (
          <>
            Added to cart ✓ {status.text} <Link href="/cart">View cart</Link>
          </>
        )}
        {status?.kind === "error" && status.text}
      </p>
    </div>
  );
}
