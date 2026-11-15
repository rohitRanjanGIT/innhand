// What the shopper has picked on the product page, and what follows from it (variant, images, price).
// Pure functions, shared by the product page's client components.
import { unitPrice } from "@/lib/pricing";
import type { LineChoice } from "@/lib/cart/contract";
import type { ProductDetail, ProductFinishOption, ProductImage } from "@/lib/data/types";

export type Choice = {
  productFinishId: string | null;
  colourwayId: string | null;
  /** The chosen effect combination of the finish (null = None). */
  effectCombinationId: string | null;
  setSize: number;
  qty: number;
};

function forFinish(f: ProductFinishOption | undefined, prev?: Choice): Omit<Choice, "qty"> {
  if (!f) return { productFinishId: null, colourwayId: null, effectCombinationId: null, setSize: 1 };
  // Keep the set size when the new finish has it; colourways and effects belong to the finish.
  const sizes = f.variants.map((v) => v.setSize);
  return {
    productFinishId: f.productFinishId,
    colourwayId: f.colourways[0]?.id ?? null,
    effectCombinationId: null,
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
  const effect = finish?.effectOptions.find((o) => o.id === c.effectCombinationId) ?? null;
  const unit = variant
    ? unitPrice({ variantPrice: variant.price, effectExtras: effect ? [effect.price] : [], setSize: variant.setSize })
    : null;
  return { finish, variant, colourway, effect, unit };
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
  const { variant, effect } = resolveChoice(p, c);
  if (!variant) return null;
  return {
    variantId: variant.id,
    colourwayId: c.colourwayId,
    effectCombinationId: effect?.id ?? null,
    qty: c.qty,
  };
}

/** "Marble · Blush + Ivory swirl · Gold leaf · Set of 4", for messages. */
export function describeChoice(p: ProductDetail, c: Choice) {
  const { finish, variant, colourway, effect } = resolveChoice(p, c);
  return [
    finish?.name,
    colourway?.name,
    effect?.name,
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
