import "server-only";
// Reads the cart and works out every price on the server, every time (prices are never stored in
// the cart, so an admin price change shows at once). Uses lib/pricing.ts for all money.
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { comboDiscountTiers, wishlistItems } from "@/db/schema";
import { getSettings } from "@/lib/data/settings";
import { bundleTotal, cartTotals, lineTotal, unitPrice, type BundleResult, type PricedLine } from "@/lib/pricing";
import { bundleDiscount, lineKey, maxBundleQty, productTotals } from "./rules";
import { cartOwnerWhere, currentOwner, wishlistOwnerWhere, type Owner } from "./owner";
import type { CartBundleView, CartLineView, CartView } from "./types";

/** The owner's active cart id, or null. */
export async function findCartId(owner: Owner) {
  const row = await db.query.carts.findFirst({ where: cartOwnerWhere(owner), columns: { id: true } });
  return row?.id ?? null;
}

/** Everything the cart needs about its rows. Named columns only: no cost prices. */
export async function loadCartRows(cartId: string) {
  return db.query.carts.findFirst({
    where: (c, { eq }) => eq(c.id, cartId),
    columns: { id: true },
    with: {
      bundles: {
        columns: { id: true, kind: true, comboId: true, qty: true, createdAt: true },
        orderBy: (b) => [asc(b.createdAt)],
        with: { combo: { columns: { name: true, slug: true, status: true, discountType: true, discountValue: true } } },
      },
      items: {
        columns: { id: true, bundleId: true, variantId: true, colourwayId: true, qty: true, createdAt: true },
        orderBy: (i) => [asc(i.createdAt), asc(i.id)],
        with: {
          variant: {
            columns: { id: true, setSize: true, price: true, active: true },
            with: {
              productFinish: {
                columns: { id: true, active: true },
                with: {
                  finish: { columns: { name: true, active: true } },
                  product: {
                    columns: { id: true, slug: true, name: true, status: true, cartLimit: true, soldInSets: true },
                    with: { category: { columns: { name: true }, with: { parent: { columns: { name: true } } } } },
                  },
                  images: {
                    columns: { colourwayId: true },
                    orderBy: (img, { asc: a }) => [a(img.sort)],
                    with: { media: { columns: { r2Key: true } } },
                  },
                },
              },
            },
          },
          colourway: {
            columns: { id: true, name: true, active: true },
            with: {
              colours: {
                columns: { slotId: true },
                with: { colour: { columns: { name: true, hex: true } }, slot: { columns: { position: true } } },
              },
            },
          },
          effects: {
            columns: { effectOptionId: true },
            with: {
              option: {
                columns: { id: true, name: true, extraPrice: true, active: true },
                with: { slot: { columns: { label: true, position: true } } },
              },
            },
          },
        },
      },
    },
  });
}

type Rows = NonNullable<Awaited<ReturnType<typeof loadCartRows>>>;
type ItemRow = Rows["items"][number];

export function itemProductId(i: ItemRow) {
  return i.variant.productFinish.product.id;
}

export function itemKey(i: ItemRow) {
  return lineKey(
    i.variantId,
    i.colourwayId,
    i.effects.map((e) => e.effectOptionId),
  );
}

function isAvailable(i: ItemRow) {
  const pf = i.variant.productFinish;
  return (
    pf.product.status === "active" &&
    pf.active &&
    pf.finish.active &&
    i.variant.active &&
    (i.colourway === null || i.colourway.active) &&
    i.effects.every((e) => e.option.active)
  );
}

function pricedLine(i: ItemRow, qty = i.qty): PricedLine {
  return {
    variantPrice: isAvailable(i) ? i.variant.price : null,
    effectExtras: i.effects.map((e) => e.option.extraPrice),
    setSize: i.variant.setSize,
    qty,
  };
}

/** Rows plus the per-product limit and totals, shared by the cart read and the cart actions. */
export async function cartState(cartId: string | null) {
  const settings = await getSettings();
  const rows = cartId ? await loadCartRows(cartId) : null;
  const items = rows?.items ?? [];
  const bundles = rows?.bundles ?? [];
  const limitOf = (productId: string) => {
    const p = items.find((i) => itemProductId(i) === productId)?.variant.productFinish.product;
    return p?.cartLimit ?? settings.defaultCartLimit;
  };
  const loose = items.filter((i) => !i.bundleId);
  const totals = productTotals(
    loose.map((i) => ({ productId: itemProductId(i), qty: i.qty })),
    bundles.map((b) => ({
      qty: b.qty,
      items: items.filter((i) => i.bundleId === b.id).map((i) => ({ productId: itemProductId(i), qty: i.qty })),
    })),
  );
  return { settings, items, bundles, loose, totals, limitOf };
}

export function countOf(state: Awaited<ReturnType<typeof cartState>>) {
  const looseQty = state.loose.reduce((n, i) => n + i.qty, 0);
  const bundled = state.bundles.reduce(
    (n, b) => n + b.qty * state.items.filter((i) => i.bundleId === b.id).reduce((m, i) => m + i.qty, 0),
    0,
  );
  return looseQty + bundled;
}

function lineView(i: ItemRow, maxQty: number): CartLineView {
  const pf = i.variant.productFinish;
  const p = pf.product;
  const priced = pricedLine(i);
  const image =
    (i.colourwayId && pf.images.find((img) => img.colourwayId === i.colourwayId)) ||
    pf.images.find((img) => !img.colourwayId) ||
    pf.images[0];
  return {
    id: i.id,
    productId: p.id,
    slug: p.slug,
    name: p.name,
    href: `/products/${p.slug}`,
    category: p.category?.parent?.name ?? p.category?.name ?? "",
    image: image?.media.r2Key ?? null,
    finish: pf.finish.name,
    setSize: i.variant.setSize,
    soldInSets: p.soldInSets,
    colourway: i.colourway
      ? {
          name: i.colourway.name,
          swatches: [...i.colourway.colours]
            .sort((a, b) => a.slot.position - b.slot.position)
            .map((c) => ({ name: c.colour.name, hex: c.colour.hex })),
        }
      : null,
    effects: [...i.effects]
      .sort((a, b) => a.option.slot.position - b.option.slot.position)
      .map((e) => ({ slot: e.option.slot.label, option: e.option.name })),
    qty: i.qty,
    unitPrice: unitPrice(priced),
    lineTotal: lineTotal(priced),
    available: isAvailable(i),
    maxQty: Math.max(maxQty, i.qty),
  };
}

export async function buildCartView(cartId: string | null): Promise<CartView> {
  const state = await cartState(cartId);
  const { settings, items, bundles, loose, totals, limitOf } = state;
  const needsTiers = bundles.some((b) => b.kind === "custom");
  const tiers = needsTiers
    ? await db
        .select({
          itemCount: comboDiscountTiers.itemCount,
          discountType: comboDiscountTiers.discountType,
          discountValue: comboDiscountTiers.discountValue,
        })
        .from(comboDiscountTiers)
    : [];

  const lines = loose.map((i) => {
    const pid = itemProductId(i);
    // This line may grow by what is left of the product's allowance.
    return lineView(i, i.qty + Math.max(0, limitOf(pid) - (totals.get(pid) ?? 0)));
  });

  const bundleResults: BundleResult[] = [];
  const bundleViews: CartBundleView[] = bundles.map((b) => {
    const its = items.filter((i) => i.bundleId === b.id);
    const qtyLines = its.map((i) => ({ productId: itemProductId(i), qty: i.qty }));
    // Allowance left with this bundle taken out.
    const without = new Map(totals);
    for (const l of qtyLines) without.set(l.productId, (without.get(l.productId) ?? 0) - l.qty * b.qty);
    const maxQty = Math.max(b.qty, maxBundleQty(qtyLines, without, limitOf));

    const allAvailable = its.length > 0 && its.every(isAvailable);
    const { discount, notice } =
      b.kind === "combo"
        ? bundleDiscount({ kind: "combo", combo: b.combo })
        : bundleDiscount({
            kind: "custom",
            pieceCount: its.length,
            customCombosEnabled: settings.customCombosEnabled,
            tiers,
          });
    const result = bundleTotal(
      its.map((i) => pricedLine(i)),
      allAvailable ? discount : null,
      b.qty,
    );
    bundleResults.push(result);
    return {
      id: b.id,
      kind: b.kind,
      name: b.kind === "combo" ? (b.combo?.name ?? "Combo") : "Your own combo",
      href: b.kind === "combo" && b.combo?.status === "active" ? `/combos/${b.combo.slug}` : null,
      qty: b.qty,
      maxQty,
      lines: its.map((i) => lineView(i, i.qty)),
      piecesTotal: result.piecesTotal,
      saving: result.saving,
      total: result.total,
      priced: result.priced,
      notice: allAvailable ? notice : "A piece in this combo is no longer available. Remove it, or message us.",
    };
  });

  const t = cartTotals(
    loose.map((i) => pricedLine(i)),
    bundleResults,
    settings,
  );
  return {
    lines,
    bundles: bundleViews,
    count: countOf(state),
    ...t,
    freeShippingFrom: settings.freeShippingFrom,
    quoteLines: lines.filter((l) => l.unitPrice === null).length,
  };
}

/** The visitor's cart, priced now. Reads the request (session / guest cookie). */
export async function readCart(): Promise<CartView> {
  const owner = await currentOwner();
  return buildCartView(owner ? await findCartId(owner) : null);
}

/** Number of items for the header badge. */
export async function readCartCount(): Promise<number> {
  const owner = await currentOwner();
  const cartId = owner ? await findCartId(owner) : null;
  if (!cartId) return 0;
  const rows = await db.query.cartItems.findMany({
    where: (i, { eq }) => eq(i.cartId, cartId),
    columns: { qty: true, bundleId: true },
    with: { bundle: { columns: { qty: true } } },
  });
  return rows.reduce((n, r) => n + r.qty * (r.bundle?.qty ?? 1), 0);
}

/** Product ids on the visitor's wishlist, newest first. */
export async function readWishlistIds(): Promise<string[]> {
  const owner = await currentOwner();
  if (!owner) return [];
  return loadWishlistIds(owner);
}

export async function loadWishlistIds(owner: Owner) {
  const rows = await db
    .select({ productId: wishlistItems.productId, createdAt: wishlistItems.createdAt })
    .from(wishlistItems)
    .where(wishlistOwnerWhere(owner));
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((r) => r.productId);
}

export async function isWishlisted(productId: string) {
  return (await readWishlistIds()).includes(productId);
}
