"use server";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { navLinks, productTags, products, tags } from "@/db/schema";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { assertSlugFree } from "./slug-check";
import { deleteOrphanMedia } from "./media-cleanup";
import { idSchema, tagProductSchema, tagReorderSchema, tagSchema } from "./schemas/catalogue";

// Occasions are stored in the `tags` table.

export const saveTag = adminAction(tagSchema, async ({ id, ...values }) => {
  await assertSlugFree("tag", values.slug, id);
  let oldImageId: string | null = null;
  if (id) {
    const current = await db.query.tags.findFirst({ where: eq(tags.id, id), columns: { imageId: true } });
    if (!current) throw new ActionError("That occasion no longer exists.");
    oldImageId = current.imageId;
    await db.update(tags).set(values).where(eq(tags.id, id));
  } else {
    const [{ top }] = await db.select({ top: max(tags.sort) }).from(tags);
    await db.insert(tags).values({ ...values, sort: (top ?? -1) + 1 });
  }
  if (oldImageId && oldImageId !== values.imageId) await deleteOrphanMedia([oldImageId]);
  changed("tags");
});

export const reorderTags = adminAction(tagReorderSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(tags).set({ sort: i }).where(eq(tags.id, id));
  });
  changed("tags");
});

export const addTagProduct = adminAction(tagProductSchema, async ({ id, productId }) => {
  const [tag, product] = await Promise.all([
    db.query.tags.findFirst({ where: eq(tags.id, id), columns: { id: true } }),
    db.query.products.findFirst({ where: eq(products.id, productId), columns: { id: true } }),
  ]);
  if (!tag) throw new ActionError("That occasion no longer exists.");
  if (!product) throw new ActionError("That product no longer exists.");
  await db.insert(productTags).values({ productId, tagId: id }).onConflictDoNothing();
  changed("tags");
});

export const removeTagProduct = adminAction(tagProductSchema, async ({ id, productId }) => {
  await db.delete(productTags).where(and(eq(productTags.tagId, id), eq(productTags.productId, productId)));
  changed("tags");
});

/**
 * An occasion with products can only be deactivated. Links in the navigation must be removed first.
 */
export const deleteTag = adminAction(idSchema, async ({ id }) => {
  const tag = await db.query.tags.findFirst({ where: eq(tags.id, id), columns: { imageId: true } });
  if (!tag) throw new ActionError("That occasion no longer exists.");
  const [productCount, links] = await Promise.all([
    db.$count(productTags, eq(productTags.tagId, id)),
    db.$count(navLinks, and(eq(navLinks.targetType, "tag"), eq(navLinks.targetId, id))),
  ]);
  if (productCount > 0)
    throw new ActionError(`${productCount} product(s) are in this occasion, so it can only be deactivated.`);
  if (links > 0) throw new ActionError(`${links} navigation link(s) point here. Remove them in Navigation first.`);
  await db.delete(tags).where(eq(tags.id, id));
  if (tag.imageId) await deleteOrphanMedia([tag.imageId]);
  changed("tags");
});
