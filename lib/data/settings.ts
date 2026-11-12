import "server-only";
import { cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";

export const SETTINGS_TAG = "settings";

/** The single settings row, created with defaults the first time it is read. */
export async function getSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  return readSettingsUncached();
}

export async function readSettingsUncached() {
  const row = await db.query.storeSettings.findFirst({ where: eq(storeSettings.id, 1) });
  if (row) return row;
  const [created] = await db.insert(storeSettings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.query.storeSettings.findFirst({ where: eq(storeSettings.id, 1) }))!;
}

export { whatsappUrl } from "@/lib/whatsapp";
