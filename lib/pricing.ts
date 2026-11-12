// One pricing module for the product page, the cart and (later) checkout. Pure functions only, so
// they are unit tested in lib/pricing.test.ts. All money is whole rupees.

export type Discount = { type: "amount" | "percent"; value: number };

export type PricedLine = {
  /** Variant price for one set (or one piece when not sold in sets). Null = price on request. */
  variantPrice: number | null;
  /** Extra price per piece of each chosen effect option. */
  effectExtras: number[];
  setSize: number;
  qty: number;
};

/** Rule 1: unit price = variant price + (sum of effect extras × set size). Null when unpriced. */
export function unitPrice(l: Pick<PricedLine, "variantPrice" | "effectExtras" | "setSize">): number | null {
  if (l.variantPrice === null) return null;
  const extras = l.effectExtras.reduce((a, b) => a + b, 0);
  return l.variantPrice + extras * l.setSize;
}

/** Rule 2: line total = unit price × quantity. */
export function lineTotal(l: PricedLine): number | null {
  const u = unitPrice(l);
  return u === null ? null : u * l.qty;
}

/** Rule 5: percentages round to the nearest rupee; a discount never takes a total below zero. */
export function discountAmount(total: number, d: Discount | null | undefined): number {
  if (!d || d.value <= 0 || total <= 0) return 0;
  const raw = d.type === "percent" ? Math.round((total * Math.min(d.value, 100)) / 100) : d.value;
  return Math.min(raw, total);
}

export type BundleResult = {
  /** Sum of its lines before the saving. */
  piecesTotal: number;
  saving: number;
  total: number;
  /** False when a line is unpriced — then the bundle can't be totalled. */
  priced: boolean;
};

/**
 * Rules 3 and 4: a bundle (admin combo or shopper-built) = sum of its lines − its saving.
 * `discount` is the combo's saving or the tier for its piece count; null when it no longer applies
 * (rule 9: combo withdrawn or custom combos switched off).
 */
export function bundleTotal(lines: PricedLine[], discount: Discount | null, bundleQty = 1): BundleResult {
  let piecesTotal = 0;
  for (const l of lines) {
    const t = lineTotal(l);
    if (t === null) return { piecesTotal: 0, saving: 0, total: 0, priced: false };
    piecesTotal += t;
  }
  const saving = discountAmount(piecesTotal, discount);
  return {
    piecesTotal: piecesTotal * bundleQty,
    saving: saving * bundleQty,
    total: (piecesTotal - saving) * bundleQty,
    priced: true,
  };
}

/** For the admin combo form: the saving implied by a typed combo price for the default finishes. */
export function savingFromComboPrice(piecesTotal: number, comboPrice: number): number {
  return Math.max(0, piecesTotal - comboPrice);
}

/** Shopper-built combos: the tier whose item_count matches the bundle's piece count. */
export function tierFor<T extends { itemCount: number }>(tiers: T[], pieceCount: number): T | null {
  return tiers.find((t) => t.itemCount === pieceCount) ?? null;
}

export type ShippingSettings = { shippingFee: number; freeShippingFrom: number };

/** Rule 6: shipping from settings. Free on an empty cart or at/above the threshold. */
export function shippingFor(subtotal: number, s: ShippingSettings): number {
  return subtotal === 0 || subtotal >= s.freeShippingFrom ? 0 : s.shippingFee;
}

/** Rule 6: subtotal = loose lines + bundles. Unpriced loose lines are skipped (quote items). */
export function cartTotals(loose: PricedLine[], bundles: BundleResult[], s: ShippingSettings) {
  const looseTotal = loose.reduce((sum, l) => sum + (lineTotal(l) ?? 0), 0);
  const bundlesTotal = bundles.reduce((sum, b) => sum + (b.priced ? b.total : 0), 0);
  const savings = bundles.reduce((sum, b) => sum + (b.priced ? b.saving : 0), 0);
  const subtotal = looseTotal + bundlesTotal;
  const shipping = shippingFor(subtotal, s);
  return { subtotal, savings, shipping, total: subtotal + shipping };
}

/** Rule 7: tiles show the lowest active price, with "From" when there is more than one price. */
export function listingPrice(prices: (number | null)[]): { price: number | null; from: boolean } {
  const priced = prices.filter((p): p is number => p !== null);
  if (priced.length === 0) return { price: null, from: false };
  const min = Math.min(...priced);
  return { price: min, from: new Set(priced).size > 1 };
}

/**
 * Rule 8: a product's quantity across all its cart lines can't pass its cart limit. Returns how many
 * more can be added (0 when full). `inCart` counts pieces of this product already in the cart.
 */
export function remainingAllowance(limit: number, inCart: number): number {
  return Math.max(0, limit - inCart);
}

/** Rupees with Indian digit grouping, e.g. ₹1,25,000. Done by hand so server and browser agree. */
export function formatPrice(rupees: number) {
  const negative = rupees < 0;
  const digits = String(Math.abs(Math.round(rupees)));
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${negative ? "−" : ""}₹${rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},` : ""}${last3}`;
}

export function priceLabel(p: { price: number | null; from?: boolean }) {
  if (p.price === null) return "Price on request";
  return p.from ? `From ${formatPrice(p.price)}` : formatPrice(p.price);
}
