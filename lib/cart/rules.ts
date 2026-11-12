// Pure cart rules: line matching, the sign-in merge plan, cart limits across lines, and which
// discount a bundle gets (pricing rule 9). No database here, so lib/cart/rules.test.ts covers it.
import { remainingAllowance, type Discount } from "../pricing";

/** Two lines match when they are the same variant, colourway and set of effect options. */
export function lineKey(variantId: string, colourwayId: string | null, effectOptionIds: string[]) {
  return `${variantId}|${colourwayId ?? "-"}|${[...new Set(effectOptionIds)].sort().join(",")}`;
}

/** Two bundles match when they are the same kind/combo with the same pieces, in any order. */
export function bundleKey(kind: "combo" | "custom", comboId: string | null, itemKeys: string[]) {
  return `${kind}|${comboId ?? "-"}|${[...itemKeys].sort().join(";")}`;
}

export type QtyLine = { productId: string; qty: number };
export type QtyBundle = { qty: number; items: QtyLine[] };

/** Quantity of each product across loose lines and bundles (bundle items × bundle qty). Rule 8. */
export function productTotals(lines: QtyLine[], bundles: QtyBundle[] = []) {
  const totals = new Map<string, number>();
  const add = (id: string, n: number) => totals.set(id, (totals.get(id) ?? 0) + n);
  for (const l of lines) add(l.productId, l.qty);
  for (const b of bundles) for (const i of b.items) add(i.productId, i.qty * b.qty);
  return totals;
}

/** How many of each product one bundle holds per bundle qty. */
function perBundle(items: QtyLine[]) {
  return productTotals(items);
}

/** The largest bundle qty that fits every piece's remaining allowance. */
export function maxBundleQty(items: QtyLine[], totals: Map<string, number>, limitOf: (productId: string) => number) {
  let max = Infinity;
  for (const [productId, n] of perBundle(items)) {
    if (n <= 0) continue;
    max = Math.min(max, Math.floor(remainingAllowance(limitOf(productId), totals.get(productId) ?? 0) / n));
  }
  return max === Infinity ? 0 : max;
}

export type MergeLine = QtyLine & { id: string; key: string };
export type MergeBundle = QtyBundle & { id: string };

export type MergePlan = {
  /** User lines that grow: their new quantity. */
  increase: { id: string; qty: number }[];
  /** Guest lines that move to the user's cart, with their (possibly capped) quantity. */
  move: { id: string; qty: number }[];
  /** Guest bundles that move to the user's cart, with their (possibly capped) quantity. */
  moveBundles: { id: string; qty: number }[];
};

/**
 * Sign-in merge: guest lines join the user's cart. Matching lines add up, and nothing passes a
 * product's cart limit across all its lines (what doesn't fit is dropped). Bundles move whole, their
 * qty capped so every piece fits.
 */
export function planMerge(input: {
  userLines: MergeLine[];
  userBundles: MergeBundle[];
  guestLines: MergeLine[];
  guestBundles: MergeBundle[];
  limitOf: (productId: string) => number;
}): MergePlan {
  const totals = productTotals(input.userLines, input.userBundles);
  const userByKey = new Map(input.userLines.map((l) => [l.key, { ...l }]));
  const increased = new Map<string, number>();
  const moved = new Map<string, { id: string; qty: number }>();

  for (const g of input.guestLines) {
    const take = Math.min(g.qty, remainingAllowance(input.limitOf(g.productId), totals.get(g.productId) ?? 0));
    if (take <= 0) continue;
    totals.set(g.productId, (totals.get(g.productId) ?? 0) + take);
    const match = userByKey.get(g.key);
    if (match) {
      match.qty += take;
      increased.set(match.id, match.qty);
    } else if (moved.has(g.key)) {
      moved.get(g.key)!.qty += take;
    } else {
      moved.set(g.key, { id: g.id, qty: take });
    }
  }

  const moveBundles: MergePlan["moveBundles"] = [];
  for (const b of input.guestBundles) {
    const take = Math.min(b.qty, maxBundleQty(b.items, totals, input.limitOf));
    if (take <= 0) continue;
    for (const [productId, n] of perBundle(b.items)) totals.set(productId, (totals.get(productId) ?? 0) + n * take);
    moveBundles.push({ id: b.id, qty: take });
  }

  return {
    increase: [...increased].map(([id, qty]) => ({ id, qty })),
    move: [...moved.values()],
    moveBundles,
  };
}

export type BundleDiscountInput =
  | {
      kind: "combo";
      combo: { status: string; discountType: Discount["type"]; discountValue: number } | null;
    }
  | {
      kind: "custom";
      pieceCount: number;
      customCombosEnabled: boolean;
      tiers: { itemCount: number; discountType: Discount["type"]; discountValue: number }[];
    };

/** Rule 9: a withdrawn combo, or custom combos switched off, means no discount and a notice. */
export function bundleDiscount(b: BundleDiscountInput): { discount: Discount | null; notice: string | null } {
  if (b.kind === "combo") {
    if (!b.combo || b.combo.status !== "active")
      return { discount: null, notice: "This combo is no longer offered, so its saving no longer applies." };
    return { discount: { type: b.combo.discountType, value: b.combo.discountValue }, notice: null };
  }
  if (!b.customCombosEnabled)
    return {
      discount: null,
      notice: "Build-your-own combo savings are switched off, so these pieces are charged at their own prices.",
    };
  const tier = b.tiers.find((t) => t.itemCount === b.pieceCount);
  if (!tier || tier.discountValue <= 0)
    return { discount: null, notice: `There is no combo saving for ${b.pieceCount} pieces.` };
  return { discount: { type: tier.discountType, value: tier.discountValue }, notice: null };
}

/**
 * Effect choices for a finish: at most one option per slot, every option must belong to one of the
 * finish's slots, and required slots must be filled. Returns an error message or null.
 */
export function checkEffects(
  slots: { id: string; label: string; required: boolean; optionIds: string[] }[],
  chosen: string[],
): string | null {
  const unique = [...new Set(chosen)];
  const slotOf = new Map(slots.flatMap((s) => s.optionIds.map((o) => [o, s.id] as const)));
  const used = new Set<string>();
  for (const o of unique) {
    const s = slotOf.get(o);
    if (!s) return "That option is no longer available. Please choose again.";
    if (used.has(s)) return "Choose one option for each effect.";
    used.add(s);
  }
  const missing = slots.find((s) => s.required && s.optionIds.length > 0 && !used.has(s.id));
  return missing ? `Choose a ${missing.label.toLowerCase()} option.` : null;
}
