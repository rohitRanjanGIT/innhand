"use server";
import { and, eq, inArray, max, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  cartItems,
  colours,
  colourwayColours,
  colourways,
  effects,
  finishColourSlots,
  effectCombinationEffects,
  effectCombinations,
  finishEffectSlots,
  finishes,
  productFinishImages,
  productFinishes,
  storeSettings,
} from "@/db/schema";
import { readSettingsUncached } from "@/lib/data/settings";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { assertSlugFree } from "./slug-check";
import {
  colourwaySchema,
  effectCombinationSchema,
  finishCreateSchema,
  finishSaveSchema,
  idSchema,
  idsSchema,
  reorderInSchema,
} from "./schemas/catalogue";

export const createFinish = adminAction(finishCreateSchema, async ({ name, slug }) => {
  await assertSlugFree("finish", slug);
  const id = await db.transaction(async (tx) => {
    const [{ top }] = await tx.select({ top: max(finishes.sort) }).from(finishes);
    const [row] = await tx
      .insert(finishes)
      .values({ name, slug, sort: (top ?? -1) + 1 })
      .returning({ id: finishes.id });
    await tx.insert(finishColourSlots).values({ finishId: row.id, position: 0, label: "Base colour" });
    return row.id;
  });
  changed("finishes");
  return { id };
});

export const reorderFinishes = adminAction(idsSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(finishes).set({ sort: i }).where(eq(finishes.id, id));
  });
  changed("finishes");
});

/** Hard delete only when no product offers the finish; otherwise it can only be archived. */
export const deleteFinish = adminAction(idSchema, async ({ id }) => {
  const used = await db.$count(productFinishes, eq(productFinishes.finishId, id));
  if (used > 0)
    throw new ActionError(`${used} product(s) offer this finish, so it can only be archived (switch Active off).`);
  await db.delete(finishes).where(eq(finishes.id, id));
  changed("finishes");
});

/**
 * Saves the finish editor in one transaction: details, colour slots (position 0 is the base and is
 * never removed) and the named effect slots. Removing an effect slot removes its effect from every
 * effect combination of this finish, the same as colour slots and colourways.
 */
export const saveFinish = adminAction(finishSaveSchema, async (input) => {
  await readSettingsUncached(); // makes sure the settings row exists
  await assertSlugFree("finish", input.slug, input.id);
  await db.transaction(async (tx) => {
    // Lock the settings row so SCC/SEC can't be lowered while this save runs.
    const [settings] = await tx
      .select({ scc: storeSettings.secondaryColourCount, sec: storeSettings.effectCount })
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .for("update");
    const secondary = input.colourSlots.length - 1;
    if (secondary > settings.scc)
      throw new ActionError(`A finish can have at most ${settings.scc} secondary colour(s) (Settings → SCC).`);
    if (input.effectSlots.length > settings.sec)
      throw new ActionError(`A finish can have at most ${settings.sec} effect slot(s) (Settings → SEC).`);

    const [updated] = await tx
      .update(finishes)
      .set({ name: input.name, slug: input.slug, description: input.description, active: input.active })
      .where(eq(finishes.id, input.id))
      .returning({ id: finishes.id });
    if (!updated) throw new ActionError("That finish no longer exists.");

    await saveColourSlots(tx, input.id, input.colourSlots);
    await saveEffectSlots(tx, input.id, input.effectSlots);
  });
  changed("finishes");
});

type SlotIn = { id?: string; label: string };

async function saveColourSlots(tx: Tx, finishId: string, slots: SlotIn[]) {
  const existing = await tx
    .select({ id: finishColourSlots.id, position: finishColourSlots.position })
    .from(finishColourSlots)
    .where(eq(finishColourSlots.finishId, finishId));
  const base = existing.find((s) => s.position === 0);
  const [baseIn, ...secondaryIn] = slots;

  if (base) await tx.update(finishColourSlots).set({ label: baseIn.label }).where(eq(finishColourSlots.id, base.id));
  else await tx.insert(finishColourSlots).values({ finishId, position: 0, label: baseIn.label });

  const known = new Set(existing.filter((s) => s.position > 0).map((s) => s.id));
  for (const s of secondaryIn) if (s.id && !known.has(s.id)) throw new ActionError("A colour slot doesn't belong to this finish. Reload and try again.");
  const kept = new Set(secondaryIn.flatMap((s) => (s.id ? [s.id] : [])));
  const removed = [...known].filter((id) => !kept.has(id));
  // Deleting a slot also deletes the colourways' colour for it (cascade).
  if (removed.length) await tx.delete(finishColourSlots).where(inArray(finishColourSlots.id, removed));

  // Move kept slots out of the way first: (finish_id, position) is unique.
  for (const [i, id] of [...kept].entries())
    await tx.update(finishColourSlots).set({ position: -1 - i }).where(eq(finishColourSlots.id, id));
  for (const [i, s] of secondaryIn.entries()) {
    const position = i + 1;
    if (s.id) await tx.update(finishColourSlots).set({ position, label: s.label }).where(eq(finishColourSlots.id, s.id));
    else await tx.insert(finishColourSlots).values({ finishId, position, label: s.label });
  }
}

async function saveEffectSlots(tx: Tx, finishId: string, slots: SlotIn[]) {
  const existing = await tx
    .select({ id: finishEffectSlots.id })
    .from(finishEffectSlots)
    .where(eq(finishEffectSlots.finishId, finishId));
  const known = new Set(existing.map((s) => s.id));
  for (const s of slots)
    if (s.id && !known.has(s.id)) throw new ActionError("An effect slot doesn't belong to this finish. Reload and try again.");
  const kept = new Set(slots.flatMap((s) => (s.id ? [s.id] : [])));
  const removed = [...known].filter((id) => !kept.has(id));
  // Deleting a slot also deletes the combinations' effect for it (cascade).
  if (removed.length) await tx.delete(finishEffectSlots).where(inArray(finishEffectSlots.id, removed));

  // Move kept slots out of the way first: (finish_id, position) is unique.
  for (const [i, id] of [...kept].entries())
    await tx.update(finishEffectSlots).set({ position: -1 - i }).where(eq(finishEffectSlots.id, id));
  for (const [position, s] of slots.entries()) {
    if (s.id) await tx.update(finishEffectSlots).set({ position, label: s.label }).where(eq(finishEffectSlots.id, s.id));
    else await tx.insert(finishEffectSlots).values({ finishId, position, label: s.label });
  }
}

// ---------- Effect combinations (like colourways) ----------

export const saveEffectCombination = adminAction(effectCombinationSchema, async (input) => {
  const slots = await db
    .select({ id: finishEffectSlots.id })
    .from(finishEffectSlots)
    .where(eq(finishEffectSlots.finishId, input.finishId));
  if (slots.length === 0) throw new ActionError("Add an effect slot to the finish first.");
  const picked = new Map(input.effects.map((e) => [e.slotId, e.effectId]));
  if (picked.size !== input.effects.length || picked.size !== slots.length || slots.some((s) => !picked.has(s.id)))
    throw new ActionError("Pick one effect for every slot.");
  const effectIds = [...new Set(picked.values())];
  const found = await db
    .select({ id: effects.id, active: effects.active })
    .from(effects)
    .where(inArray(effects.id, effectIds));
  if (found.length !== effectIds.length) throw new ActionError("A picked effect no longer exists.");

  await db.transaction(async (tx) => {
    let id = input.id;
    const values = {
      name: input.name,
      sellingPrice: input.sellingPrice,
      costPrice: input.costPrice,
      active: input.active,
    };
    if (id) {
      const before = await tx
        .select({ effectId: effectCombinationEffects.effectId })
        .from(effectCombinationEffects)
        .where(eq(effectCombinationEffects.combinationId, id));
      const had = new Set(before.map((r) => r.effectId));
      // Archived effects stay only where they were already used.
      if (found.some((e) => !e.active && !had.has(e.id))) throw new ActionError("A picked effect is archived in the library.");
      const [row] = await tx
        .update(effectCombinations)
        .set(values)
        .where(and(eq(effectCombinations.id, id), eq(effectCombinations.finishId, input.finishId)))
        .returning({ id: effectCombinations.id });
      if (!row) throw new ActionError("That effect combination no longer exists.");
      await tx.delete(effectCombinationEffects).where(eq(effectCombinationEffects.combinationId, id));
    } else {
      if (found.some((e) => !e.active)) throw new ActionError("A picked effect is archived in the library.");
      const [{ top }] = await tx
        .select({ top: max(effectCombinations.sort) })
        .from(effectCombinations)
        .where(eq(effectCombinations.finishId, input.finishId));
      const [row] = await tx
        .insert(effectCombinations)
        .values({ ...values, finishId: input.finishId, sort: (top ?? -1) + 1 })
        .returning({ id: effectCombinations.id });
      id = row.id;
    }
    await tx.insert(effectCombinationEffects).values(input.effects.map((e) => ({ combinationId: id, ...e })));
  });
  changed("finishes");
});

export const reorderEffectCombinations = adminAction(reorderInSchema, async ({ parentId, ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(effectCombinations)
        .set({ sort: i })
        .where(and(eq(effectCombinations.id, id), eq(effectCombinations.finishId, parentId)));
  });
  changed("finishes");
});

/** Hard delete only when no cart line holds the combination. */
export const deleteEffectCombination = adminAction(idSchema, async ({ id }) => {
  const used = await db.$count(cartItems, eq(cartItems.effectCombinationId, id));
  if (used > 0) throw new ActionError("Carts hold this effect combination, so it can only be archived (switch Active off).");
  await db.delete(effectCombinations).where(eq(effectCombinations.id, id));
  changed("finishes");
});

export const setEffectCombinationActive = adminAction(
  idSchema.extend({ active: finishSaveSchema.shape.active }),
  async ({ id, active }) => {
    await db.update(effectCombinations).set({ active }).where(eq(effectCombinations.id, id));
    changed("finishes");
  },
);

// ---------- Colourways ----------

export const saveColourway = adminAction(colourwaySchema, async (input) => {
  const slots = await db
    .select({ id: finishColourSlots.id })
    .from(finishColourSlots)
    .where(eq(finishColourSlots.finishId, input.finishId));
  if (slots.length === 0) throw new ActionError("That finish no longer exists.");
  const picked = new Map(input.colours.map((c) => [c.slotId, c.colourId]));
  if (picked.size !== input.colours.length || slots.some((s) => !picked.has(s.id)) || picked.size !== slots.length)
    throw new ActionError("Pick one colour for every slot.");
  const colourIds = [...new Set(picked.values())];
  const found = await db.$count(colours, inArray(colours.id, colourIds));
  if (found !== colourIds.length) throw new ActionError("A picked colour no longer exists.");

  await db.transaction(async (tx) => {
    let id = input.id;
    if (id) {
      const [row] = await tx
        .update(colourways)
        .set({ name: input.name, active: input.active })
        .where(and(eq(colourways.id, id), eq(colourways.finishId, input.finishId)))
        .returning({ id: colourways.id });
      if (!row) throw new ActionError("That colourway no longer exists.");
      await tx.delete(colourwayColours).where(eq(colourwayColours.colourwayId, id));
    } else {
      const [{ top }] = await tx
        .select({ top: max(colourways.sort) })
        .from(colourways)
        .where(eq(colourways.finishId, input.finishId));
      const [row] = await tx
        .insert(colourways)
        .values({ finishId: input.finishId, name: input.name, active: input.active, sort: (top ?? -1) + 1 })
        .returning({ id: colourways.id });
      id = row.id;
    }
    await tx.insert(colourwayColours).values(input.colours.map((c) => ({ colourwayId: id, ...c })));
  });
  changed("finishes");
});

export const reorderColourways = adminAction(reorderInSchema, async ({ parentId, ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(colourways)
        .set({ sort: i })
        .where(and(eq(colourways.id, id), eq(colourways.finishId, parentId)));
  });
  changed("finishes");
});

/** Hard delete only when no cart line or product photo points at the colourway. */
export const deleteColourway = adminAction(idSchema, async ({ id }) => {
  const res = await db.execute<{ n: number }>(sql`select (
      (select count(*) from ${cartItems} where ${cartItems.colourwayId} = ${id}) +
      (select count(*) from ${productFinishImages} where ${productFinishImages.colourwayId} = ${id}))::int as n`);
  if ((res.rows[0]?.n ?? 0) > 0)
    throw new ActionError("Carts or product photos use this colourway, so it can only be archived (switch Active off).");
  await db.delete(colourways).where(eq(colourways.id, id));
  changed("finishes");
});

/** Archive / restore a colourway without opening the editor. */
export const setColourwayActive = adminAction(
  idSchema.extend({ active: finishSaveSchema.shape.active }),
  async ({ id, active }) => {
    await db.update(colourways).set({ active }).where(eq(colourways.id, id));
    changed("finishes");
  },
);

