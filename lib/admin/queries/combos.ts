import "server-only";
// Admin reads for the combo screens. Every export starts with requireAdmin(); the *Inner functions
// are the plain reads (used by tests).
import { and, asc, count, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  cartBundles,
  comboDiscountTiers,
  comboImages,
  comboItems,
  combos,
  finishEffectOptions,
  finishEffectSlots,
  finishes,
  media,
  productFinishes,
  products,
  productVariants,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { readSettingsUncached } from "@/lib/data/settings";
import { adminComboPricing, type AdminComboProduct } from "@/components/admin/combos/pricing";

export async function loadComboProductsInner(extraIds: string[] = []): Promise<AdminComboProduct[]> {
  const prodRows = await db
    .select({ id: products.id, name: products.name, status: products.status })
    .from(products)
    .where(extraIds.length ? or(eq(products.status, "active"), inArray(products.id, extraIds)) : eq(products.status, "active"))
    .orderBy(asc(products.name));
  const ids = prodRows.map((p) => p.id);
  if (ids.length === 0) return [];

  const pfRows = await db
    .select({
      id: productFinishes.id,
      productId: productFinishes.productId,
      isDefault: productFinishes.isDefault,
      pfActive: productFinishes.active,
      finishActive: finishes.active,
      finishId: finishes.id,
      name: finishes.name,
    })
    .from(productFinishes)
    .innerJoin(finishes, eq(finishes.id, productFinishes.finishId))
    .where(inArray(productFinishes.productId, ids))
    .orderBy(asc(productFinishes.sort), asc(finishes.sort));
  const pfIds = pfRows.map((r) => r.id);
  const finishIds = [...new Set(pfRows.map((r) => r.finishId))];

  const [variantRows, requiredRows] = await Promise.all([
    pfIds.length
      ? db
          .select({
            productFinishId: productVariants.productFinishId,
            setSize: productVariants.setSize,
            price: productVariants.price,
            active: productVariants.active,
          })
          .from(productVariants)
          .where(inArray(productVariants.productFinishId, pfIds))
          .orderBy(asc(productVariants.setSize))
      : [],
    finishIds.length
      ? db
          .select({
            finishId: finishEffectSlots.finishId,
            slotId: finishEffectSlots.id,
            extraPrice: finishEffectOptions.extraPrice,
          })
          .from(finishEffectSlots)
          .innerJoin(finishEffectOptions, eq(finishEffectOptions.slotId, finishEffectSlots.id))
          .where(
            and(
              inArray(finishEffectSlots.finishId, finishIds),
              eq(finishEffectSlots.required, true),
              eq(finishEffectOptions.active, true),
            ),
          )
          .orderBy(asc(finishEffectOptions.sort), asc(finishEffectOptions.name))
      : [],
  ]);

  // A required slot starts on its first option (same rule as the storefront configurator).
  const defaultExtraByFinish = new Map<string, number>();
  const seenSlots = new Set<string>();
  for (const r of requiredRows) {
    if (seenSlots.has(r.slotId)) continue;
    seenSlots.add(r.slotId);
    defaultExtraByFinish.set(r.finishId, (defaultExtraByFinish.get(r.finishId) ?? 0) + r.extraPrice);
  }

  return prodRows.map((p) => ({
    ...p,
    finishes: pfRows
      .filter((pf) => pf.productId === p.id)
      .map((pf) => ({
        productFinishId: pf.id,
        name: pf.name,
        isDefault: pf.isDefault,
        active: pf.pfActive && pf.finishActive,
        defaultExtra: defaultExtraByFinish.get(pf.finishId) ?? 0,
        variants: variantRows
          .filter((v) => v.productFinishId === pf.id)
          .map(({ setSize, price, active }) => ({ setSize, price, active })),
      })),
  }));
}

export async function listCombosInner() {
  const [rows, itemRows, imageRows] = await Promise.all([
    db
      .select({
        id: combos.id,
        slug: combos.slug,
        name: combos.name,
        status: combos.status,
        sort: combos.sort,
        discountType: combos.discountType,
        discountValue: combos.discountValue,
      })
      .from(combos)
      .orderBy(asc(combos.sort), asc(combos.name)),
    db
      .select({
        comboId: comboItems.comboId,
        productId: comboItems.productId,
        productFinishId: comboItems.defaultProductFinishId,
        setSize: comboItems.defaultSetSize,
      })
      .from(comboItems)
      .orderBy(asc(comboItems.sort), asc(comboItems.createdAt)),
    db
      .select({ comboId: comboImages.comboId, key: media.r2Key, sort: comboImages.sort })
      .from(comboImages)
      .innerJoin(media, eq(media.id, comboImages.mediaId))
      .orderBy(asc(comboImages.sort)),
  ]);
  const prods = await loadComboProductsInner([...new Set(itemRows.map((i) => i.productId))]);
  const byId = new Map(prods.map((p) => [p.id, p]));
  return rows.map((c) => {
    const items = itemRows.filter((i) => i.comboId === c.id);
    const pricing = adminComboPricing(items, byId, { type: c.discountType, value: c.discountValue });
    return {
      ...c,
      image: imageRows.find((i) => i.comboId === c.id)?.key ?? null,
      pieceNames: items.map((i) => byId.get(i.productId)?.name ?? "Unknown product"),
      ...pricing,
    };
  });
}

export async function getComboInner(id: string) {
  const combo = await db
    .select({
      id: combos.id,
      slug: combos.slug,
      name: combos.name,
      description: combos.description,
      status: combos.status,
      sort: combos.sort,
      discountType: combos.discountType,
      discountValue: combos.discountValue,
    })
    .from(combos)
    .where(eq(combos.id, id))
    .limit(1);
  if (!combo[0]) return null;
  const [items, images] = await Promise.all([
    db
      .select({
        productId: comboItems.productId,
        productFinishId: comboItems.defaultProductFinishId,
        setSize: comboItems.defaultSetSize,
      })
      .from(comboItems)
      .where(eq(comboItems.comboId, id))
      .orderBy(asc(comboItems.sort), asc(comboItems.createdAt)),
    db
      .select({ id: media.id, key: media.r2Key, width: media.width, height: media.height, alt: media.alt })
      .from(comboImages)
      .innerJoin(media, eq(media.id, comboImages.mediaId))
      .where(eq(comboImages.comboId, id))
      .orderBy(asc(comboImages.sort)),
  ]);
  return { ...combo[0], items, images };
}

export async function getCustomComboSettingsInner() {
  const [settings, tiers] = await Promise.all([
    readSettingsUncached(),
    db
      .select({
        itemCount: comboDiscountTiers.itemCount,
        discountType: comboDiscountTiers.discountType,
        discountValue: comboDiscountTiers.discountValue,
      })
      .from(comboDiscountTiers)
      .orderBy(asc(comboDiscountTiers.itemCount)),
  ]);
  // Always three rows (2, 3, 4), even before they have been saved.
  const full = [2, 3, 4].map(
    (n) => tiers.find((t) => t.itemCount === n) ?? { itemCount: n, discountType: "percent" as const, discountValue: 0 },
  );
  return { enabled: settings.customCombosEnabled, tiers: full };
}

/** How many cart bundles point at this combo (a combo in carts can be archived, not deleted). */
export async function comboCartUseInner(id: string) {
  const [r] = await db.select({ n: count() }).from(cartBundles).where(eq(cartBundles.comboId, id));
  return r?.n ?? 0;
}

// --- Guarded exports --------------------------------------------------------------------------

export async function listCombosAdmin() {
  await requireAdmin();
  return listCombosInner();
}

export async function getComboAdmin(id: string) {
  await requireAdmin();
  return getComboInner(id);
}

export async function getComboProductsAdmin(extraIds: string[] = []) {
  await requireAdmin();
  return loadComboProductsInner(extraIds);
}

export async function getCustomComboSettingsAdmin() {
  await requireAdmin();
  return getCustomComboSettingsInner();
}
