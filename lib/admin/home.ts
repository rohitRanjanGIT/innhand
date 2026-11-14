"use server";
// Server Actions for the home page content: the three sections (process, story, reviews), the review
// cards and the Instagram tiles. Every action starts with requireAdmin() inside adminAction.
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { homeSections, reviews, socialPosts, type HomeSectionKey } from "@/db/schema";
import { deleteVideoFile, r2Configured } from "@/lib/r2";
import { ActionError, adminAction } from "./action";
import { changed } from "./catalogue-cache";
import { deleteOrphanMedia } from "./media-cleanup";
import {
  idSchema,
  postSchema,
  processSectionSchema,
  reorderSchema,
  reviewSchema,
  reviewsSectionSchema,
  storySectionSchema,
} from "./schemas/home";

type SectionValues = Partial<typeof homeSections.$inferInsert>;

/** Writes one section's row (creating it the first time) and returns what it held before. */
async function upsertSection(key: HomeSectionKey, values: SectionValues) {
  const before = await db.query.homeSections.findFirst({
    where: eq(homeSections.key, key),
    columns: { imageId: true, videoKey: true },
  });
  await db
    .insert(homeSections)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: homeSections.key, set: { ...values, updatedAt: new Date() } });
  return before ?? { imageId: null, videoKey: null };
}

export const saveProcessSection = adminAction(processSectionSchema, async (input) => {
  const before = await upsertSection("process", input);
  if (before.imageId && before.imageId !== input.imageId) await deleteOrphanMedia([before.imageId]);
  // A replaced or removed video is deleted from R2 (best effort: the saved row is already correct).
  if (before.videoKey && before.videoKey !== input.videoKey && r2Configured()) {
    await deleteVideoFile(before.videoKey).catch(() => undefined);
  }
  changed("home");
});

export const saveStorySection = adminAction(storySectionSchema, async (input) => {
  const before = await upsertSection("story", input);
  if (before.imageId && before.imageId !== input.imageId) await deleteOrphanMedia([before.imageId]);
  changed("home");
});

export const saveReviewsSection = adminAction(reviewsSectionSchema, async ({ profileUrl, ...input }) => {
  await upsertSection("reviews", { ...input, ctaUrl: profileUrl });
  changed("home");
});

// ---------- Reviews ----------

export const saveReview = adminAction(reviewSchema, async ({ id, ...values }) => {
  let oldImageId: string | null = null;
  if (id) {
    const current = await db.query.reviews.findFirst({ where: eq(reviews.id, id), columns: { imageId: true } });
    if (!current) throw new ActionError("That review no longer exists.");
    oldImageId = current.imageId;
    await db.update(reviews).set(values).where(eq(reviews.id, id));
  } else {
    const [{ top }] = await db.select({ top: max(reviews.sort) }).from(reviews);
    await db.insert(reviews).values({ ...values, sort: (top ?? -1) + 1 });
  }
  if (oldImageId && oldImageId !== values.imageId) await deleteOrphanMedia([oldImageId]);
  changed("home");
});

export const reorderReviews = adminAction(reorderSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(reviews).set({ sort: i }).where(eq(reviews.id, id));
  });
  changed("home");
});

export const deleteReview = adminAction(idSchema, async ({ id }) => {
  const row = await db.query.reviews.findFirst({ where: eq(reviews.id, id), columns: { imageId: true } });
  if (!row) throw new ActionError("That review no longer exists.");
  await db.delete(reviews).where(eq(reviews.id, id));
  if (row.imageId) await deleteOrphanMedia([row.imageId]);
  changed("home");
});

// ---------- Instagram tiles ----------

export const savePost = adminAction(postSchema, async ({ id, ...values }) => {
  let oldImageId: string | null = null;
  if (id) {
    const current = await db.query.socialPosts.findFirst({ where: eq(socialPosts.id, id), columns: { imageId: true } });
    if (!current) throw new ActionError("That post no longer exists.");
    oldImageId = current.imageId;
    await db.update(socialPosts).set(values).where(eq(socialPosts.id, id));
  } else {
    const [{ top }] = await db.select({ top: max(socialPosts.sort) }).from(socialPosts);
    await db.insert(socialPosts).values({ ...values, sort: (top ?? -1) + 1 });
  }
  if (oldImageId && oldImageId !== values.imageId) await deleteOrphanMedia([oldImageId]);
  changed("home");
});

export const reorderPosts = adminAction(reorderSchema, async ({ ids }) => {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(socialPosts).set({ sort: i }).where(eq(socialPosts.id, id));
  });
  changed("home");
});

export const deletePost = adminAction(idSchema, async ({ id }) => {
  const row = await db.query.socialPosts.findFirst({ where: eq(socialPosts.id, id), columns: { imageId: true } });
  if (!row) throw new ActionError("That post no longer exists.");
  await db.delete(socialPosts).where(eq(socialPosts.id, id));
  if (row.imageId) await deleteOrphanMedia([row.imageId]);
  changed("home");
});
