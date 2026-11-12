"use server";
// The cart's Server Actions (the contract in lib/cart/contract.ts). Every action validates its
// input with Zod, checks the line or bundle belongs to the visitor, and works out limits on the
// server. Prices are never taken from the browser.
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartBundles, cartItemEffects, cartItems, carts, wishlistItems } from "@/db/schema";
import { getSettings } from "@/lib/data/settings";
import { getSession } from "@/lib/session";
import { remainingAllowance } from "@/lib/pricing";
import type { CartActionResult, LineChoice } from "./contract";
import { bundleKey, checkEffects, lineKey, maxBundleQty } from "./rules";
import { cartState, countOf, findCartId, itemKey, itemProductId } from "./read";
import { clearGuestCookie, currentOwner, ensureOwner, readGuestId, type Owner } from "./owner";
import { mergeGuestIntoUser } from "./merge";

const MAX_QTY = 99;
const id = z.guid();
const lineChoice = z.object({
  variantId: id,
  colourwayId: id.nullable(),
  effectOptionIds: z.array(id).max(12),
  qty: z.number().int().min(1).max(MAX_QTY),
});
const bundleInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("combo"), comboId: id, items: z.array(lineChoice).min(2).max(4) }),
  z.object({ kind: z.literal("custom"), items: z.array(lineChoice).min(2).max(4) }),
]);

const GENERIC = "Something went wrong. Please try again.";
const INVALID = "That choice isn't valid any more. Please refresh the page and choose again.";

class CartError extends Error {}

/** Runs an action body, turning CartError into a message and anything else into a generic one. */
async function run<T extends { ok: true }>(body: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    const r = await body();
    refresh();
    return r;
  } catch (e) {
    if (e instanceof CartError) return { ok: false, error: e.message };
    console.error("[cart]", e);
    return { ok: false, error: GENERIC };
  }
}

const limitMessage = (limit: number, left: number) =>
  left <= 0
    ? `You already have the most of this piece we can take in one order (${limit}). Message us for bulk orders.`
    : `You can add ${left} more of this piece (up to ${limit} per order). Message us for bulk orders.`;

/** Checks a choice against the catalogue: active, priced, colourway and effects of that finish. */
async function resolveChoice(c: LineChoice) {
  const v = await db.query.productVariants.findFirst({
    where: (t, { eq: e }) => e(t.id, c.variantId),
    columns: { id: true, price: true, active: true },
    with: {
      productFinish: {
        columns: { id: true, active: true },
        with: {
          product: { columns: { id: true, status: true, cartLimit: true, comboEligible: true, name: true } },
          finish: {
            columns: { active: true },
            with: {
              colourways: { where: (cw, { eq: e }) => e(cw.active, true), columns: { id: true } },
              effectSlots: {
                columns: { id: true, label: true, required: true },
                with: { options: { where: (o, { eq: e }) => e(o.active, true), columns: { id: true } } },
              },
            },
          },
        },
      },
    },
  });
  const pf = v?.productFinish;
  if (!v || !pf || !v.active || !pf.active || !pf.finish.active || pf.product.status !== "active")
    throw new CartError("This piece is no longer available.");
  if (v.price === null) throw new CartError("This piece is priced on request. Message us for a quote.");

  const colourways = pf.finish.colourways.map((cw) => cw.id);
  let colourwayId = c.colourwayId;
  if (colourways.length === 0) colourwayId = null;
  else if (!colourwayId) throw new CartError("Choose a colourway.");
  else if (!colourways.includes(colourwayId)) throw new CartError(INVALID);

  const effectError = checkEffects(
    pf.finish.effectSlots.map((s) => ({ id: s.id, label: s.label, required: s.required, optionIds: s.options.map((o) => o.id) })),
    c.effectOptionIds,
  );
  if (effectError) throw new CartError(effectError);

  const effectOptionIds = [...new Set(c.effectOptionIds)];
  return {
    product: pf.product,
    line: { variantId: v.id, colourwayId, effectOptionIds, qty: c.qty },
    key: lineKey(v.id, colourwayId, effectOptionIds),
  };
}

async function getOrCreateCart(owner: Owner) {
  const existing = await findCartId(owner);
  if (existing) return existing;
  const [row] = await db
    .insert(carts)
    .values({ userId: owner.userId, guestId: owner.guestId })
    .onConflictDoNothing()
    .returning({ id: carts.id });
  return row?.id ?? (await findCartId(owner))!;
}

async function insertLine(
  cartId: string,
  bundleId: string | null,
  l: { variantId: string; colourwayId: string | null; effectOptionIds: string[]; qty: number },
  tx: Pick<typeof db, "insert"> = db,
  /** Bundle pieces get ascending timestamps so the cart lists them in combo order. */
  createdAt?: Date,
) {
  const [row] = await tx
    .insert(cartItems)
    .values({ cartId, bundleId, variantId: l.variantId, colourwayId: l.colourwayId, qty: l.qty, createdAt })
    .returning({ id: cartItems.id });
  if (l.effectOptionIds.length)
    await tx.insert(cartItemEffects).values(l.effectOptionIds.map((effectOptionId) => ({ cartItemId: row.id, effectOptionId })));
}

/** A loose line. Matching lines add up; the product's total can't pass its cart limit. */
export async function addToCart(choice: LineChoice): Promise<CartActionResult> {
  const parsed = lineChoice.safeParse(choice);
  if (!parsed.success) return { ok: false, error: INVALID };
  return run(async () => {
    const { product, line, key } = await resolveChoice(parsed.data);
    const owner = await ensureOwner();
    const cartId = await getOrCreateCart(owner);
    const state = await cartState(cartId);
    const limit = product.cartLimit ?? state.settings.defaultCartLimit;
    const left = remainingAllowance(limit, state.totals.get(product.id) ?? 0);
    if (line.qty > left) throw new CartError(limitMessage(limit, left));

    const match = state.loose.find((i) => itemKey(i) === key);
    if (match) await db.update(cartItems).set({ qty: match.qty + line.qty }).where(eq(cartItems.id, match.id));
    else await insertLine(cartId, null, line);
    return { ok: true as const, cartCount: countOf(await cartState(cartId)) };
  });
}

/** A combo bundle: the admin's combo (pieces in combo order) or a shopper-built one. */
export async function addBundleToCart(
  input: { kind: "combo"; comboId: string; items: LineChoice[] } | { kind: "custom"; items: LineChoice[] },
): Promise<CartActionResult> {
  const parsed = bundleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const data = parsed.data;
  return run(async () => {
    const settings = await getSettings();
    const resolved: Awaited<ReturnType<typeof resolveChoice>>[] = [];
    for (const c of data.items) resolved.push(await resolveChoice(c));

    let comboId: string | null = null;
    if (data.kind === "combo") {
      const combo = await db.query.combos.findFirst({
        where: (t, { eq: e }) => e(t.id, data.comboId),
        columns: { id: true, status: true },
        with: { items: { columns: { productId: true, sort: true } } },
      });
      if (!combo || combo.status !== "active") throw new CartError("This combo is no longer offered.");
      const pieces = [...combo.items].sort((a, b) => a.sort - b.sort);
      if (pieces.length !== resolved.length || pieces.some((p, i) => p.productId !== resolved[i].product.id))
        throw new CartError(INVALID);
      comboId = combo.id;
    } else {
      if (!settings.customCombosEnabled) throw new CartError("Build-your-own combos aren't available right now.");
      const notEligible = resolved.find((r) => !r.product.comboEligible);
      if (notEligible) throw new CartError(`${notEligible.product.name} can't be part of a combo.`);
    }

    const owner = await ensureOwner();
    const cartId = await getOrCreateCart(owner);
    const state = await cartState(cartId);
    const limits = new Map(resolved.map((r) => [r.product.id, r.product.cartLimit ?? settings.defaultCartLimit]));
    const pieces = resolved.map((r) => ({ productId: r.product.id, qty: r.line.qty }));
    if (maxBundleQty(pieces, state.totals, (pid) => limits.get(pid) ?? settings.defaultCartLimit) < 1)
      throw new CartError("Adding this combo would pass the most we can take of one of its pieces in one order.");

    const key = bundleKey(
      data.kind,
      comboId,
      resolved.map((r) => `${r.key}x${r.line.qty}`),
    );
    const same = state.bundles.find(
      (b) =>
        b.kind === data.kind &&
        (b.comboId ?? null) === comboId &&
        bundleKey(
          b.kind,
          b.comboId,
          state.items.filter((i) => i.bundleId === b.id).map((i) => `${itemKey(i)}x${i.qty}`),
        ) === key,
    );
    if (same) {
      await db.update(cartBundles).set({ qty: same.qty + 1 }).where(eq(cartBundles.id, same.id));
    } else {
      await db.transaction(async (tx) => {
        const [b] = await tx
          .insert(cartBundles)
          .values({ cartId, kind: data.kind, comboId, qty: 1 })
          .returning({ id: cartBundles.id });
        const base = Date.now();
        for (const [i, r] of resolved.entries()) await insertLine(cartId, b.id, r.line, tx, new Date(base + i));
      });
    }
    return { ok: true as const, cartCount: countOf(await cartState(cartId)) };
  });
}

/** The visitor's cart, for the actions that change an existing line or bundle. */
async function ownCart() {
  const owner = await currentOwner();
  const cartId = owner ? await findCartId(owner) : null;
  if (!cartId) throw new CartError("Your cart has changed. Please refresh the page.");
  return cartId;
}

export async function updateLineQty(lineId: string, qty: number): Promise<CartActionResult> {
  const p = z.object({ lineId: id, qty: z.number().int().min(0).max(MAX_QTY) }).safeParse({ lineId, qty });
  if (!p.success) return { ok: false, error: INVALID };
  return run(async () => {
    const cartId = await ownCart();
    const state = await cartState(cartId);
    const line = state.loose.find((i) => i.id === p.data.lineId);
    if (!line) throw new CartError("Your cart has changed. Please refresh the page.");
    if (p.data.qty === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, line.id));
    } else if (p.data.qty !== line.qty) {
      const pid = itemProductId(line);
      const limit = state.limitOf(pid);
      const others = (state.totals.get(pid) ?? 0) - line.qty;
      if (p.data.qty > line.qty && others + p.data.qty > limit) throw new CartError(limitMessage(limit, limit - others - line.qty));
      await db.update(cartItems).set({ qty: p.data.qty }).where(eq(cartItems.id, line.id));
    }
    return { ok: true as const, cartCount: countOf(await cartState(cartId)) };
  });
}

export async function removeLine(lineId: string): Promise<CartActionResult> {
  return updateLineQty(lineId, 0);
}

export async function updateBundleQty(bundleId: string, qty: number): Promise<CartActionResult> {
  const p = z.object({ bundleId: id, qty: z.number().int().min(0).max(MAX_QTY) }).safeParse({ bundleId, qty });
  if (!p.success) return { ok: false, error: INVALID };
  return run(async () => {
    const cartId = await ownCart();
    const state = await cartState(cartId);
    const bundle = state.bundles.find((b) => b.id === p.data.bundleId);
    if (!bundle) throw new CartError("Your cart has changed. Please refresh the page.");
    if (p.data.qty === 0) {
      await db.delete(cartBundles).where(eq(cartBundles.id, bundle.id)); // its items cascade
    } else if (p.data.qty !== bundle.qty) {
      if (p.data.qty > bundle.qty) {
        const pieces = state.items
          .filter((i) => i.bundleId === bundle.id)
          .map((i) => ({ productId: itemProductId(i), qty: i.qty }));
        const without = new Map(state.totals);
        for (const pc of pieces) without.set(pc.productId, (without.get(pc.productId) ?? 0) - pc.qty * bundle.qty);
        if (maxBundleQty(pieces, without, state.limitOf) < p.data.qty)
          throw new CartError("That's the most of this combo we can take in one order. Message us for bulk orders.");
      }
      await db.update(cartBundles).set({ qty: p.data.qty }).where(eq(cartBundles.id, bundle.id));
    }
    return { ok: true as const, cartCount: countOf(await cartState(cartId)) };
  });
}

export async function removeBundle(bundleId: string): Promise<CartActionResult> {
  return updateBundleQty(bundleId, 0);
}

/** Saves or un-saves a product. Guests get the cookie on their first save. */
export async function toggleWishlist(
  productId: string,
): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const p = id.safeParse(productId);
  if (!p.success) return { ok: false, error: INVALID };
  return run(async () => {
    const owner = await ensureOwner();
    const where = and(
      owner.userId ? eq(wishlistItems.userId, owner.userId) : eq(wishlistItems.guestId, owner.guestId!),
      eq(wishlistItems.productId, p.data),
    );
    const existing = await db.select({ id: wishlistItems.id }).from(wishlistItems).where(where);
    if (existing.length) {
      await db.delete(wishlistItems).where(where);
      return { ok: true as const, saved: false };
    }
    const product = await db.query.products.findFirst({
      where: (t, { eq: e }) => e(t.id, p.data),
      columns: { status: true },
    });
    if (product?.status !== "active") throw new CartError("This piece is no longer available.");
    await db
      .insert(wishlistItems)
      .values({ userId: owner.userId, guestId: owner.guestId, productId: p.data })
      .onConflictDoNothing();
    return { ok: true as const, saved: true };
  });
}

/**
 * Moves the guest cart and wishlist to the signed-in user and clears the guest cookie. The sign-in
 * and verify forms call this right after success. (lib/auth.ts also merges in a session hook; this
 * is the second, idempotent path.)
 */
export async function claimGuestCart(): Promise<{ ok: boolean }> {
  try {
    const s = await getSession();
    const guestId = await readGuestId();
    if (!s || !guestId) return { ok: true };
    await mergeGuestIntoUser(guestId, s.user.id);
    await clearGuestCookie();
    refresh();
    return { ok: true };
  } catch (e) {
    console.error("[cart] merge failed", e);
    return { ok: false };
  }
}
