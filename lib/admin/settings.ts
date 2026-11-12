"use server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { finishColourSlots, finishEffectSlots, finishes, storeSettings } from "@/db/schema";
import { readSettingsUncached } from "@/lib/data/settings";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { settingsSchema } from "./schemas/catalogue";

export const saveSettings = adminAction(settingsSchema, async (input) => {
  await readSettingsUncached(); // makes sure the single row exists

  // Lowering SCC or SEC below what a finish already uses is refused, naming the finishes in the way.
  const [tooManyColours, tooManyEffects] = await Promise.all([
    db
      .select({ name: finishes.name, n: sql<number>`count(*)::int` })
      .from(finishColourSlots)
      .innerJoin(finishes, eq(finishes.id, finishColourSlots.finishId))
      .where(sql`${finishColourSlots.position} > 0`)
      .groupBy(finishes.id, finishes.name)
      .having(sql`count(*) > ${input.secondaryColourCount}`),
    db
      .select({ name: finishes.name, n: sql<number>`count(*)::int` })
      .from(finishEffectSlots)
      .innerJoin(finishes, eq(finishes.id, finishEffectSlots.finishId))
      .groupBy(finishes.id, finishes.name)
      .having(sql`count(*) > ${input.effectCount}`),
  ]);
  const problems: string[] = [];
  if (tooManyColours.length)
    problems.push(
      `Secondary colours can't go below what these finishes use: ${tooManyColours.map((f) => `${f.name} (${f.n})`).join(", ")}.`,
    );
  if (tooManyEffects.length)
    problems.push(
      `Effects can't go below what these finishes use: ${tooManyEffects.map((f) => `${f.name} (${f.n})`).join(", ")}.`,
    );
  if (problems.length) throw new ActionError(`${problems.join(" ")} Remove those slots first.`);

  await db.update(storeSettings).set(input).where(eq(storeSettings.id, 1));
  changed("settings");
});
