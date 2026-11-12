"use server";
import { and, eq, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { categories, navLinks, products } from "@/db/schema";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { assertSlugFree } from "./slug-check";
import { deleteOrphanMedia } from "./media-cleanup";
import { categoryReorderSchema, categorySchema, idSchema } from "./schemas/catalogue";

export const saveCategory = adminAction(categorySchema, async ({ id, ...values }) => {
  await assertSlugFree("category", values.slug, id);
  if (values.parentId) {
    const parent = await db.query.categories.findFirst({
      where: eq(categories.id, values.parentId),
      columns: { id: true, parentId: true },
    });
    if (!parent) throw new ActionError("The head category no longer exists.");
    if (parent.parentId) throw new ActionError("Categories have two levels only: pick a head category as the parent.");
    if (parent.id === id) throw new ActionError("A category can't be its own parent.");
  }

  let oldImageId: string | null = null;
  if (id) {
    const current = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      columns: { parentId: true, imageId: true },
    });
    if (!current) throw new ActionError("That category no longer exists.");
    if (!current.parentId && values.parentId) {
      const kids = await db.$count(categories, eq(categories.parentId, id));
      if (kids > 0) throw new ActionError("This head category has sub-categories, so it can't become a sub-category.");
    }
    oldImageId = current.imageId;
    const moved = (current.parentId ?? null) !== values.parentId;
    const sort = moved ? await nextSort(values.parentId) : undefined;
    await db
      .update(categories)
      .set({ ...values, ...(sort === undefined ? {} : { sort }) })
      .where(eq(categories.id, id));
  } else {
    await db.insert(categories).values({ ...values, sort: await nextSort(values.parentId) });
  }

  if (oldImageId && oldImageId !== values.imageId) await deleteOrphanMedia([oldImageId]);
  changed("categories");
});

async function nextSort(parentId: string | null) {
  const [{ top }] = await db
    .select({ top: max(categories.sort) })
    .from(categories)
    .where(parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId));
  return (top ?? -1) + 1;
}

/** Reorders the categories of one level (the head list, or one head's sub-categories). */
export const reorderCategories = adminAction(categoryReorderSchema, async ({ parentId, ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(categories)
        .set({ sort: i })
        .where(and(eq(categories.id, id), parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId)));
  });
  changed("categories");
});

/**
 * A head category with sub-categories can't be deleted. A category with products can only be
 * deactivated. Links in the navigation must be removed first.
 */
export const deleteCategory = adminAction(idSchema, async ({ id }) => {
  const cat = await db.query.categories.findFirst({ where: eq(categories.id, id), columns: { imageId: true } });
  if (!cat) throw new ActionError("That category no longer exists.");
  const [kids, productCount, links] = await Promise.all([
    db.$count(categories, eq(categories.parentId, id)),
    db.$count(products, eq(products.categoryId, id)),
    db.$count(navLinks, and(eq(navLinks.targetType, "category"), eq(navLinks.targetId, id))),
  ]);
  if (kids > 0) throw new ActionError("Move or delete its sub-categories first.");
  if (productCount > 0)
    throw new ActionError(`${productCount} product(s) are in this category, so it can only be deactivated.`);
  if (links > 0) throw new ActionError(`${links} navigation link(s) point here. Remove them in Navigation first.`);
  await db.delete(categories).where(eq(categories.id, id));
  if (cat.imageId) await deleteOrphanMedia([cat.imageId]);
  changed("categories");
});
