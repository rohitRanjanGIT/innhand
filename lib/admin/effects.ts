"use server";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { effectCombinationEffects, effects } from "@/db/schema";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { deleteOrphanMedia } from "./media-cleanup";
import { effectSchema, idSchema, idsSchema } from "./schemas/catalogue";

export const saveEffect = adminAction(effectSchema, async ({ id, ...values }) => {
  let oldImageId: string | null = null;
  if (id) {
    const current = await db.query.effects.findFirst({ where: eq(effects.id, id), columns: { imageId: true } });
    if (!current) throw new ActionError("That effect no longer exists.");
    // Effects carried over from the old slots may have no image yet; once one is set it stays required.
    if (!values.imageId && current.imageId) throw new ActionError("An effect needs an image.");
    oldImageId = current.imageId;
    await db.update(effects).set(values).where(eq(effects.id, id));
  } else {
    if (!values.imageId) throw new ActionError("Add an image for the effect.");
    const [{ top }] = await db.select({ top: max(effects.sort) }).from(effects);
    await db.insert(effects).values({ ...values, sort: (top ?? -1) + 1 });
  }
  if (oldImageId && oldImageId !== values.imageId) await deleteOrphanMedia([oldImageId]);
  changed("effects");
});

export const reorderEffects = adminAction(idsSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(effects).set({ sort: i }).where(eq(effects.id, id));
  });
  changed("effects");
});

/** Hard delete only when no effect combination uses the effect; otherwise it can only be archived. */
export const deleteEffect = adminAction(idSchema, async ({ id }) => {
  const used = await db.$count(effectCombinationEffects, eq(effectCombinationEffects.effectId, id));
  if (used > 0)
    throw new ActionError("Effect combinations use this effect, so it can only be archived (switch Active off).");
  const [row] = await db.delete(effects).where(eq(effects.id, id)).returning({ imageId: effects.imageId });
  if (row?.imageId) await deleteOrphanMedia([row.imageId]);
  changed("effects");
});
