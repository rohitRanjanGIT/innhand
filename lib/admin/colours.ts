"use server";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { colours, colourwayColours } from "@/db/schema";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { colourSchema, idSchema, idsSchema } from "./schemas/catalogue";

export const saveColour = adminAction(colourSchema, async ({ id, ...values }) => {
  if (id) {
    const [row] = await db.update(colours).set(values).where(eq(colours.id, id)).returning({ id: colours.id });
    if (!row) throw new ActionError("That colour no longer exists.");
  } else {
    const [{ top }] = await db.select({ top: max(colours.sort) }).from(colours);
    await db.insert(colours).values({ ...values, sort: (top ?? -1) + 1 });
  }
  changed("colours");
});

export const reorderColours = adminAction(idsSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(colours).set({ sort: i }).where(eq(colours.id, id));
  });
  changed("colours");
});

/** Hard delete only when no colourway uses the colour; otherwise it can only be archived. */
export const deleteColour = adminAction(idSchema, async ({ id }) => {
  const used = await db.$count(colourwayColours, eq(colourwayColours.colourId, id));
  if (used > 0) throw new ActionError("Colourways use this colour, so it can only be archived (switch Active off).");
  await db.delete(colours).where(eq(colours.id, id));
  changed("colours");
});
