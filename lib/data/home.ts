import "server-only";
// Storefront reads for the editable home page content: the process, story and reviews sections, the
// review cards and the Instagram tiles. Named columns only. The exported getter is `'use cache'`
// with the `home` tag; admin saves expire it with updateTag (lib/admin/catalogue-cache.ts).
import { cacheLife, cacheTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { homeSections, media, reviews, socialPosts, type HomeSectionKey } from "@/db/schema";
import { TAGS } from "@/lib/cache-tags";
import { SECTION_DEFAULTS, type SectionContent } from "@/lib/home-defaults";
import { videoUrl } from "@/lib/images";

export type HomeSection = SectionContent & {
  /** Image key (see lib/images.ts), or null. Story photo, or the process video's cover. */
  image: string | null;
  /** Playable URL of the uploaded video, or null. */
  video: string | null;
};

export type ReviewCard = {
  id: string;
  /** Image key, or null for a text-only card. */
  image: string | null;
  customerName: string;
  location: string;
  quote: string;
  rating: number | null;
  accentColour: string;
};

export type InstagramTile = { id: string; image: string; link: string; caption: string };

export type HomeContent = {
  process: HomeSection;
  story: HomeSection;
  reviews: HomeSection & { cards: ReviewCard[]; tiles: InstagramTile[] };
};

/** The saved row for a section, or the built-in defaults when it has never been saved. */
export async function loadHomeContent(): Promise<HomeContent> {
  const [sectionRows, reviewRows, tileRows] = await Promise.all([
    db
      .select({
        key: homeSections.key,
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
        image: media.r2Key,
      })
      .from(homeSections)
      .leftJoin(media, eq(media.id, homeSections.imageId)),
    db
      .select({
        id: reviews.id,
        customerName: reviews.customerName,
        location: reviews.location,
        quote: reviews.quote,
        rating: reviews.rating,
        accentColour: reviews.accentColour,
        image: media.r2Key,
      })
      .from(reviews)
      .leftJoin(media, eq(media.id, reviews.imageId))
      .where(eq(reviews.active, true))
      .orderBy(asc(reviews.sort), asc(reviews.createdAt)),
    db
      .select({
        id: socialPosts.id,
        link: socialPosts.linkUrl,
        caption: socialPosts.caption,
        image: media.r2Key,
      })
      .from(socialPosts)
      .innerJoin(media, eq(media.id, socialPosts.imageId))
      .where(eq(socialPosts.active, true))
      .orderBy(asc(socialPosts.sort), asc(socialPosts.createdAt)),
  ]);

  const section = (key: HomeSectionKey): HomeSection => {
    const row = sectionRows.find((r) => r.key === key);
    if (!row) return { ...SECTION_DEFAULTS[key], image: null, video: null };
    return {
      eyebrow: row.eyebrow,
      heading: row.heading,
      headingEmphasis: row.headingEmphasis,
      body: row.body,
      ctaLabel: row.ctaLabel,
      ctaUrl: row.ctaUrl,
      handle: row.handle,
      steps: row.steps,
      active: row.active,
      image: row.image,
      video: row.videoKey ? videoUrl(row.videoKey) : null,
    };
  };

  return {
    process: section("process"),
    story: section("story"),
    reviews: {
      ...section("reviews"),
      // A card needs something to show: a photo or a quote.
      cards: reviewRows.filter((r) => r.image || r.quote),
      tiles: tileRows,
    },
  };
}

export async function getHomeContent() {
  "use cache";
  cacheTag(TAGS.home);
  cacheLife("hours");
  return loadHomeContent();
}
