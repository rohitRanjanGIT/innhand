import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { homeSections, media, reviews, socialPosts, type HomeSectionKey } from "@/db/schema";
import { imageUrl, videoUrl } from "@/lib/images";
import { SECTION_DEFAULTS } from "@/lib/home-defaults";
import { requireAdmin } from "@/lib/session";

// Admin reads for the home page content. Unlike the storefront reads these are never cached and
// include inactive rows.

/** One section: the saved row (or the defaults) plus its image and video ready for the form. */
async function readSection(key: HomeSectionKey) {
  const [row] = await db
    .select({
      eyebrow: homeSections.eyebrow,
      heading: homeSections.heading,
      headingEmphasis: homeSections.headingEmphasis,
      body: homeSections.body,
      ctaLabel: homeSections.ctaLabel,
      ctaUrl: homeSections.ctaUrl,
      handle: homeSections.handle,
      steps: homeSections.steps,
      active: homeSections.active,
      videoKey: homeSections.videoKey,
      imageId: homeSections.imageId,
      imageKey: media.r2Key,
    })
    .from(homeSections)
    .leftJoin(media, eq(media.id, homeSections.imageId))
    .where(eq(homeSections.key, key));
  const copy = row ?? { ...SECTION_DEFAULTS[key], videoKey: null, imageId: null, imageKey: null };
  return {
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    headingEmphasis: copy.headingEmphasis,
    body: copy.body,
    ctaLabel: copy.ctaLabel,
    ctaUrl: copy.ctaUrl,
    handle: copy.handle,
    steps: copy.steps,
    active: copy.active,
    videoKey: copy.videoKey,
    videoUrl: copy.videoKey ? videoUrl(copy.videoKey) : null,
    image: copy.imageId && copy.imageKey ? { id: copy.imageId, url: imageUrl(copy.imageKey, "thumb") } : null,
  };
}
export type AdminSection = Awaited<ReturnType<typeof readSection>>;

/** The process and story sections (the "Home sections" screen). */
export async function getHomeSections() {
  await requireAdmin();
  const [process, story] = await Promise.all([readSection("process"), readSection("story")]);
  return { process, story };
}

/** The reviews screen: its section copy, every review and every Instagram tile (active or not). */
export async function getReviewsAdmin() {
  await requireAdmin();
  const [section, reviewRows, postRows] = await Promise.all([
    readSection("reviews"),
    db
      .select({
        id: reviews.id,
        customerName: reviews.customerName,
        location: reviews.location,
        quote: reviews.quote,
        rating: reviews.rating,
        accentColour: reviews.accentColour,
        active: reviews.active,
        imageId: reviews.imageId,
        imageKey: media.r2Key,
      })
      .from(reviews)
      .leftJoin(media, eq(media.id, reviews.imageId))
      .orderBy(asc(reviews.sort), asc(reviews.createdAt)),
    db
      .select({
        id: socialPosts.id,
        linkUrl: socialPosts.linkUrl,
        caption: socialPosts.caption,
        active: socialPosts.active,
        imageId: socialPosts.imageId,
        imageKey: media.r2Key,
      })
      .from(socialPosts)
      .leftJoin(media, eq(media.id, socialPosts.imageId))
      .orderBy(asc(socialPosts.sort), asc(socialPosts.createdAt)),
  ]);
  return {
    section,
    reviews: reviewRows.map(({ imageKey, ...r }) => ({ ...r, imageUrl: imageKey ? imageUrl(imageKey, "thumb") : null })),
    posts: postRows.map(({ imageKey, ...p }) => ({ ...p, imageUrl: imageKey ? imageUrl(imageKey, "thumb") : null })),
  };
}
export type AdminReview = Awaited<ReturnType<typeof getReviewsAdmin>>["reviews"][number];
export type AdminPost = Awaited<ReturnType<typeof getReviewsAdmin>>["posts"][number];
