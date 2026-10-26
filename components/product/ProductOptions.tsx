"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QtyStepper from "@/components/QtyStepper";
import { colours, finishes } from "@/lib/products";
import styles from "./Product.module.css";

const CONFIRM_MS = 2200;

export default function ProductOptions({ name }: { name: string }) {
  const [colour, setColour] = useState(colours[0].name);
  const [finish, setFinish] = useState(finishes[0]);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);

  // There is no cart yet, so adding only confirms on the page.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <div className={styles.options}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          Colour — <strong>{colour}</strong>
        </legend>
        <div className={styles.choices}>
          {colours.map((c) => (
            <label key={c.name} className={styles.choice} title={c.name}>
              <input
                type="radio"
                name="colour"
                value={c.name}
                aria-label={c.name}
                checked={colour === c.name}
                onChange={() => setColour(c.name)}
              />
              <span className={styles.swatch} style={{ background: c.hex }} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          Finish — <strong>{finish}</strong>
        </legend>
        <div className={styles.choices}>
          {finishes.map((f) => (
            <label key={f} className={styles.choice}>
              <input type="radio" name="finish" value={f} checked={finish === f} onChange={() => setFinish(f)} />
              <span className={styles.pill}>{f}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.buyRow}>
        <QtyStepper value={qty} onChange={setQty} />

        <button type="button" className={`ih-btn ih-btn-primary ${styles.addToCart}`} onClick={() => setAdded(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          </svg>
          Add to cart
        </button>

        <button
          type="button"
          className={styles.wish}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={() => setWished(!wished)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />
          </svg>
        </button>
      </div>

      <p className={styles.status} role="status">
        {added && (
          <>
            Added to cart ✓ {qty} × {name}, {colour}, {finish}. <Link href="/cart">View cart</Link>
          </>
        )}
      </p>
    </div>
  );
}
