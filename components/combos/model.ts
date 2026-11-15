// Shared, pure types and helpers for combo pieces: used by the storefront data layer, the combo
// configurators (client) and the admin combo screens. No server-only imports here.
import { bundleTotal, type Discount, type PricedLine } from "@/lib/pricing";
import type { LineChoice } from "@/lib/cart/contract";

export type Swatch = { slotLabel: string; colourName: string; hex: string };

export type PieceColourway = { id: string; name: string; swatches: Swatch[] };

/** An effect combination of the finish (like a colourway); `price` is per piece. */
export type PieceEffectOption = {
  id: string;
  name: string;
  price: number;
  effects: { slot: string; name: string; image: string | null }[];
};

export type PieceVariant = { id: string; setSize: number; price: number };

export type PieceImage = { key: string; alt: string; colourwayId: string | null };

/** One finish of a product, with everything the shopper can pick inside it. Only priced variants. */
export type PieceFinish = {
  productFinishId: string;
  name: string;
  isDefault: boolean;
  images: PieceImage[];
  colourways: PieceColourway[];
  effectOptions: PieceEffectOption[];
  variants: PieceVariant[];
};

export type PieceProduct = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  sizeText: string;
  soldInSets: boolean;
  finishes: PieceFinish[];
};

/** What the shopper has chosen for one piece. `effectCombinationId` is null for no effect. */
export type PieceChoice = {
  productFinishId: string;
  setSize: number;
  colourwayId: string | null;
  effectCombinationId: string | null;
};

/** A fresh choice inside `finish`, keeping the set size when that finish offers it. */
export function choiceForFinish(finish: PieceFinish, preferredSetSize?: number): PieceChoice {
  const v = finish.variants.find((x) => x.setSize === preferredSetSize) ?? finish.variants[0];
  return {
    productFinishId: finish.productFinishId,
    setSize: v?.setSize ?? 1,
    colourwayId: finish.colourways[0]?.id ?? null,
    effectCombinationId: null,
  };
}

/** The starting choice: a given finish and set size (an admin combo's defaults) or the product's default. */
export function defaultChoice(p: PieceProduct, productFinishId?: string | null, setSize?: number): PieceChoice | null {
  const f =
    p.finishes.find((x) => x.productFinishId === productFinishId) ??
    p.finishes.find((x) => x.isDefault) ??
    p.finishes[0];
  return f ? choiceForFinish(f, setSize) : null;
}

export function finishOf(p: PieceProduct, c: PieceChoice) {
  return p.finishes.find((f) => f.productFinishId === c.productFinishId) ?? null;
}

export function variantOf(p: PieceProduct, c: PieceChoice) {
  return finishOf(p, c)?.variants.find((v) => v.setSize === c.setSize) ?? null;
}

/** The chosen effect combination, or null (none chosen, or no longer offered). */
export function effectOf(f: PieceFinish, c: PieceChoice) {
  return f.effectOptions.find((o) => o.id === c.effectCombinationId) ?? null;
}

/** The priced line for one piece (qty 1), or null if the choice no longer matches the catalogue. */
export function pricedLine(p: PieceProduct, c: PieceChoice): PricedLine | null {
  const f = finishOf(p, c);
  const v = f?.variants.find((x) => x.setSize === c.setSize);
  if (!f || !v) return null;
  return { variantPrice: v.price, effectExtras: effectOf(f, c) ? [effectOf(f, c)!.price] : [], setSize: c.setSize, qty: 1 };
}

/** The cart line for one piece. */
export function lineChoice(p: PieceProduct, c: PieceChoice): LineChoice | null {
  const f = finishOf(p, c);
  const v = variantOf(p, c);
  if (!f || !v) return null;
  return {
    variantId: v.id,
    colourwayId: c.colourwayId,
    effectCombinationId: effectOf(f, c)?.id ?? null,
    qty: 1,
  };
}

/** The bundle price for a set of pieces with a saving (combo) or tier discount (shopper-built). */
export function priceBundle(pieces: { product: PieceProduct; choice: PieceChoice }[], discount: Discount | null) {
  const lines: PricedLine[] = [];
  for (const { product, choice } of pieces) {
    const l = pricedLine(product, choice);
    if (!l) return null;
    lines.push(l);
  }
  return bundleTotal(lines, discount);
}

/** The photo for a piece: the one linked to the chosen colourway, else the finish's first photo. */
export function pieceImage(p: PieceProduct, c: PieceChoice): PieceImage | null {
  const f = finishOf(p, c);
  if (!f) return null;
  return f.images.find((i) => i.colourwayId && i.colourwayId === c.colourwayId) ?? f.images[0] ?? null;
}

/** How a saving reads to the shopper: "₹50" style is formatted by the caller; percent reads "10%". */
export function discountLabel(d: Discount, format: (n: number) => string) {
  return d.type === "percent" ? `${d.value}%` : format(d.value);
}

/** CSS background for a colourway swatch: one colour, or the colours split around the circle. */
export function swatchBackground(swatches: Swatch[]) {
  if (swatches.length === 0) return "#E2D9CE";
  if (swatches.length === 1) return swatches[0].hex;
  const step = 360 / swatches.length;
  const stops = swatches.map((s, i) => `${s.hex} ${i * step}deg ${(i + 1) * step}deg`).join(", ");
  return `conic-gradient(${stops})`;
}
