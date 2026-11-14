// Zod schemas for the home page content forms (client-side check) and their Server Actions (the real
// check). Plain module: no "use server", no server-only imports.
import { z } from "zod";
import { MAX_STEPS } from "@/lib/home-defaults";
import { VIDEO_KEY_PATTERN } from "@/lib/video-key";

const id = z.uuid();
const text = (max: number, label = "This") => z.string().trim().max(max, `${label} is too long (max ${max} characters).`);
const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #A1B2C3.")
  .transform((s) => s.toUpperCase());

/** Empty, a path on this site, or an https link. */
const link = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === "" || /^\/(?!\/)/.test(s) || /^https:\/\//.test(s), "Use a link starting with / or https://.");
/** Empty or an https link (for places outside the site, like an Instagram post). */
const httpsLink = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === "" || /^https:\/\//.test(s), "Use a full link starting with https://.");

export const processSectionSchema = z.object({
  eyebrow: text(60),
  heading: text(80).min(1, "Heading is required."),
  headingEmphasis: text(80),
  body: text(400),
  steps: z.array(text(30).min(1, "A step can't be empty.")).max(MAX_STEPS, `At most ${MAX_STEPS} steps.`),
  /** R2 key of the uploaded video, from requestVideoUpload. */
  videoKey: z.string().regex(VIDEO_KEY_PATTERN, "That isn't an uploaded video.").nullable(),
  /** The video's cover image. */
  imageId: id.nullable(),
  active: z.boolean(),
});
export type ProcessSectionInput = z.input<typeof processSectionSchema>;

export const storySectionSchema = z.object({
  eyebrow: text(60),
  heading: text(100).min(1, "Heading is required."),
  headingEmphasis: text(100),
  body: text(600),
  ctaLabel: text(40),
  ctaUrl: link,
  imageId: id.nullable(),
  active: z.boolean(),
});
export type StorySectionInput = z.input<typeof storySectionSchema>;

export const reviewsSectionSchema = z.object({
  eyebrow: text(60),
  heading: text(80).min(1, "Heading is required."),
  headingEmphasis: text(80),
  /** Typed with or without the @. */
  handle: z
    .string()
    .trim()
    .transform((s) => s.replace(/^@/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{0,30}$/, "Letters, numbers, dots and underscores only.")),
  profileUrl: httpsLink,
  active: z.boolean(),
});
export type ReviewsSectionInput = z.input<typeof reviewsSectionSchema>;

export const reviewSchema = z
  .object({
    id: id.optional(),
    imageId: id.nullable(),
    customerName: text(80),
    location: text(80),
    quote: text(500),
    rating: z.number().int().min(1).max(5).nullable(),
    accentColour: hex,
    active: z.boolean(),
  })
  .refine((v) => v.imageId || v.quote !== "", {
    path: ["imageId"],
    message: "Add a photo or a quote.",
  });
export type ReviewInput = z.input<typeof reviewSchema>;

export const postSchema = z.object({
  id: id.optional(),
  imageId: id.nullable().refine((v) => v !== null, "Add a photo."),
  linkUrl: httpsLink,
  caption: text(200),
  active: z.boolean(),
});
export type PostInput = z.input<typeof postSchema>;

export const reorderSchema = z.object({ ids: z.array(id).min(1).max(1000) });
export const idSchema = z.object({ id });
