// The cart's public contract, shared by the product page, the combo pages and the cart page.
// lib/cart/actions.ts ("use server") implements these; this file holds only types.

/** One piece the shopper chose: a variant (finish × set size) in a colourway, with effect options. */
export type LineChoice = {
  variantId: string;
  colourwayId: string | null;
  effectOptionIds: string[];
  qty: number;
};

export type CartActionResult = { ok: true; cartCount: number } | { ok: false; error: string };

/**
 * addToCart(choice: LineChoice): Promise<CartActionResult>
 *   A loose line. Matching lines (same variant, colourway, effects) add up, capped at the cart limit.
 *
 * addBundleToCart(input: { kind: "combo"; comboId: string; items: LineChoice[] }
 *                      | { kind: "custom"; items: LineChoice[] }): Promise<CartActionResult>
 *   A combo bundle. `combo` = the admin's combo (items in combo_items order, one per piece);
 *   `custom` = shopper-built (2–4 items, only when custom combos are switched on).
 *
 * updateLineQty(lineId, qty), removeLine(lineId), updateBundleQty(bundleId, qty), removeBundle(bundleId)
 * toggleWishlist(productId): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }>
 */
export {};
