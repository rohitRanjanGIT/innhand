"use server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { navLinks, tags } from "@/db/schema";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { assertSlugFree } from "./slug-check";
import { deleteOrphanMedia } from "./media-cleanup";
import { idSchema, tagSchema } from "./schemas/catalogue";

export const saveTag = adminAction(tagSchema, async ({ id, ...values }) => {
  await assertSlugFree("tag", values.slug, id);
  let oldImageId: string | null = null;
  if (id) {
    const current = await db.query.tags.findFirst({ where: eq(tags.id, id), columns: { imageId: true } });
    if (!current) throw new ActionError("That tag no longer exists.");
    oldImageId = current.imageId;
    await db.update(tags).set(values).where(eq(tags.id, id));
  } else {
    await db.insert(tags).values(values);
  }
  if (oldImageId && oldImageId !== values.imageId) await deleteOrphanMedia([oldImageId]);
  changed("tags");
});

/** Removes the tag from its products too. Navigation links must be removed first. */
export const deleteTag = adminAction(idSchema, async ({ id }) => {
  const tag = await db.query.tags.findFirst({ where: eq(tags.id, id), columns: { imageId: true } });
  if (!tag) throw new ActionError("That tag no longer exists.");
  const links = await db.$count(navLinks, and(eq(navLinks.targetType, "tag"), eq(navLinks.targetId, id)));
  if (links > 0) throw new ActionError(`${links} navigation link(s) point here. Remove them in Navigation first.`);
  await db.delete(tags).where(eq(tags.id, id));
  if (tag.imageId) await deleteOrphanMedia([tag.imageId]);
  changed("tags");
});
