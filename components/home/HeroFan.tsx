"use client";

import Image from "next/image";
import type { CSSProperties, FocusEvent, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import { ButtonLink, Eyebrow } from "../ui";
import styles from "./HeroFan.module.css";

type Product = {
  name: string;
  /** Short name shown on the card's pill. */
  label: string;
  blurb: string;
  image: string;
  href: string;
};

// Placeholder line-art images; swap `image` for real product photos (portrait, 3:4).
const products: Product[] = [
  {
    name: "Flower Vases",
    label: "Vases",
    blurb: "A pair of sculptural vases, hand-poured in the colours you choose.",
    image: "/assets/cards/vases.svg",
    href: "#",
  },
  {
    name: "Leaf Heart Tray",
    label: "Heart Tray",
    blurb: "A heart-shaped tray with a leaf imprint, for rings, keys and little keepsakes.",
    image: "/assets/cards/heart-tray.svg",
    href: "#",
  },
  {
    name: "Bubble Tray with Tulip Candles",
    label: "Bubble Tray",
    blurb: "A bubble tray paired with tulip candles. A gift that is ready to glow.",
    image: "/assets/cards/tulip-tray.svg",
    href: "#",
  },
  {
    name: "Coaster Set",
    label: "Coasters",
    blurb: "Speckled coasters for the table and the bar cart, poured in your colours.",
    image: "/assets/cards/coasters.svg",
    href: "#",
  },
  {
    name: "Tealight Holders",
    label: "Tealights",
    blurb: "Little holders that bring a soft glow to a shelf, a desk or a festive table.",
    image: "/assets/cards/tealights.svg",
    href: "#",
  },
];

const AUTOPLAY_MS = 5500;
const SWIPE_PX = 40;
const n = products.length;
const half = Math.floor(n / 2);
const pad = (v: number) => String(v).padStart(2, "0");

/** Position of card `i` relative to the active card, wrapped into -half..half. */
const offsetOf = (i: number, active: number) => ((i - active + half + n * 2) % n) - half;

type State = { active: number; prev: number };

function reducer(state: State, next: number): State {
  const active = ((next % n) + n) % n;
  return active === state.active ? state : { active, prev: state.active };
}

export default function HeroFan() {
  const [{ active, prev }, go] = useReducer(reducer, { active: 0, prev: 0 });
  const [paused, setPaused] = useState(false);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const product = products[active];

  // Re-arming on every change also restarts the timer after manual navigation.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [active, paused]);

  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, moved: false };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > SWIPE_PX) {
      s.moved = true;
      go(active + (dx < 0 ? 1 : -1));
    }
  };
  const onCardClick = (i: number) => {
    // A swipe that ends on a card shouldn't also select that card.
    if (swipe.current?.moved) {
      swipe.current = null;
      return;
    }
    go(i);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(active - 1);
    if (e.key === "ArrowRight") go(active + 1);
  };
  const onBlur = (e: FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Top picks"
      className={styles.section}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={onBlur}
    >
      <div className={styles.head}>
        <Eyebrow>Top picks</Eyebrow>
        <h1 className={styles.title}>
          You choose, <em>we create.</em>
        </h1>
      </div>

      <div className={styles.stage}>
        <div className={styles.fan} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onKeyDown={onKeyDown}>
          {products.map((p, i) => {
            const o = offsetOf(i, active);
            const o0 = offsetOf(i, 0);
            const wrapped = Math.abs(o - offsetOf(i, prev)) > half;
            return (
              <button
                key={p.name}
                type="button"
                className={wrapped ? `${styles.card} ${styles.instant}` : styles.card}
                aria-current={o === 0}
                aria-label={o === 0 ? p.name : `Show ${p.name}`}
                onClick={() => onCardClick(i)}
                style={
                  {
                    zIndex: n - Math.abs(o),
                    transform: `translateX(calc(var(--step) * ${o})) translateY(calc(var(--drop) * ${o * o})) rotate(${o * 4}deg) scale(${o === 0 ? 1.04 : 1})`,
                    "--o0": o0,
                    animationDelay: `${150 + Math.abs(o0) * 90}ms`,
                  } as CSSProperties
                }
              >
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 280px, 340px"
                  // All cards are above the fold: preload the first, load the rest eagerly.
                  preload={o0 === 0}
                  loading={o0 === 0 ? undefined : "eager"}
                  unoptimized={p.image.endsWith(".svg")}
                  draggable={false}
                  style={{ objectFit: "cover" }}
                />
                <span className={styles.label}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.info}>
        <div key={active} className={styles.text}>
          <Eyebrow>Top pick · {pad(active + 1)}</Eyebrow>
          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.blurb}>{product.blurb}</p>
        </div>
        <div className={styles.actions}>
          <ButtonLink href={product.href}>View product</ButtonLink>
          <ButtonLink href="#" variant="ghost" style={{ gap: 10 }}>
            View more
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
              <path d="M4 12h16M14 6l6 6-6 6" />
            </svg>
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
