"use client";

import Image from "next/image";
import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { products } from "@/lib/products";
import { ButtonLink, Eyebrow } from "../ui";
import styles from "./HeroFan.module.css";

const AUTOPLAY_MS = 5500;
const INTRO_MS = 1600;
/** Time constant (ms) of the easing that glides the strip toward where it should rest. */
const GLIDE_MS = 110;
/** A wheel gesture is over once no wheel event has arrived for this long. */
const WHEEL_IDLE_MS = 120;
const DRAG_START_PX = 6;
const n = products.length;
// Cards sit on an endless strip, so enough copies of the products are rendered to run past
// both edges of a wide window. Cards fade in and out at the outermost slots.
const REACH = 7;
const mod = (v: number) => ((v % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// Math.tanh, cosh and atan can differ in the last digits between Node and the browser, which
// would make the server-rendered styles disagree with the client's. Rounding hides that.
const round = (v: number) => Math.round(v * 1000) / 1000;

/** Height of the wave at offset `o` from the centre: flat in the middle, levelling off further out. */
const waveY = (o: number) => Math.tanh((o / 2) ** 3);

/** Tilt that follows the slope of the wave, so each card sits along the line. */
const waveTilt = (o: number) => {
  const u = o / 2;
  const slope = (1.5 * u * u) / Math.cosh(u ** 3) ** 2;
  return -Math.atan(slope * 0.12) * (180 / Math.PI);
};

/** Cards grow as they near the centre. */
const SCALE_MAX = 1.35;
const SCALE_MIN = 0.7;
const SCALE_DROP = 0.18;
const scaleOf = (o: number) => Math.max(SCALE_MIN, SCALE_MAX - SCALE_DROP * Math.abs(o));

/**
 * Distance from the centre card, in card widths. Each step is as wide as the card it
 * crosses (less a small overlap), so the gaps stay even however much the cards shrink.
 */
const OVERLAP = 0.06;
const SHRINK_END = (SCALE_MAX - SCALE_MIN) / SCALE_DROP;
const spanOf = (a: number) => {
  const sloped = Math.min(a, SHRINK_END);
  return SCALE_MAX * sloped - (SCALE_DROP * sloped * sloped) / 2 + SCALE_MIN * (a - sloped) - OVERLAP * a;
};

/** Everything that depends on a card's offset `o` from the centre. */
function layoutOf(o: number) {
  const a = Math.abs(o);
  return {
    transform: `translateX(calc(var(--card-w) * var(--spread) * ${round(Math.sign(o) * spanOf(a))})) translateY(calc(var(--wave) * ${round(-waveY(o))})) rotate(${round(waveTilt(o))}deg) scale(${round(scaleOf(o))})`,
    // Fully visible out to the last-but-one slot, gone at the last.
    opacity: round(clamp(REACH - a, 0, 1)),
    zIndex: Math.round(100 - a * 10),
    // Outer cards melt into the page.
    fade: round(Math.min(0.6, a * 0.14)),
  };
}

function paint(el: HTMLElement, o: number) {
  const l = layoutOf(o);
  el.style.transform = l.transform;
  el.style.opacity = String(l.opacity);
  el.style.zIndex = String(l.zIndex);
  el.style.setProperty("--fade", String(l.fade));
}

export default function HeroFan() {
  // The strip's position moves continuously (and never wraps), so it lives in refs and is
  // painted straight onto the cards each frame. `center` is the card it currently rests on.
  const target = useRef(0);
  const current = useRef(0);
  const raf = useRef(0);
  const cards = useRef(new Map<number, HTMLButtonElement>());
  const stageRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; from: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const [center, setCenter] = useState(0);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState(true);
  const active = mod(center);
  const product = products[active];

  /** Animate `current` toward `target`, painting every frame until it arrives. */
  const glide = useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const diff = target.current - current.current;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      current.current =
        still || Math.abs(diff) < 0.0008 ? target.current : current.current + diff * (1 - Math.exp(-dt / GLIDE_MS));
      cards.current.forEach((el, v) => paint(el, v - current.current));
      setCenter(Math.round(current.current));
      raf.current = current.current === target.current ? 0 : requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, []);

  /** Pixels of pointer travel that move the strip by one card. */
  const unit = () => {
    const el = cards.current.values().next().value;
    const spread = fanRef.current ? parseFloat(getComputedStyle(fanRef.current).getPropertyValue("--spread")) : 1;
    return (el?.offsetWidth ?? 220) * 1.2 * (spread || 1);
  };

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), INTRO_MS);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  // Re-arming on every change also restarts the timer after manual navigation.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => {
      target.current = Math.round(target.current) + 1;
      glide();
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [center, paused, glide]);

  // Scrolling the wheel over the cards moves the strip. React's wheel handlers are passive,
  // so this one is attached by hand to be allowed to stop the page from scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let gesture: { from: number } | null = null;
    let idle: ReturnType<typeof setTimeout>;

    const settle = () => {
      if (!gesture) return;
      const moved = target.current - gesture.from;
      // A single notch is only a fraction of a card, but it should still move one card.
      const steps = Math.abs(moved) < 0.08 ? 0 : Math.abs(moved) < 1 ? Math.sign(moved) : Math.round(moved);
      target.current = gesture.from + steps;
      gesture = null;
      glide();
    };

    const onWheel = (e: WheelEvent) => {
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!raw) return;
      e.preventDefault();
      gesture ??= { from: Math.round(target.current) };
      const px = clamp(e.deltaMode === 1 ? raw * 33 : raw, -120, 120);
      target.current = clamp(target.current + px / unit(), gesture.from - 3, gesture.from + 3);
      glide();
      clearTimeout(idle);
      idle = setTimeout(settle, WHEEL_IDLE_MS);
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      clearTimeout(idle);
    };
  }, [glide]);

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    suppressClick.current = false;
    drag.current = { id: e.pointerId, x: e.clientX, from: target.current, active: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.active) {
      if (Math.abs(dx) < DRAG_START_PX) return;
      d.active = true;
      suppressClick.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    target.current = d.from - dx / unit();
    glide();
  };
  const onPointerEnd = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    // Even a short flick moves on to the next card.
    const moved = target.current - d.from;
    target.current = Math.round(d.from + moved + Math.sign(moved) * 0.35);
    glide();
  };
  const onCardClick = (v: number) => {
    // A drag that ends on a card shouldn't also select that card.
    if (suppressClick.current) return;
    target.current = v;
    glide();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    target.current = Math.round(target.current) + (e.key === "ArrowLeft" ? -1 : 1);
    glide();
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

      <div ref={stageRef} className={styles.stage}>
        <div
          ref={fanRef}
          className={styles.fan}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
        >
          {Array.from({ length: REACH * 2 + 1 }, (_, k) => {
            const v = center - REACH + k;
            const p = products[mod(v)];
            const far = Math.abs(v - center) > 3;
            const first = layoutOf(v);
            return (
              <button
                key={v}
                // Card positions are painted by `paint`, which also runs when a card mounts.
                ref={(el) => {
                  if (!el) {
                    cards.current.delete(v);
                    return;
                  }
                  cards.current.set(v, el);
                  paint(el, v - current.current);
                }}
                type="button"
                className={intro ? `${styles.card} ${styles.intro}` : styles.card}
                aria-current={v === center}
                aria-hidden={far || undefined}
                tabIndex={far ? -1 : undefined}
                aria-label={v === center ? p.name : `Show ${p.name}`}
                onClick={() => onCardClick(v)}
                // Server-rendered starting layout; its value never changes for a given card.
                style={{
                  transform: first.transform,
                  opacity: first.opacity,
                  zIndex: first.zIndex,
                  ...({ "--fade": first.fade, "--o0": v } as object),
                  animationDelay: `${150 + Math.min(Math.abs(v), 3) * 90}ms`,
                }}
              >
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 280px, 340px"
                  // All visible cards are above the fold: preload the first, load the rest eagerly.
                  preload={v === 0}
                  loading={v === 0 ? undefined : "eager"}
                  unoptimized={p.image.endsWith(".svg")}
                  draggable={false}
                  style={{ objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.info}>
        <div key={active} className={styles.text}>
          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.category}>{product.category}</p>
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
