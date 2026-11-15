import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cartItems,
  colours,
  colourwayColours,
  colourways,
  effects,
  finishColourSlots,
  effectCombinations,
  finishEffectSlots,
  finishes,
  media,
  productFinishImages,
  productFinishes,
} from "@/db/schema";
import { readSettingsUncached } from "@/lib/data/settings";
import { imageUrl } from "@/lib/images";
import { requireAdmin } from "@/lib/session";

/** The palette, in the admin's order, with how many colourways use each colour. */
export async function listColours() {
  await requireAdmin();
  return db
    .select({
      id: colours.id,
      name: colours.name,
      hex: colours.hex,
      active: colours.active,
      usedBy: sql<number>`(select count(distinct cc.colourway_id)::int from colourway_colours cc where cc.colour_id = "colours"."id")`,
    })
    .from(colours)
    .orderBy(asc(colours.sort), asc(colours.name));
}
export type AdminColour = Awaited<ReturnType<typeof listColours>>[number];

/** The effects library, in the admin's order, with how many finishes offer each effect. */
export async function listEffects() {
  await requireAdmin();
  const rows = await db
    .select({
      id: effects.id,
      name: effects.name,
      imageId: effects.imageId,
      imageKey: media.r2Key,
      active: effects.active,
      /** Finishes with an effect combination that uses this effect. */
      usedBy: sql<number>`(select count(distinct ec.finish_id)::int from effect_combination_effects ece
        join effect_combinations ec on ec.id = ece.combination_id where ece.effect_id = "effects"."id")`,
    })
    .from(effects)
    .leftJoin(media, eq(media.id, effects.imageId))
    .orderBy(asc(effects.sort), asc(effects.name));
  return rows.map(({ imageKey, ...r }) => ({ ...r, imageUrl: imageKey ? imageUrl(imageKey, "thumb") : null }));
}
export type AdminEffect = Awaited<ReturnType<typeof listEffects>>[number];

export async function listFinishes() {
  await requireAdmin();
  const [rows, settings] = await Promise.all([
    db
      .select({
        id: finishes.id,
        name: finishes.name,
        slug: finishes.slug,
        active: finishes.active,
        secondarySlots: sql<number>`(select count(*)::int from finish_colour_slots s where s.finish_id = "finishes"."id" and s.position > 0)`,
        effectSlots: sql<number>`(select count(*)::int from finish_effect_slots s where s.finish_id = "finishes"."id")`,
        colourways: sql<number>`(select count(*)::int from colourways c where c.finish_id = "finishes"."id")`,
        products: sql<number>`(select count(*)::int from product_finishes pf where pf.finish_id = "finishes"."id")`,
      })
      .from(finishes)
      .orderBy(asc(finishes.sort), asc(finishes.name)),
    readSettingsUncached(),
  ]);
  return { finishes: rows, scc: settings.secondaryColourCount, sec: settings.effectCount };
}
export type AdminFinishRow = Awaited<ReturnType<typeof listFinishes>>["finishes"][number];

/** Everything the finish editor needs, or null when the id doesn't exist. */
export async function getFinishEditor(id: string) {
  await requireAdmin();
  const finish = await db.query.finishes.findFirst({
    where: eq(finishes.id, id),
    with: {
      colourSlots: { orderBy: asc(finishColourSlots.position) },
      effectSlots: { orderBy: asc(finishEffectSlots.position) },
      effectCombinations: {
        orderBy: [asc(effectCombinations.sort), asc(effectCombinations.name)],
        with: { effects: true },
      },
      colourways: {
        orderBy: [asc(colourways.sort), asc(colourways.name)],
        with: { colours: true },
      },
    },
  });
  if (!finish) return null;

  const comboIds = finish.effectCombinations.map((c) => c.id);
  const cwIds = finish.colourways.map((c) => c.id);
  const [settings, palette, library, usedEffects, usedColourways, productCount] = await Promise.all([
    readSettingsUncached(),
    db
      .select({ id: colours.id, name: colours.name, hex: colours.hex, active: colours.active })
      .from(colours)
      .orderBy(asc(colours.sort), asc(colours.name)),
    db
      .select({ id: effects.id, name: effects.name, active: effects.active, imageKey: media.r2Key })
      .from(effects)
      .leftJoin(media, eq(media.id, effects.imageId))
      .orderBy(asc(effects.sort), asc(effects.name)),
    comboIds.length
      ? db
          .selectDistinct({ id: cartItems.effectCombinationId })
          .from(cartItems)
          .where(inArray(cartItems.effectCombinationId, comboIds))
      : Promise.resolve([]),
    cwIds.length
      ? db.execute<{ id: string }>(sql`
          select ${cartItems.colourwayId} as id from ${cartItems} where ${inArray(cartItems.colourwayId, cwIds)}
          union
          select ${productFinishImages.colourwayId} from ${productFinishImages} where ${inArray(productFinishImages.colourwayId, cwIds)}`)
      : Promise.resolve({ rows: [] as { id: string }[] }),
    db.$count(productFinishes, eq(productFinishes.finishId, id)),
  ]);
  const inCarts = new Set(usedEffects.map((r) => r.id));
  const usedCw = new Set(usedColourways.rows.map((r) => r.id));

  return {
    scc: settings.secondaryColourCount,
    sec: settings.effectCount,
    palette,
    /** Every library effect, so the editor can offer the ones not on this finish yet. */
    library: library.map(({ imageKey, ...e }) => ({ ...e, imageUrl: imageKey ? imageUrl(imageKey, "thumb") : null })),
    productCount,
    finish: {
      id: finish.id,
      name: finish.name,
      slug: finish.slug,
      description: finish.description,
      active: finish.active,
      colourSlots: finish.colourSlots.map((s) => ({ id: s.id, position: s.position, label: s.label })),
      effectSlots: finish.effectSlots.map((s) => ({ id: s.id, position: s.position, label: s.label })),
    },
    effectCombinations: finish.effectCombinations.map((c) => ({
      id: c.id,
      name: c.name,
      sellingPrice: c.sellingPrice,
      costPrice: c.costPrice,
      active: c.active,
      inUse: inCarts.has(c.id),
      /** Effect slot id → library effect id. */
      effects: Object.fromEntries(c.effects.map((e) => [e.slotId, e.effectId])) as Record<string, string>,
    })),
    colourways: finish.colourways.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      inUse: usedCw.has(c.id),
      colours: Object.fromEntries(c.colours.map((cc) => [cc.slotId, cc.colourId])) as Record<string, string>,
    })),
  };
}
export type FinishEditorData = NonNullable<Awaited<ReturnType<typeof getFinishEditor>>>;
