"use server";
// Admin product actions. Every export is adminAction-wrapped (session check + Zod validation).
// Saving writes the whole product in one transaction: details, tags, finishes, photos, the price
// grid and similar products. Anything a cart or combo points at is deactivated, never deleted.
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db, type Tx } from "@/db";
import {
  cartItems,
  categories,
  colourways,
  comboItems,
  finishes,
  media,
  productFinishes,
  productFinishImages,
  productRelated,
  products,
  productTags,
  productVariants,
  tags,
} from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { deleteOrphanMedia } from "@/lib/admin/media-cleanup";
import { createProductSchema, PRODUCT_STATUSES, priceKey, saveProductSchema } from "@/lib/validation/product";
import { ActionError, adminAction } from "./action";

type Q = Tx | typeof db;

async function assertSlugFree(q: Q, slug: string, exceptId: string | null) {
  const rows = await q
    .select({ id: products.id })
    .from(products)
    .where(exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug))
    .limit(1);
  if (rows.length > 0) throw new ActionError("Another product already uses that slug.");
}

async function assertSubCategory(q: Q, categoryId: string | null) {
  if (!categoryId) return;
  const [c] = await q.select({ parentId: categories.parentId }).from(categories).where(eq(categories.id, categoryId));
  if (!c) throw new ActionError("That category no longer exists.");
  if (!c.parentId) throw new ActionError("Pick a sub-category, not a head category.");
}

/** Product-finish ids that a cart line (through its variants) or a combo default points at. */
async function referencedProductFinishIds(q: Q, pfIds: string[]) {
  if (pfIds.length === 0) return new Set<string>();
  const [fromCarts, fromCombos] = await Promise.all([
    q
      .selectDistinct({ id: productVariants.productFinishId })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .where(inArray(productVariants.productFinishId, pfIds)),
    q
      .selectDistinct({ id: comboItems.defaultProductFinishId })
      .from(comboItems)
      .where(and(isNotNull(comboItems.defaultProductFinishId), inArray(comboItems.defaultProductFinishId, pfIds))),
  ]);
  return new Set<string>([...fromCarts.map((r) => r.id), ...fromCombos.map((r) => r.id as string)]);
}

/** Variant ids that a cart line points at. */
async function referencedVariantIds(q: Q, variantIds: string[]) {
  if (variantIds.length === 0) return new Set<string>();
  const rows = await q
    .selectDistinct({ id: cartItems.variantId })
    .from(cartItems)
    .where(inArray(cartItems.variantId, variantIds));
  return new Set(rows.map((r) => r.id));
}

async function countReferences(q: Q, productId: string) {
  const [carts, combos] = await Promise.all([
    q
      .select({ id: cartItems.id })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(productFinishes, eq(productFinishes.id, productVariants.productFinishId))
      .where(eq(productFinishes.productId, productId))
      .limit(1),
    q.select({ id: comboItems.id }).from(comboItems).where(eq(comboItems.productId, productId)).limit(1),
  ]);
  return { inCarts: carts.length > 0, inCombos: combos.length > 0 };
}

/** Active products need a sub-category and at least one active finish. */
async function assertCanBeActive(q: Q, productId: string) {
  const [p] = await q.select({ categoryId: products.categoryId }).from(products).where(eq(products.id, productId));
  if (!p) throw new ActionError("This product no longer exists.");
  if (!p.categoryId) throw new ActionError("Give the product a sub-category before making it active.");
  const pf = await q
    .select({ id: productFinishes.id })
    .from(productFinishes)
    .where(and(eq(productFinishes.productId, productId), eq(productFinishes.active, true)))
    .limit(1);
  if (pf.length === 0) throw new ActionError("Tick at least one finish before making it active.");
}

// ---------------------------------------------------------------------------------------------

/** Creates a draft with just a name, slug and sub-category; the editor takes it from there. */
export const createProduct = adminAction(createProductSchema, async (input) => {
  await assertSubCategory(db, input.categoryId);
  await assertSlugFree(db, input.slug, null);
  const [row] = await db
    .insert(products)
    .values({ name: input.name, slug: input.slug, categoryId: input.categoryId, status: "draft" })
    .returning({ id: products.id });
  updateTag(TAGS.products);
  return { id: row.id };
});

/** Saves every tab of the editor at once. */
export const saveProduct = adminAction(saveProductSchema, async ({ id, values: v, discardedMediaIds }) => {
  const outcome = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ slug: products.slug, status: products.status })
      .from(products)
      .where(eq(products.id, id))
      .for("update");
    if (!existing) throw new ActionError("This product no longer exists.");

    // ---- Check references the form can't vouch for
    await assertSlugFree(tx, v.slug, id);
    await assertSubCategory(tx, v.categoryId);

    const finishIds = v.finishes.map((f) => f.finishId);
    const existingPfs = await tx.select().from(productFinishes).where(eq(productFinishes.productId, id));
    const pfByFinish = new Map(existingPfs.map((pf) => [pf.finishId, pf]));
    if (finishIds.length > 0) {
      const rows = await tx
        .select({ id: finishes.id, name: finishes.name, active: finishes.active })
        .from(finishes)
        .where(inArray(finishes.id, finishIds));
      if (rows.length !== finishIds.length) throw new ActionError("One of the finishes no longer exists.");
      const off = rows.find((f) => !f.active && !pfByFinish.has(f.id));
      if (off) throw new ActionError(`The ${off.name} finish is switched off, so it can't be added.`);

      const cwRows = await tx
        .select({ id: colourways.id, finishId: colourways.finishId })
        .from(colourways)
        .where(inArray(colourways.finishId, finishIds));
      const cwOk = new Set(cwRows.map((c) => `${c.finishId}:${c.id}`));
      for (const f of v.finishes)
        for (const img of f.images)
          if (img.colourwayId && !cwOk.has(`${f.finishId}:${img.colourwayId}`))
            throw new ActionError("A photo is linked to a colourway from a different finish.");

      const mediaIds = [...new Set(v.finishes.flatMap((f) => f.images.map((i) => i.mediaId)))];
      if (mediaIds.length > 0) {
        const found = await tx.select({ id: media.id }).from(media).where(inArray(media.id, mediaIds));
        if (found.length !== mediaIds.length) throw new ActionError("One of the photos no longer exists. Re-upload it.");
      }
    }
    if (v.tagIds.length > 0) {
      const found = await tx.select({ id: tags.id }).from(tags).where(inArray(tags.id, v.tagIds));
      if (found.length !== v.tagIds.length) throw new ActionError("One of the occasions no longer exists.");
    }
    if (v.relatedIds.includes(id)) throw new ActionError("A product can't be similar to itself.");
    if (v.relatedIds.length > 0) {
      const found = await tx.select({ id: products.id }).from(products).where(inArray(products.id, v.relatedIds));
      if (found.length !== v.relatedIds.length) throw new ActionError("One of the similar products no longer exists.");
    }

    // ---- Details
    await tx
      .update(products)
      .set({
        name: v.name,
        slug: v.slug,
        categoryId: v.categoryId,
        blurb: v.blurb,
        description: v.description,
        sizeText: v.sizeText,
        cartLimit: v.cartLimit,
        soldInSets: v.soldInSets,
        comboEligible: v.comboEligible,
        status: v.status,
        featuredRank: v.featuredRank,
        seoTitle: v.seoTitle,
        seoDescription: v.seoDescription,
      })
      .where(eq(products.id, id));

    // ---- Tags
    await tx.delete(productTags).where(eq(productTags.productId, id));
    if (v.tagIds.length > 0) await tx.insert(productTags).values(v.tagIds.map((tagId) => ({ productId: id, tagId })));

    // ---- Finishes
    let pricesChanged = false;
    const mediaToCheck = new Set<string>();
    const keptPfIds: { pfId: string; finishId: string }[] = [];
    for (const [i, f] of v.finishes.entries()) {
      const ex = pfByFinish.get(f.finishId);
      if (ex) {
        if (!ex.active) pricesChanged = true;
        await tx
          .update(productFinishes)
          .set({ sort: i, isDefault: f.isDefault, active: true })
          .where(eq(productFinishes.id, ex.id));
        keptPfIds.push({ pfId: ex.id, finishId: f.finishId });
      } else {
        const [row] = await tx
          .insert(productFinishes)
          .values({ productId: id, finishId: f.finishId, sort: i, isDefault: f.isDefault, active: true })
          .returning({ id: productFinishes.id });
        keptPfIds.push({ pfId: row.id, finishId: f.finishId });
        pricesChanged = true;
      }
    }

    const removed = existingPfs.filter((pf) => !finishIds.includes(pf.finishId));
    if (removed.length > 0) {
      const inUse = await referencedProductFinishIds(tx, removed.map((r) => r.id));
      const toDelete = removed.filter((r) => !inUse.has(r.id)).map((r) => r.id);
      const toDeactivate = removed.filter((r) => inUse.has(r.id)).map((r) => r.id);
      if (removed.some((r) => r.active)) pricesChanged = true;
      if (toDeactivate.length > 0) {
        await tx
          .update(productFinishes)
          .set({ active: false, isDefault: false })
          .where(inArray(productFinishes.id, toDeactivate));
        await tx
          .update(productVariants)
          .set({ active: false })
          .where(inArray(productVariants.productFinishId, toDeactivate));
      }
      if (toDelete.length > 0) {
        const imgs = await tx
          .select({ mediaId: productFinishImages.mediaId })
          .from(productFinishImages)
          .where(inArray(productFinishImages.productFinishId, toDelete));
        imgs.forEach((i) => mediaToCheck.add(i.mediaId));
        await tx.delete(productFinishes).where(inArray(productFinishes.id, toDelete)); // cascades images + variants
      }
    }

    // ---- Photos (replace the list for every ticked finish)
    if (keptPfIds.length > 0) {
      const pfIds = keptPfIds.map((k) => k.pfId);
      const old = await tx
        .select({ mediaId: productFinishImages.mediaId })
        .from(productFinishImages)
        .where(inArray(productFinishImages.productFinishId, pfIds));
      old.forEach((i) => mediaToCheck.add(i.mediaId));
      await tx.delete(productFinishImages).where(inArray(productFinishImages.productFinishId, pfIds));
      const rows = keptPfIds.flatMap(({ pfId, finishId }) =>
        v.finishes
          .find((f) => f.finishId === finishId)!
          .images.map((img, sort) => ({ productFinishId: pfId, mediaId: img.mediaId, colourwayId: img.colourwayId, sort })),
      );
      if (rows.length > 0) await tx.insert(productFinishImages).values(rows);
      for (const r of rows) mediaToCheck.delete(r.mediaId);
    }

    // ---- Price grid (finish × set size)
    if (keptPfIds.length > 0) {
      const existingVariants = await tx
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productFinishId, keptPfIds.map((k) => k.pfId)));
      const dropped: typeof existingVariants = [];
      for (const { pfId, finishId } of keptPfIds) {
        const mine = existingVariants.filter((x) => x.productFinishId === pfId);
        for (const setSize of v.setSizes) {
          const cell = v.prices[priceKey(finishId, setSize)] ?? { price: null, costPrice: null };
          const ex = mine.find((x) => x.setSize === setSize);
          if (ex) {
            if (ex.price !== cell.price || !ex.active) pricesChanged = true;
            if (ex.price !== cell.price || ex.costPrice !== cell.costPrice || !ex.active)
              await tx
                .update(productVariants)
                .set({ price: cell.price, costPrice: cell.costPrice, active: true })
                .where(eq(productVariants.id, ex.id));
          } else {
            await tx
              .insert(productVariants)
              .values({ productFinishId: pfId, setSize, price: cell.price, costPrice: cell.costPrice, active: true });
            pricesChanged = true;
          }
        }
        dropped.push(...mine.filter((x) => !v.setSizes.includes(x.setSize)));
      }
      if (dropped.length > 0) {
        if (dropped.some((d) => d.active)) pricesChanged = true;
        const inCarts = await referencedVariantIds(tx, dropped.map((d) => d.id));
        const deactivate = dropped.filter((d) => inCarts.has(d.id) && d.active).map((d) => d.id);
        const remove = dropped.filter((d) => !inCarts.has(d.id)).map((d) => d.id);
        if (deactivate.length > 0)
          await tx.update(productVariants).set({ active: false }).where(inArray(productVariants.id, deactivate));
        if (remove.length > 0) await tx.delete(productVariants).where(inArray(productVariants.id, remove));
      }
    }

    // ---- Similar products
    await tx.delete(productRelated).where(eq(productRelated.productId, id));
    if (v.relatedIds.length > 0)
      await tx
        .insert(productRelated)
        .values(v.relatedIds.map((relatedProductId, sort) => ({ productId: id, relatedProductId, sort })));

    return {
      oldSlug: existing.slug,
      pricesChanged,
      // Combos hide themselves when a piece isn't active, so a status change matters to them too.
      statusChanged: existing.status !== v.status,
      mediaToCheck: [...mediaToCheck],
    };
  });

  updateTag(TAGS.products);
  updateTag(TAGS.product(v.slug));
  if (outcome.oldSlug !== v.slug) updateTag(TAGS.product(outcome.oldSlug));
  if (outcome.pricesChanged || outcome.statusChanged) updateTag(TAGS.combos);
  await deleteOrphanMedia([...new Set([...outcome.mediaToCheck, ...discardedMediaIds])]);
  return { slug: v.slug };
});

/** Archive, restore to draft, or publish without opening the editor. */
export const setProductStatus = adminAction(
  z.object({ id: z.uuid(), status: z.enum(PRODUCT_STATUSES) }),
  async ({ id, status }) => {
    if (status === "active") await assertCanBeActive(db, id);
    const [row] = await db
      .update(products)
      .set({ status })
      .where(eq(products.id, id))
      .returning({ slug: products.slug });
    if (!row) throw new ActionError("This product no longer exists.");
    updateTag(TAGS.products);
    updateTag(TAGS.product(row.slug));
    updateTag(TAGS.combos);
    return { status };
  },
);

/** Hard delete: drafts only, and only when no cart line or combo points at the product. */
export const deleteProduct = adminAction(z.object({ id: z.uuid() }), async ({ id }) => {
  const outcome = await db.transaction(async (tx) => {
    const [p] = await tx
      .select({ slug: products.slug, status: products.status })
      .from(products)
      .where(eq(products.id, id))
      .for("update");
    if (!p) throw new ActionError("This product no longer exists.");
    if (p.status !== "draft") throw new ActionError("Only drafts can be deleted. Archive it instead.");
    const refs = await countReferences(tx, id);
    if (refs.inCarts) throw new ActionError("A shopper has this product in their cart. Archive it instead.");
    if (refs.inCombos) throw new ActionError("A combo uses this product. Archive it instead.");
    const imgs = await tx
      .select({ mediaId: productFinishImages.mediaId })
      .from(productFinishImages)
      .innerJoin(productFinishes, eq(productFinishes.id, productFinishImages.productFinishId))
      .where(eq(productFinishes.productId, id));
    await tx.delete(products).where(eq(products.id, id)); // cascades finishes, photos, variants, tags, related, wishlists
    return { slug: p.slug, mediaIds: [...new Set(imgs.map((i) => i.mediaId))] };
  });
  updateTag(TAGS.products);
  updateTag(TAGS.product(outcome.slug));
  await deleteOrphanMedia(outcome.mediaIds);
});

/** Live slug check for the editor and the new-product form. */
export const checkProductSlug = adminAction(
  z.object({ slug: z.string().trim().min(1).max(200), exceptId: z.uuid().nullable() }),
  async ({ slug, exceptId }) => {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug))
      .limit(1);
    return { taken: rows.length > 0 };
  },
);
