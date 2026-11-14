import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  comboImages,
  homeSections,
  media,
  productFinishImages,
  reviews,
  socialPosts,
  tags,
} from "@/db/schema";
import { deleteImageFiles, r2Configured } from "@/lib/r2";

// Not a Server Action file on purpose: callers (admin actions) have already run requireAdmin().

/**
 * Deletes media rows (and their R2 files) that nothing references any more. Call after removing an
 * image from a product, combo, category or tag.
 */
export async function deleteOrphanMedia(ids: string[]) {
  if (ids.length === 0) return;
  const rows = await db
    .select({ id: media.id, key: media.r2Key })
    .from(media)
    .where(
      sql`${inArray(media.id, ids)}
        and not exists (select 1 from ${productFinishImages} where ${productFinishImages.mediaId} = ${media.id})
        and not exists (select 1 from ${comboImages} where ${comboImages.mediaId} = ${media.id})
        and not exists (select 1 from ${categories} where ${categories.imageId} = ${media.id})
        and not exists (select 1 from ${tags} where ${tags.imageId} = ${media.id})
        and not exists (select 1 from ${homeSections} where ${homeSections.imageId} = ${media.id})
        and not exists (select 1 from ${reviews} where ${reviews.imageId} = ${media.id})
        and not exists (select 1 from ${socialPosts} where ${socialPosts.imageId} = ${media.id})`,
    );
  for (const r of rows) {
    if (!r.key.startsWith("local:") && r2Configured()) await deleteImageFiles(r.key);
    await db.delete(media).where(eq(media.id, r.id));
  }
}
