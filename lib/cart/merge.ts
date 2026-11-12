import "server-only";
// Sign-in merge: the guest's cart lines, bundles and wishlist move to the user in one transaction.
// Matching lines add up (capped at the cart limit), wishlist duplicates drop. The caller clears the
// guest cookie. Safe to run twice: the second run finds no guest rows.
import { and, eq, inArray } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { cartBundles, cartItems, carts, wishlistItems } from "@/db/schema";
import { readSettingsUncached } from "@/lib/data/settings";
import { lineKey, planMerge } from "./rules";

async function linesOf(tx: Tx, cartId: string) {
  return tx.query.cartItems.findMany({
    where: (i, { eq: e }) => e(i.cartId, cartId),
    columns: { id: true, bundleId: true, variantId: true, colourwayId: true, qty: true },
    with: {
      effects: { columns: { effectOptionId: true } },
      variant: {
        columns: { id: true },
        with: {
          productFinish: { columns: { id: true }, with: { product: { columns: { id: true, cartLimit: true } } } },
        },
      },
    },
  });
}

export async function mergeGuestIntoUser(guestId: string, userId: string) {
  const settings = await readSettingsUncached();
  await db.transaction(async (tx) => {
    const guestCart = await tx.query.carts.findFirst({
      where: (c, { and: all, eq: e }) => all(e(c.guestId, guestId), e(c.status, "active")),
      columns: { id: true },
    });
    if (guestCart) {
      const userCart = await tx.query.carts.findFirst({
        where: (c, { and: all, eq: e }) => all(e(c.userId, userId), e(c.status, "active")),
        columns: { id: true },
      });
      if (!userCart) {
        // Nothing to add up: the guest cart simply becomes the user's.
        await tx.update(carts).set({ userId, guestId: null }).where(eq(carts.id, guestCart.id));
      } else {
        const [userRows, guestRows, userBundles, guestBundles] = await Promise.all([
          linesOf(tx, userCart.id),
          linesOf(tx, guestCart.id),
          tx.query.cartBundles.findMany({ where: (b, { eq: e }) => e(b.cartId, userCart.id), columns: { id: true, qty: true } }),
          tx.query.cartBundles.findMany({ where: (b, { eq: e }) => e(b.cartId, guestCart.id), columns: { id: true, qty: true } }),
        ]);
        const limits = new Map<string, number>();
        for (const r of [...userRows, ...guestRows]) {
          const p = r.variant.productFinish.product;
          limits.set(p.id, p.cartLimit ?? settings.defaultCartLimit);
        }
        const toLine = (r: (typeof userRows)[number]) => ({
          id: r.id,
          productId: r.variant.productFinish.product.id,
          qty: r.qty,
          key: lineKey(
            r.variantId,
            r.colourwayId,
            r.effects.map((e) => e.effectOptionId),
          ),
        });
        const toBundle = (rows: typeof userRows) => (b: { id: string; qty: number }) => ({
          id: b.id,
          qty: b.qty,
          items: rows.filter((r) => r.bundleId === b.id).map((r) => ({ productId: r.variant.productFinish.product.id, qty: r.qty })),
        });
        const plan = planMerge({
          userLines: userRows.filter((r) => !r.bundleId).map(toLine),
          userBundles: userBundles.map(toBundle(userRows)),
          guestLines: guestRows.filter((r) => !r.bundleId).map(toLine),
          guestBundles: guestBundles.map(toBundle(guestRows)),
          limitOf: (id) => limits.get(id) ?? settings.defaultCartLimit,
        });

        for (const u of plan.increase) await tx.update(cartItems).set({ qty: u.qty }).where(eq(cartItems.id, u.id));
        for (const m of plan.move)
          await tx.update(cartItems).set({ cartId: userCart.id, qty: m.qty }).where(eq(cartItems.id, m.id));
        for (const b of plan.moveBundles) {
          await tx.update(cartBundles).set({ cartId: userCart.id, qty: b.qty }).where(eq(cartBundles.id, b.id));
          await tx.update(cartItems).set({ cartId: userCart.id }).where(eq(cartItems.bundleId, b.id));
        }
        // Whatever didn't fit goes with the guest cart.
        await tx.delete(carts).where(eq(carts.id, guestCart.id));
      }
    }

    const saved = await tx
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.guestId, guestId));
    if (saved.length) {
      await tx
        .insert(wishlistItems)
        .values(saved.map((s) => ({ userId, productId: s.productId })))
        .onConflictDoNothing();
      await tx.delete(wishlistItems).where(
        and(
          eq(wishlistItems.guestId, guestId),
          inArray(
            wishlistItems.productId,
            saved.map((s) => s.productId),
          ),
        ),
      );
    }
  });
}
