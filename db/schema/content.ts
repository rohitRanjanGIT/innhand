import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { base, sort } from "./_shared";
import { media } from "./catalogue";

export const homeSectionKeys = ["process", "story", "reviews"] as const;
export type HomeSectionKey = (typeof homeSectionKeys)[number];

/**
 * The editable copy and hero asset of a home page section. One row per section (`key`); a missing
 * row means "use the built-in defaults" (lib/home-defaults.ts), so the site works before anything
 * is saved. Which columns a section uses:
 *   process  – eyebrow, heading, heading_emphasis, body, steps, video_key, image_id (video poster)
 *   story    – eyebrow, heading, heading_emphasis, body, cta_label, cta_url, image_id (photo)
 *   reviews  – eyebrow, heading, heading_emphasis, handle (Instagram), cta_url (Instagram profile)
 */
export const homeSections = pgTable("home_sections", {
  key: text("key", { enum: homeSectionKeys }).primaryKey(),
  eyebrow: text("eyebrow").notNull().default(""),
  heading: text("heading").notNull().default(""),
  /** The italic part of the heading. */
  headingEmphasis: text("heading_emphasis").notNull().default(""),
  body: text("body").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default(""),
  ctaUrl: text("cta_url").notNull().default(""),
  handle: text("handle").notNull().default(""),
  /** The section's photo (story) or the video's poster frame (process). */
  imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
  /** R2 object key of an uploaded video, e.g. `videos/<uuid>.mp4`. */
  videoKey: text("video_key"),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** One customer review: a screenshot or photo, plus who said it. */
export const reviews = pgTable("reviews", {
  ...base,
  imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull().default(""),
  /** City or "In their living room": shown after the name. */
  location: text("location").notNull().default(""),
  /** Optional pulled quote shown with (or instead of) the screenshot. */
  quote: text("quote").notNull().default(""),
  /** 1–5, or empty for no stars. */
  rating: integer("rating"),
  /** Colour of the quote mark on text-only cards. */
  accentColour: text("accent_colour").notNull().default("#D7A49A"),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});

/** A tile in the Instagram grid under the reviews. */
export const socialPosts = pgTable("social_posts", {
  ...base,
  imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
  /** Where the tile links to (the post). Empty means it doesn't link. */
  linkUrl: text("link_url").notNull().default(""),
  /** Alt text for the image. */
  caption: text("caption").notNull().default(""),
  sort: sort(),
  active: boolean("active").notNull().default(true),
});
