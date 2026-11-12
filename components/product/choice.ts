// What the shopper has picked on the product page, and what follows from it (variant, images, price).
// Pure functions, shared by the product page's client components.
import { unitPrice } from "@/lib/pricing";
import type { LineChoice } from "@/lib/cart/contract";
import type { ProductDetail, ProductEffectSlot, ProductFinishOption, ProductImage } from "@/lib/data/types";

export type Choice = {
  productFinishId: string | null;
  colourwayId: string | null;
  /** Effect slot id → option id (null = none, only for optional slots). */
  effects: Record<string, string | null>;
  setSize: number;
  qty: number;
};

/** Required slots start on their first option; optional ones on a free option ("None") if any. */
export function defaultEffect(slot: ProductEffectSlot): string | null {
  if (slot.options.length === 0) return null;
  if (slot.required) return slot.options[0].id;
  return slot.options.find((o) => o.extraPrice === 0)?.id ?? null;
}

/** An optional slot with no free option of its own gets a "None" choice. */
export function needsNone(slot: ProductEffectSlot) {
  return !slot.required && !slot.options.some((o) => o.extraPrice === 0);
}

function forFinish(f: ProductFinishOption | undefined, prev?: Choice): Omit<Choice, "qty"> {
  if (!f) return { productFinishId: null, colourwayId: null, effects: {}, setSize: 1 };
  // Keep the set size when the new finish has it; colourways and effects belong to the finish.
  const sizes = f.variants.map((v) => v.setSize);
  return {
    productFinishId: f.productFinishId,
    colourwayId: f.colourways[0]?.id ?? null,
    effects: Object.fromEntries(f.effectSlots.map((s) => [s.id, defaultEffect(s)])),
    setSize: prev && sizes.includes(prev.setSize) ? prev.setSize : (sizes[0] ?? 1),
  };
}

export function initialChoice(p: ProductDetail): Choice {
  return { ...forFinish(p.finishes[0]), qty: 1 };
}

export function withFinish(p: ProductDetail, c: Choice, productFinishId: string): Choice {
  return { ...forFinish(p.finishes.find((f) => f.productFinishId === productFinishId), c), qty: c.qty };
}

export function resolveChoice(p: ProductDetail, c: Choice) {
  const finish = p.finishes.find((f) => f.productFinishId === c.productFinishId);
  const variant = finish?.variants.find((v) => v.setSize === c.setSize) ?? finish?.variants[0];
  const colourway = finish?.colourways.find((cw) => cw.id === c.colourwayId) ?? null;
  const effects = (finish?.effectSlots ?? []).flatMap((s) => {
    const o = s.options.find((x) => x.id === c.effects[s.id]);
    return o ? [{ slot: s, option: o }] : [];
  });
  const unit = variant
    ? unitPrice({ variantPrice: variant.price, effectExtras: effects.map((e) => e.option.extraPrice), setSize: variant.setSize })
    : null;
  return { finish, variant, colourway, effects, unit };
}

/** The photos for a finish and colourway: those linked to the colourway first, then the general ones. */
export function imagesFor(p: ProductDetail, finish: ProductFinishOption | undefined, colourwayId: string | null): ProductImage[] {
  if (finish) {
    const linked = colourwayId ? finish.images.filter((i) => i.colourwayId === colourwayId) : [];
    const general = finish.images.filter((i) => !i.colourwayId);
    const shown = [...linked, ...general];
    if (shown.length) return shown;
    if (finish.images.length) return finish.images;
  }
  return p.finishes.find((f) => f.images.length)?.images ?? [];
}

export function toLineChoice(p: ProductDetail, c: Choice): LineChoice | null {
  const { variant, effects } = resolveChoice(p, c);
  if (!variant) return null;
  return {
    variantId: variant.id,
    colourwayId: c.colourwayId,
    effectOptionIds: effects.map((e) => e.option.id),
    qty: c.qty,
  };
}

/** "Marble · Blush + Ivory swirl · Gold leaf · Set of 4", for messages. */
export function describeChoice(p: ProductDetail, c: Choice) {
  const { finish, variant, colourway, effects } = resolveChoice(p, c);
  return [
    finish?.name,
    colourway?.name,
    ...effects.filter((e) => e.option.extraPrice > 0 || e.slot.required).map((e) => e.option.name),
    variant && (p.soldInSets || variant.setSize > 1) ? `Set of ${variant.setSize}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** CSS background for a colourway swatch: its colours side by side. */
export function swatchBackground(hexes: string[]) {
  if (hexes.length === 0) return "#E1DAD3";
  if (hexes.length === 1) return hexes[0];
  const step = 100 / hexes.length;
  return `linear-gradient(135deg, ${hexes.map((h, i) => `${h} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;
}
